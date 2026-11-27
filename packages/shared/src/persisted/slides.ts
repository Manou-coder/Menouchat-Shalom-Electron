import { z } from 'zod';

import { storedFileNameSchema } from './common.ts';

/** 2: the slots show items of a picture library, which keeps what slots no longer show. */
export const SLIDES_SCHEMA_VERSION = 2;

/** Like v1: four fixed slots, shown in slot order (owner's decision, plan §9.2). */
export const SLIDE_SLOTS = [1, 2, 3, 4] as const;

export const slideSlotSchema = z.union(SLIDE_SLOTS.map((slot) => z.literal(slot)));
export type SlideSlot = z.infer<typeof slideSlotSchema>;

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

export const libraryItemIdSchema = z.uuid();

/**
 * A folder under `userData/slides/`, written as a relative path: `<id>` for pictures from
 * version 1, `library/<id>` or `library/<id>/<revision>` since version 2.
 */
export const libraryFolderSchema = z
  .string()
  .regex(/^[\w-]{1,64}(\/[\w-]{1,64}){0,2}$/, 'Expected a folder under slides/');

const libraryItemBase = {
  id: libraryItemIdSchema,
  name: z.string().trim().min(1).max(200),
  /** A template gets a new folder for every save, so nothing is served from a stale cache. */
  folder: libraryFolderSchema,
  /** The JPEG the screens show. */
  image: storedFileNameSchema,
};

/**
 * Everything ever put on the screens: uploaded files, kept when a slot moves on to another
 * picture, and pictures made in the template editor.
 */
export const libraryItemSchema = z.discriminatedUnion('kind', [
  z.object({
    ...libraryItemBase,
    kind: z.literal('file'),
    /** The PDF or image uploaded, as is; `null` for pictures imported from v1. */
    original: storedFileNameSchema.nullable(),
  }),
  z.object({
    ...libraryItemBase,
    kind: z.literal('template'),
    background: storedFileNameSchema,
    design: slideDesignSchema,
  }),
]);

export type LibraryItem = z.infer<typeof libraryItemSchema>;

/** A filled slot: the library item it shows, and whether the screens show it. */
export const slotSchema = z.object({
  slot: slideSlotSchema,
  itemId: libraryItemIdSchema,
  enabled: z.boolean(),
});

export type Slot = z.infer<typeof slotSchema>;

/** The picture library, newest first, and the filled slots (an empty slot has no entry). */
export const slidesSchema = z
  .object({
    schemaVersion: z.literal(SLIDES_SCHEMA_VERSION),
    library: z.array(libraryItemSchema),
    slots: z
      .array(slotSchema)
      .refine((slots) => new Set(slots.map((slot) => slot.slot)).size === slots.length, {
        error: 'Each slot holds one picture at most',
      }),
  })
  .refine(
    (document) =>
      document.slots.every((slot) => document.library.some((item) => item.id === slot.itemId)),
    { error: 'Every slot shows an item of the library' },
  );

export type Slides = z.infer<typeof slidesSchema>;

export function createDefaultSlides(): Slides {
  return { schemaVersion: SLIDES_SCHEMA_VERSION, library: [], slots: [] };
}
