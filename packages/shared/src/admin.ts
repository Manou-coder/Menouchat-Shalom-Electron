import { z } from 'zod';

import { displaySchema, layoutIdSchema } from './persisted/displays.ts';
import { scheduleSchema } from './persisted/schedule.ts';
import { slideSchema, slideSlotSchema } from './persisted/slides.ts';

export const scheduleInputSchema = scheduleSchema.omit({ schemaVersion: true });
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const slideIntervalInputSchema = displaySchema.pick({ slideIntervalSec: true });

export const layoutInputSchema = z.object({ layoutId: layoutIdSchema });

/** A newer version found on GitHub: downloaded in the background, installed on restart. */
export const updateStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({ status: z.literal('downloading'), version: z.string() }),
  z.object({ status: z.literal('ready'), version: z.string() }),
]);
export type UpdateStatus = z.infer<typeof updateStatusSchema>;

/** Everything the admin shows, pushed again after every change. */
export const adminStateSchema = z.object({
  schedule: scheduleInputSchema,
  slides: z.array(slideSchema),
  slideIntervalSec: displaySchema.shape.slideIntervalSec,
  /** The main display's layout ("theme" in the admin). */
  layoutId: displaySchema.shape.layoutId,
  /** Full addresses of the admin on this PC's local network, to type on a phone. */
  phoneUrls: z.array(z.string()),
  update: updateStatusSchema,
});
export type AdminState = z.infer<typeof adminStateSchema>;

export const slideToggleInputSchema = z.object({ slot: slideSlotSchema, enabled: z.boolean() });

/** Limits of one upload: the original file and its first page converted to JPEG in the browser. */
export const SLIDE_UPLOAD_LIMITS = {
  originalBytes: 50 * 1024 * 1024,
  imageBytes: 10 * 1024 * 1024,
} as const;

/** Form field names of the slide upload (multipart/form-data). */
export const SLIDE_UPLOAD_FIELDS = {
  slot: 'slot',
  title: 'title',
  original: 'original',
  image: 'image',
} as const;
