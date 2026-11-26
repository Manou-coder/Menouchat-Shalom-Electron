import { z } from 'zod';

import { timeOfDaySchema } from './common.ts';

export const SCHEDULE_SCHEMA_VERSION = 1;

/** Prayer times entered in the admin. */
export const scheduleSchema = z.object({
  schemaVersion: z.literal(SCHEDULE_SCHEMA_VERSION),
  weekday: z.object({
    shacharit: timeOfDaySchema,
    mincha: timeOfDaySchema,
    arvit: timeOfDaySchema,
  }),
  shabbat: z.object({
    shirHashirim: timeOfDaySchema,
    minchaErev: timeOfDaySchema,
    shacharit: timeOfDaySchema,
    mincha: timeOfDaySchema,
  }),
});

export type Schedule = z.infer<typeof scheduleSchema>;

/** The times v1 shipped with. */
export function createDefaultSchedule(): Schedule {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    weekday: { shacharit: '06:20', mincha: '17:50', arvit: '20:10' },
    shabbat: { shirHashirim: '19:10', minchaErev: '19:25', shacharit: '08:20', mincha: '18:40' },
  };
}
