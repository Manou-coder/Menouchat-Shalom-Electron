import { z } from 'zod';

import { displaySchema, layoutIdSchema } from './persisted/displays.ts';
import { DAY_EVENT_KINDS, dayEventSettingsSchema } from './persisted/settings.ts';
import { scheduleSchema } from './persisted/schedule.ts';
import { slideSchema, slideSlotSchema } from './persisted/slides.ts';
import { templateIdSchema, templateSchema } from './persisted/templates.ts';

export const scheduleInputSchema = scheduleSchema.omit({ schemaVersion: true });
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const slideIntervalInputSchema = displaySchema.pick({ slideIntervalSec: true });

export const layoutInputSchema = z.object({ layoutId: layoutIdSchema });

/** Switches one kind of day event on or off on the screens. */
export const dayEventToggleInputSchema = z.object({
  kind: z.enum(DAY_EVENT_KINDS),
  enabled: z.boolean(),
});

/** A newer version found on GitHub: downloaded in the background, installed on restart. */
export const updateStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({ status: z.literal('downloading'), version: z.string() }),
  z.object({ status: z.literal('ready'), version: z.string() }),
]);
export type UpdateStatus = z.infer<typeof updateStatusSchema>;

/** The answer to "check for an update now", asked from the admin. */
export const updateCheckResultSchema = z.discriminatedUnion('result', [
  z.object({ result: z.literal('upToDate') }),
  /** Found, or already downloading or ready: `UpdateStatus` follows its download. */
  z.object({ result: z.literal('found'), version: z.string() }),
  /** Only an installed build knows where its updates come from. */
  z.object({ result: z.literal('disabled') }),
  z.object({ result: z.literal('failed') }),
]);
export type UpdateCheckResult = z.infer<typeof updateCheckResultSchema>;

/** Everything the admin shows, pushed again after every change. */
export const adminStateSchema = z.object({
  schedule: scheduleInputSchema,
  slides: z.array(slideSchema),
  /** Every template, newest first. */
  templates: z.array(templateSchema),
  slideIntervalSec: displaySchema.shape.slideIntervalSec,
  /** The main display's layout ("theme" in the admin). */
  layoutId: displaySchema.shape.layoutId,
  /** Full addresses of the admin on this PC's local network, to type on a phone. */
  phoneUrls: z.array(z.string()),
  /** Which kinds of day events the screens announce. */
  events: dayEventSettingsSchema,
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

/** Form field names of a template save (multipart/form-data); `id` only to update one. */
export const TEMPLATE_UPLOAD_FIELDS = {
  id: 'id',
  name: 'name',
  /** JSON of a `SlideDesign`. */
  design: 'design',
  /** PNG, JPEG or WebP. */
  background: 'background',
  /** The JPEG rendered in the browser. */
  image: 'image',
} as const;

export const templateRefInputSchema = z.object({ templateId: templateIdSchema });

export const useTemplateInputSchema = z.object({
  slot: slideSlotSchema,
  templateId: templateIdSchema,
});
