import { z } from 'zod';

import { timeOfDaySchema } from './persisted/common.ts';
import { scheduleSchema } from './persisted/schedule.ts';

export const zmanSchema = z.object({
  /** Milliseconds since the Unix epoch. */
  instant: z.number(),
  /** `HH:MM` in the location's time zone. */
  time: timeOfDaySchema,
});

export type ZmanSnapshot = z.infer<typeof zmanSchema>;

const nullableZman = zmanSchema.nullable();

/**
 * Everything a display renders, computed on the server (plan §4.5). Displays only lay it
 * out and animate the clock and slideshow; they never compute zmanim.
 */
export const displayStateSchema = z.object({
  displayId: z.string(),
  layoutId: z.string(),
  /** Raw options; each layout validates them with its own schema. */
  layoutOptions: z.record(z.string(), z.unknown()),
  locationName: z.string(),
  timeZoneId: z.string(),
  /** The day this snapshot is for, in the location's time zone. */
  date: z.object({ year: z.number().int(), month: z.number().int(), day: z.number().int() }),
  /** When the next local day starts and a new snapshot replaces this one. */
  validUntil: z.number(),
  schedule: scheduleSchema.omit({ schemaVersion: true }),
  dailyZmanim: z.object({
    alosHashachar: nullableZman,
    seaLevelSunrise: nullableZman,
    sofZmanShmaMGA: nullableZman,
    sofZmanShmaGRA: nullableZman,
    chatzos: nullableZman,
    sunset: nullableZman,
    tzais: nullableZman,
  }),
  shabbat: z.object({
    candleLighting: nullableZman,
    motzeiShabbatArvit: nullableZman,
    rabbeinuTam: nullableZman,
  }),
  calendar: z.object({
    hebrewDate: z.string(),
    parasha: z.string(),
    dafYomi: z.string(),
    amudYomi: z.string().nullable(),
  }),
  slideshow: z.object({
    intervalSec: z.number().int().positive(),
    /** Every page of every slide shown on this display, in order. */
    pages: z.array(z.object({ key: z.string(), url: z.string() })),
  }),
});

export type DisplayState = z.infer<typeof displayStateSchema>;

/** URL path under which the server serves `userData/slides/<id>/<file>`. */
export const SLIDES_PATH = '/slides';

export function slidePageUrl(slideId: string, fileName: string): string {
  return `${SLIDES_PATH}/${encodeURIComponent(slideId)}/${encodeURIComponent(fileName)}`;
}
