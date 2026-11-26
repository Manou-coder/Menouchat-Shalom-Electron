import { SLIDE_UPLOAD_FIELDS, SLIDE_UPLOAD_LIMITS } from '@menouchat/shared';

import { AdminError } from './errors.ts';

export interface SlideUpload {
  title: string;
  /** The PDF or image the user picked, kept as is. */
  original: File;
  /** One JPEG per page, rendered in the browser. */
  pages: File[];
}

const ORIGINAL_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

/** Validates the multipart form of a slide upload. */
export function parseSlideUpload(form: FormData): SlideUpload {
  const original = form.get(SLIDE_UPLOAD_FIELDS.original);
  const title = form.get(SLIDE_UPLOAD_FIELDS.title);
  const pages = form.getAll(SLIDE_UPLOAD_FIELDS.pages);

  if (!(original instanceof File) || !ORIGINAL_TYPES.has(original.type)) {
    throw new AdminError('BAD_REQUEST', 'Expected a PDF, PNG, JPEG or WebP file');
  }
  if (original.size > SLIDE_UPLOAD_LIMITS.originalBytes) {
    throw new AdminError('BAD_REQUEST', 'The file is too large');
  }
  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
    throw new AdminError('BAD_REQUEST', 'Expected a title of 1 to 200 characters');
  }
  const pageFiles = pages.filter((page) => page instanceof File);
  if (
    pageFiles.length === 0 ||
    pageFiles.length !== pages.length ||
    pageFiles.length > SLIDE_UPLOAD_LIMITS.pages
  ) {
    throw new AdminError(
      'BAD_REQUEST',
      `Expected 1 to ${String(SLIDE_UPLOAD_LIMITS.pages)} page images`,
    );
  }
  if (
    pageFiles.some(
      (page) => page.type !== 'image/jpeg' || page.size > SLIDE_UPLOAD_LIMITS.pageBytes,
    )
  ) {
    throw new AdminError('BAD_REQUEST', 'Every page must be a JPEG image');
  }
  return { title: title.trim(), original, pages: pageFiles };
}
