/// <reference lib="webworker" />
// Converts an uploaded PDF or image into one JPEG per page, off the main thread, so the
// admin stays responsive on a phone while a long PDF renders (plan §2).
// The legacy build carries polyfills: the admin also runs on older phone browsers.
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
// This file already runs off the main thread, so pdf.js parses here instead of starting a
// worker of its own: loading its worker module registers it on `globalThis.pdfjsWorker`.
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

import {
  JPEG_QUALITY,
  MAX_PAGE_SIDE_PX,
  RENDER_DPI,
  type ConversionMessage,
  type ConversionRequest,
} from './conversion-protocol.ts';

declare const self: DedicatedWorkerGlobalScope;

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
  return Math.min(1, MAX_PAGE_SIDE_PX / Math.max(width, height));
}

async function toJpeg(canvas: OffscreenCanvas): Promise<Blob> {
  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}

async function convertPdf(file: File): Promise<Blob[]> {
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    CanvasFactory: OffscreenCanvasFactory,
    isOffscreenCanvasSupported: true,
    // No DOM fonts in a worker: glyphs are drawn as paths instead.
    disableFontFace: true,
    // Running in-thread is intended (see the import above); only real errors are reported.
    verbosity: VerbosityLevel.ERRORS,
  });
  const document = await loadingTask.promise;
  try {
    const pages: Blob[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
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
      pages.push(await toJpeg(canvas));
      page.cleanup();
      post({ type: 'progress', done: number, total: document.numPages });
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

async function convertImage(file: File): Promise<Blob[]> {
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
  post({ type: 'progress', done: 1, total: 1 });
  return [await toJpeg(canvas)];
}

self.addEventListener('message', (event: MessageEvent<ConversionRequest>) => {
  const { file } = event.data;
  const conversion = file.type === 'application/pdf' ? convertPdf(file) : convertImage(file);
  conversion.then(
    (pages) => {
      post({ type: 'done', pages });
    },
    (error: unknown) => {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    },
  );
});
