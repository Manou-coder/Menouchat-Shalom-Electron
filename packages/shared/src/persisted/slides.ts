import { z } from 'zod';

import { storedFileNameSchema } from './common.ts';

export const SLIDES_SCHEMA_VERSION = 1;

export const slideIdSchema = z.uuid();

export const slideSchema = z.object({
  id: slideIdSchema,
  title: z.string().trim().max(200),
  /** The uploaded PDF or image, kept in `slides/<id>/`; `null` for slides imported from v1. */
  originalFile: storedFileNameSchema.nullable(),
  /** One JPEG per page, in `slides/<id>/`, in display order. */
  pages: z.array(storedFileNameSchema).min(1),
  enabled: z.boolean(),
});

export type Slide = z.infer<typeof slideSchema>;

/** The slide library, in the order the admin lists it. */
export const slidesSchema = z.object({
  schemaVersion: z.literal(SLIDES_SCHEMA_VERSION),
  slides: z
    .array(slideSchema)
    .refine((slides) => new Set(slides.map((slide) => slide.id)).size === slides.length, {
      error: 'Slide ids must be unique',
    }),
});

export type Slides = z.infer<typeof slidesSchema>;

export function createDefaultSlides(): Slides {
  return { schemaVersion: SLIDES_SCHEMA_VERSION, slides: [] };
}
