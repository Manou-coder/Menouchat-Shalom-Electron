/** Messages between the admin page and the slide-conversion worker. */
export interface ConversionRequest {
  file: File;
}

export type ConversionMessage = { type: 'done'; image: Blob } | { type: 'error'; message: string };

/** v1 rendered PDFs at 150 dpi; longer sides are capped to keep images light. */
export const RENDER_DPI = 150;
export const MAX_IMAGE_SIDE_PX = 2400;
export const JPEG_QUALITY = 0.9;
