import { z } from 'zod';

const displayedTimeSchema = z.object({
  /** The raw instant v1 computed, exactly as its libraries returned it. */
  iso: z.string().min(1),
  /** What the v1 display showed: the first five characters of the French locale time. */
  display: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export type DisplayedTime = z.infer<typeof displayedTimeSchema>;

export const dayRecordSchema = z.object({
  /** Israel calendar date of the capture, taken at noon local time. */
  date: z.iso.date(),
  dailyZmanim: z.object({
    alosHashachar: displayedTimeSchema,
    seaLevelSunrise: displayedTimeSchema,
    sofZmanShmaMGA: displayedTimeSchema,
    sofZmanShmaGRA: displayedTimeSchema,
    chatzos: displayedTimeSchema,
    sunset: displayedTimeSchema,
    tzais: displayedTimeSchema,
  }),
  /** Values for the coming Shabbat (today when today is Saturday). */
  shabbat: z.object({
    /** v1 bug: Saturday's sunset − 40 min. See `correctedV1Bugs.candleLighting`. */
    candleLighting: displayedTimeSchema,
    /** Saturday's Tzais + 1 minute. */
    motzeiShabbatArvit: displayedTimeSchema,
    /** Saturday's Tzais at 16.1°. */
    rabbeinuTam: displayedTimeSchema,
  }),
  calendar: z.object({
    /**
     * Despite v1's hard-coded `new Sedra(5782, true)`, the right parasha for these years:
     * hebcal moves on to the following years by itself (checked in fixture.test.ts). v1
     * displayed multi-word names joined with commas; see `correctedV1Bugs.parasha`.
     */
    parasha: z.string().min(1),
    /** v1 bug: English tractate name. See `correctedV1Bugs.dafYomi`. */
    dafYomi: z.string().min(1),
    hebrewDate: z.string().min(1),
  }),
  /** Expected values where v2 fixes a v1 defect (plan §3.4, §6.1), computed by v1's own code path with only the defect corrected. */
  correctedV1Bugs: z.object({
    /** Friday's sunset − 40 min. */
    candleLighting: displayedTimeSchema,
    /** Words separated by spaces, e.g. `חיי שרה` instead of `חיי,שרה`. */
    parasha: z.string().min(1),
    /** Hebrew tractate name and page, e.g. `ערכין י׳` instead of `Arachin  י׳`. */
    dafYomi: z.string().min(1),
  }),
});

export type DayRecord = z.infer<typeof dayRecordSchema>;

export const referenceFixtureSchema = z.object({
  description: z.string(),
  source: z.object({
    v1Commit: z.string(),
    kosherZmanim: z.string(),
    hebcalCore: z.string(),
  }),
  location: z.object({
    timeZoneId: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    elevation: z.number(),
  }),
  hebrewYears: z.array(z.number().int()).min(1),
  days: z.array(dayRecordSchema).min(1),
});

export type ReferenceFixture = z.infer<typeof referenceFixtureSchema>;
