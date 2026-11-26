/// <reference lib="webworker" />
// Converts an uploaded PDF (its first page, as v1 did) or image into the JPEG the screen
// shows, off the main thread so the admin stays responsive on a phone.
// The legacy build carries polyfills: the admin also runs on older phone browsers.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
// pdf.js parses in a worker of its own, nested in this one. Its worker module attaches to
// whatever worker loads it, so it must not be imported into this file directly.
import PdfJsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker';

import {
  JPEG_QUALITY,
  MAX_IMAGE_SIDE_PX,
  RENDER_DPI,
  type ConversionMessage,
  type ConversionRequest,
} from './conversion-protocol.ts';

declare const self: DedicatedWorkerGlobalScope;

GlobalWorkerOptions.workerPort = new PdfJsWorker();

const PDF_POINTS_PER_INCH = 72;

/**
 * pdf.js creates helper canvases through this factory (same contract as its own
 * BaseCanvasFactory); its default one needs `document`, which a worker does not have.
 */
class OffscreenCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
  }

  getNoAlphaContext(canvas: OffscreenCanvas) {
    return canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  }

  reset(target: { canvas: OffscreenCanvas }, width: number, height: number) {
    target.canvas.width = width;
    target.canvas.height = height;
  }

  destroy(target: { canvas: OffscreenCanvas }) {
    target.canvas.width = 0;
    target.canvas.height = 0;
  }
}

function post(message: ConversionMessage): void {
  self.postMessage(message);
}

function fitScale(width: number, height: number): number {
  return Math.min(1, MAX_IMAGE_SIDE_PX / Math.max(width, height));
}

async function toJpeg(canvas: OffscreenCanvas): Promise<Blob> {
  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}

async function convertPdf(file: File): Promise<Blob> {
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    CanvasFactory: OffscreenCanvasFactory,
    isOffscreenCanvasSupported: true,
    // No DOM fonts in a worker: glyphs are drawn as paths instead.
    disableFontFace: true,
  });
  try {
    const document = await loadingTask.promise;
    const page = await document.getPage(1);
    const base = page.getViewport({ scale: RENDER_DPI / PDF_POINTS_PER_INCH });
    const viewport = page.getViewport({
      scale: (RENDER_DPI / PDF_POINTS_PER_INCH) * fitScale(base.width, base.height),
    });
    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({
      // pdf.js renders to an OffscreenCanvas in workers; its types only name the DOM canvas.
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
      // JPEG has no transparency: paint the page white, as a printer would.
      background: '#ffffff',
    }).promise;
    return await toJpeg(canvas);
  } finally {
    await loadingTask.destroy();
  }
}

async function convertImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = fitScale(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas unavailable');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toJpeg(canvas);
}

self.addEventListener('message', (event: MessageEvent<ConversionRequest>) => {
  const { file } = event.data;
  const conversion = file.type === 'application/pdf' ? convertPdf(file) : convertImage(file);
  conversion.then(
    (image) => {
      post({ type: 'done', image });
    },
    (error: unknown) => {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    },
  );
});
