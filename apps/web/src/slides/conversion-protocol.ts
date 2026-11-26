/** Messages between the admin page and the slide-conversion worker. */
export interface ConversionRequest {
  file: File;
}

export type ConversionMessage =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; pages: Blob[] }
  | { type: 'error'; message: string };

/** v1 rendered PDFs at 150 dpi; longer sides are capped to keep pages light. */
export const RENDER_DPI = 150;
export const MAX_PAGE_SIDE_PX = 2400;
export const JPEG_QUALITY = 0.9;
