import { z } from 'zod';

import { displaySchema } from './persisted/displays.ts';
import { scheduleSchema } from './persisted/schedule.ts';
import { slideSchema, slideSlotSchema } from './persisted/slides.ts';

/** The admin PIN: 4 to 8 digits, typed on a phone keypad. */
export const pinSchema = z.string().regex(/^\d{4,8}$/, 'Expected 4 to 8 digits');

export const scheduleInputSchema = scheduleSchema.omit({ schemaVersion: true });
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const slideIntervalInputSchema = displaySchema.pick({ slideIntervalSec: true });

export const phoneAccessSchema = z.object({
  enabled: z.boolean(),
  pinSet: z.boolean(),
  /** Full addresses of the admin on this PC's local network, to type on a phone. */
  urls: z.array(z.string()),
});
export type PhoneAccess = z.infer<typeof phoneAccessSchema>;

/** Everything the admin shows, pushed again after every change. The PIN hash never leaves. */
export const adminStateSchema = z.object({
  schedule: scheduleInputSchema,
  slides: z.array(slideSchema),
  slideIntervalSec: displaySchema.shape.slideIntervalSec,
  phoneAccess: phoneAccessSchema,
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
