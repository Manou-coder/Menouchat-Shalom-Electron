import {
  SLIDE_UPLOAD_LIMITS,
  slideDesignSchema,
  TEMPLATE_UPLOAD_FIELDS,
  libraryItemIdSchema,
  type SlideDesign,
} from '@menouchat/shared';

import { AdminError } from './errors.ts';

export interface TemplateUpload {
  /** Present to update a template; absent to create one. */
  id?: string;
  name: string;
  design: SlideDesign;
  background: File;
  /** The JPEG rendered in the browser from the background and the texts. */
  image: File;
}

const BACKGROUND_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function parseDesign(value: ReturnType<FormData['get']>): SlideDesign {
  let json: unknown;
  try {
    json = typeof value === 'string' ? JSON.parse(value) : undefined;
  } catch {
    json = undefined;
  }
  const design = slideDesignSchema.safeParse(json);
  if (!design.success) {
    throw new AdminError('BAD_REQUEST', 'Expected the design as valid JSON');
  }
  return design.data;
}

/** Validates the multipart form of a template save. */
export function parseTemplateUpload(form: FormData): TemplateUpload {
  const rawId = form.get(TEMPLATE_UPLOAD_FIELDS.id);
  const id = rawId === null ? undefined : libraryItemIdSchema.safeParse(rawId);
  const name = form.get(TEMPLATE_UPLOAD_FIELDS.name);
  const background = form.get(TEMPLATE_UPLOAD_FIELDS.background);
  const image = form.get(TEMPLATE_UPLOAD_FIELDS.image);

  if (id !== undefined && !id.success) {
    throw new AdminError('BAD_REQUEST', 'Expected a template id');
  }
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
    throw new AdminError('BAD_REQUEST', 'Expected a name of 1 to 100 characters');
  }
  if (
    !(background instanceof File) ||
    !BACKGROUND_TYPES.has(background.type) ||
    background.size > SLIDE_UPLOAD_LIMITS.originalBytes
  ) {
    throw new AdminError('BAD_REQUEST', 'Expected the background as a PNG, JPEG or WebP image');
  }
  if (
    !(image instanceof File) ||
    image.type !== 'image/jpeg' ||
    image.size > SLIDE_UPLOAD_LIMITS.imageBytes
  ) {
    throw new AdminError('BAD_REQUEST', 'Expected the template as a JPEG image');
  }
  return {
    ...(id === undefined ? {} : { id: id.data }),
    name: name.trim(),
    design: parseDesign(form.get(TEMPLATE_UPLOAD_FIELDS.design)),
    background,
    image,
  };
}
