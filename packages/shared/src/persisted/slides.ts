import { z } from 'zod';

import { storedFileNameSchema } from './common.ts';

export const SLIDES_SCHEMA_VERSION = 1;

/** Like v1: four fixed slots, shown in slot order (owner's decision, plan §9.2). */
export const SLIDE_SLOTS = [1, 2, 3, 4] as const;

export const slideSlotSchema = z.union(SLIDE_SLOTS.map((slot) => z.literal(slot)));
export type SlideSlot = z.infer<typeof slideSlotSchema>;

export const slideIdSchema = z.uuid();

/**
 * A slide made in the admin's template editor: texts laid over a background picture, on a
 * surface with the slide box's proportions (594 × 280 on screen), in its pixels.
 */
export const SLIDE_DESIGN_SIZE = { width: 1782, height: 840 } as const;

export const SLIDE_FONTS = ['heebo', 'david-libre', 'frank-ruhl-libre', 'secular-one'] as const;
export const slideFontSchema = z.enum(SLIDE_FONTS);
export type SlideFont = z.infer<typeof slideFontSchema>;

export const MAX_SLIDE_TEXTS = 20;
export const MAX_SLIDE_TEXT_LENGTH = 500;

export const slideTextSchema = z.object({
  id: z.string().regex(/^[\w-]{1,40}$/),
  text: z.string().max(MAX_SLIDE_TEXT_LENGTH),
  /** Top-left corner of the text box. */
  x: z
    .number()
    .min(-SLIDE_DESIGN_SIZE.width)
    .max(2 * SLIDE_DESIGN_SIZE.width),
  y: z
    .number()
    .min(-SLIDE_DESIGN_SIZE.height)
    .max(2 * SLIDE_DESIGN_SIZE.height),
  /** Lines wrap at this width. */
  width: z
    .number()
    .min(40)
    .max(SLIDE_DESIGN_SIZE.width * 2),
  fontSize: z.number().min(12).max(400),
  font: slideFontSchema,
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  bold: z.boolean(),
  align: z.enum(['right', 'center', 'left']),
});
export type SlideText = z.infer<typeof slideTextSchema>;

/** What the editor needs to open the slide again; the background is the slide's original. */
export const slideDesignSchema = z.object({
  texts: z.array(slideTextSchema).max(MAX_SLIDE_TEXTS),
});
export type SlideDesign = z.infer<typeof slideDesignSchema>;

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
  /** Only for slides made in the template editor; optional, so version 1 files still read. */
  design: slideDesignSchema.optional(),
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
