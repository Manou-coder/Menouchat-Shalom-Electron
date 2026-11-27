import {
  SLIDE_UPLOAD_FIELDS,
  SLIDE_UPLOAD_LIMITS,
  slideDesignSchema,
  slideSlotSchema,
  type SlideDesign,
  type SlideSlot,
} from '@menouchat/shared';

import { AdminError } from './errors.ts';

export interface SlideUpload {
  slot: SlideSlot;
  /** Name of the file the user picked, shown next to the slot. */
  title: string;
  /** The PDF or image the user picked, kept as is. */
  original: File;
  /** What the screen shows: the first page, rendered to JPEG in the browser. */
  image: File;
  /** For a slide made in the template editor, whose original is its background. */
  design?: SlideDesign;
}

const DESIGN_BACKGROUND_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function parseDesign(value: ReturnType<FormData['get']>): SlideDesign | undefined {
  if (value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new AdminError('BAD_REQUEST', 'Expected the design as JSON text');
  }
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    throw new AdminError('BAD_REQUEST', 'Expected the design as JSON text');
  }
  const design = slideDesignSchema.safeParse(json);
  if (!design.success) {
    throw new AdminError('BAD_REQUEST', 'Invalid slide design');
  }
  return design.data;
}

const ORIGINAL_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

/** Validates the multipart form of a slide upload. */
export function parseSlideUpload(form: FormData): SlideUpload {
  const slot = slideSlotSchema.safeParse(Number(form.get(SLIDE_UPLOAD_FIELDS.slot)));
  const title = form.get(SLIDE_UPLOAD_FIELDS.title);
  const original = form.get(SLIDE_UPLOAD_FIELDS.original);
  const image = form.get(SLIDE_UPLOAD_FIELDS.image);

  if (!slot.success) {
    throw new AdminError('BAD_REQUEST', 'Expected a slot from 1 to 4');
  }
  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
    throw new AdminError('BAD_REQUEST', 'Expected a title of 1 to 200 characters');
  }
  if (
    !(original instanceof File) ||
    !ORIGINAL_TYPES.has(original.type) ||
    original.size > SLIDE_UPLOAD_LIMITS.originalBytes
  ) {
    throw new AdminError('BAD_REQUEST', 'Expected a PDF, PNG, JPEG or WebP file');
  }
  if (
    !(image instanceof File) ||
    image.type !== 'image/jpeg' ||
    image.size > SLIDE_UPLOAD_LIMITS.imageBytes
  ) {
    throw new AdminError('BAD_REQUEST', 'Expected the slide as a JPEG image');
  }
  const design = parseDesign(form.get(SLIDE_UPLOAD_FIELDS.design));
  if (design !== undefined && !DESIGN_BACKGROUND_TYPES.has(original.type)) {
    throw new AdminError('BAD_REQUEST', 'Expected the background as a PNG, JPEG or WebP image');
  }
  return {
    slot: slot.data,
    title: title.trim(),
    original,
    image,
    ...(design === undefined ? {} : { design }),
  };
}
