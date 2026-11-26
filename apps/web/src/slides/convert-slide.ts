import type { ConversionMessage, ConversionRequest } from './conversion-protocol.ts';
import SlideConversionWorker from './slide-conversion.worker.ts?worker';

export const ACCEPTED_SLIDE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export class SlideConversionError extends Error {
  override readonly name = 'SlideConversionError';
}

/** Renders every page of a PDF (or an image) to JPEG in a Web Worker. */
export function convertSlide(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<Blob[]> {
  return new Promise((resolve, reject) => {
    const worker = new SlideConversionWorker();
    worker.addEventListener('message', (event: MessageEvent<ConversionMessage>) => {
      const message = event.data;
      switch (message.type) {
        case 'progress':
          onProgress(message.done, message.total);
          return;
        case 'done':
          worker.terminate();
          resolve(message.pages);
          return;
        case 'error':
          worker.terminate();
          reject(new SlideConversionError(message.message));
          return;
      }
    });
    worker.addEventListener('error', (event) => {
      worker.terminate();
      reject(new SlideConversionError(event.message));
    });
    const request: ConversionRequest = { file };
    worker.postMessage(request);
  });
}
