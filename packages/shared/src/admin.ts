import { z } from 'zod';

import { displaySchema } from './persisted/displays.ts';
import { scheduleSchema } from './persisted/schedule.ts';
import { settingsSchema } from './persisted/settings.ts';
import { slideIdSchema, slideSchema } from './persisted/slides.ts';

/** The admin PIN: 4 to 8 digits, typed on a phone keypad. */
export const pinSchema = z.string().regex(/^\d{4,8}$/, 'Expected 4 to 8 digits');

export const scheduleInputSchema = scheduleSchema.omit({ schemaVersion: true });
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const locationInputSchema = settingsSchema.pick({
  location: true,
  candleLightingMinutes: true,
  motzashArvitOffsetMinutes: true,
});
export type LocationInput = z.infer<typeof locationInputSchema>;

export const displayInputSchema = displaySchema.pick({
  id: true,
  layoutId: true,
  layoutOptions: true,
  slideIntervalSec: true,
});
export type DisplayInput = z.infer<typeof displayInputSchema>;

export const phoneAccessSchema = z.object({
  enabled: z.boolean(),
  pinSet: z.boolean(),
  port: z.number().int(),
  /** Addresses of this PC on the local network, to type or scan on a phone. */
  urls: z.array(z.string()),
});
export type PhoneAccess = z.infer<typeof phoneAccessSchema>;

/** Everything the admin shows, pushed again after every change. The PIN hash never leaves. */
export const adminStateSchema = z.object({
  location: locationInputSchema,
  schedule: scheduleInputSchema,
  slides: z.array(slideSchema),
  displays: z.array(displaySchema),
  phoneAccess: phoneAccessSchema,
});
export type AdminState = z.infer<typeof adminStateSchema>;

export const slideToggleInputSchema = z.object({ slideId: slideIdSchema, enabled: z.boolean() });
export const slideRenameInputSchema = z.object({
  slideId: slideIdSchema,
  title: slideSchema.shape.title,
});
export const slideOrderInputSchema = z.object({ slideIds: z.array(slideIdSchema) });
export const slideIdInputSchema = z.object({ slideId: slideIdSchema });

/** Limits of one upload: the original file and its pages converted to JPEG in the browser. */
export const SLIDE_UPLOAD_LIMITS = {
  originalBytes: 50 * 1024 * 1024,
  pageBytes: 10 * 1024 * 1024,
  pages: 60,
} as const;

/** Form field names of the slide upload (multipart/form-data). */
export const SLIDE_UPLOAD_FIELDS = {
  original: 'original',
  pages: 'pages',
  title: 'title',
} as const;
