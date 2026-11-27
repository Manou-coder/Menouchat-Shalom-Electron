import { z } from 'zod';

import { strings } from '../strings.ts';
import { timeOfDaySchema } from './common.ts';

export const SCHEDULE_SCHEMA_VERSION = 2;

/** The most prayers a group holds: more would not fit in a frame of the screen. */
export const MAX_PRAYERS_PER_GROUP = 6;
export const MAX_PRAYER_NAME_LENGTH = 30;

/**
 * Made in the browser, which may lack `crypto.randomUUID` (a phone on plain http is not a
 * secure context), so any short token will do: it only tells the rows apart.
 */
export const prayerIdSchema = z.string().regex(/^[\w-]{1,40}$/, 'Expected a short id');

/** One line of the screen: a name typed in the admin and its fixed time. */
export const prayerSchema = z.object({
  id: prayerIdSchema,
  name: z.string().trim().min(1).max(MAX_PRAYER_NAME_LENGTH),
  time: timeOfDaySchema,
});
export type Prayer = z.infer<typeof prayerSchema>;

/** The prayers of a group, in screen order, each id once. */
export const prayerListSchema = z
  .array(prayerSchema)
  .max(MAX_PRAYERS_PER_GROUP)
  .refine((prayers) => new Set(prayers.map((prayer) => prayer.id)).size === prayers.length, {
    error: 'Each prayer id appears once',
  });

/** Prayer times entered in the admin. */
export const scheduleSchema = z.object({
  schemaVersion: z.literal(SCHEDULE_SCHEMA_VERSION),
  weekday: prayerListSchema,
  shabbat: prayerListSchema,
});

export type Schedule = z.infer<typeof scheduleSchema>;

const names = strings.display;

/**
 * The prayers v1 had, which became editable in version 2: their ids, names and the times
 * v1 shipped with. The 1 → 2 migration keeps each stored time.
 */
export const V1_PRAYERS = {
  weekday: [
    { key: 'shacharit', id: 'weekday-shacharit', name: names.weekday.shacharit, time: '06:20' },
    { key: 'mincha', id: 'weekday-mincha', name: names.weekday.mincha, time: '17:50' },
    { key: 'arvit', id: 'weekday-arvit', name: names.weekday.arvit, time: '20:10' },
  ],
  shabbat: [
    {
      key: 'shirHashirim',
      id: 'shabbat-shir-hashirim',
      name: names.shabbat.shirHashirim,
      time: '19:10',
    },
    {
      key: 'minchaErev',
      id: 'shabbat-mincha-erev',
      name: names.shabbat.minchaErev,
      time: '19:25',
    },
    { key: 'shacharit', id: 'shabbat-shacharit', name: names.shabbat.shacharit, time: '08:20' },
    { key: 'mincha', id: 'shabbat-mincha', name: names.shabbat.mincha, time: '18:40' },
  ],
} as const;

/** The prayers v1 shipped with. */
export function createDefaultSchedule(): Schedule {
  const toPrayer = ({ id, name, time }: Prayer) => ({ id, name, time });
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    weekday: V1_PRAYERS.weekday.map(toPrayer),
    shabbat: V1_PRAYERS.shabbat.map(toPrayer),
  };
}
