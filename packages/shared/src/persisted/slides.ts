import { z } from 'zod';

import { storedFileNameSchema } from './common.ts';

export const SLIDES_SCHEMA_VERSION = 1;

/** Like v1: four fixed slots, shown in slot order (owner's decision, plan §9.2). */
export const SLIDE_SLOTS = [1, 2, 3, 4] as const;

export const slideSlotSchema = z.union(SLIDE_SLOTS.map((slot) => z.literal(slot)));
export type SlideSlot = z.infer<typeof slideSlotSchema>;

export const slideIdSchema = z.uuid();

export const slideSchema = z.object({
  /** New for every upload, so a slot's new picture is never served from a cache. */
  id: slideIdSchema,
  slot: slideSlotSchema,
  /** The name of the file the user picked, shown next to the slot as in v1. */
  title: z.string().trim().max(200),
  /** The uploaded PDF or image, kept in `slides/<id>/`; `null` for slides imported from v1. */
  originalFile: storedFileNameSchema.nullable(),
  /** The JPEG shown on screen (first page of a PDF), in `slides/<id>/`. */
  image: storedFileNameSchema,
  enabled: z.boolean(),
});

export type Slide = z.infer<typeof slideSchema>;

/** The filled slots; an empty slot has no entry. */
export const slidesSchema = z.object({
  schemaVersion: z.literal(SLIDES_SCHEMA_VERSION),
  slides: z
    .array(slideSchema)
    .refine((slides) => new Set(slides.map((slide) => slide.slot)).size === slides.length, {
      error: 'Each slot holds one slide at most',
    }),
});

export type Slides = z.infer<typeof slidesSchema>;

export function createDefaultSlides(): Slides {
  return { schemaVersion: SLIDES_SCHEMA_VERSION, slides: [] };
}
