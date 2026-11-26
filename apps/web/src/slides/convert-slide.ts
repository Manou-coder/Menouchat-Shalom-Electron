import type { ConversionMessage, ConversionRequest } from './conversion-protocol.ts';
import SlideConversionWorker from './slide-conversion.worker.ts?worker';

export const ACCEPTED_SLIDE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export class SlideConversionError extends Error {
  override readonly name = 'SlideConversionError';
}

/** Renders the first page of a PDF, or an image, to the JPEG the screen shows, in a Web Worker. */
export function convertSlide(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new SlideConversionWorker();
    worker.addEventListener('message', (event: MessageEvent<ConversionMessage>) => {
      worker.terminate();
      const message = event.data;
      if (message.type === 'done') {
        resolve(message.image);
      } else {
        reject(new SlideConversionError(message.message));
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
