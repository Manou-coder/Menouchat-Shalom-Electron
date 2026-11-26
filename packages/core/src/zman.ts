import { DateTime } from 'luxon';

import { assertValidCivilDate, type CivilDate } from './civil-date.ts';
import type { Location } from './location.ts';

/** A computed time: the exact instant and the `HH:MM` shown on the display. */
export interface Zman {
  /** Milliseconds since the Unix epoch. */
  instant: number;
  /** Hours and minutes in the location's time zone, truncated (not rounded) as in v1. */
  time: string;
}

export class InvalidTimeZoneError extends Error {
  override readonly name = 'InvalidTimeZoneError';

  constructor(readonly timeZoneId: string) {
    super(`Unknown time zone "${timeZoneId}"`);
  }
}

/** Midnight starting `date` in the location's zone, the day kosher-zmanim computes for. */
export function startOfCivilDate(date: CivilDate, location: Location): DateTime {
  assertValidCivilDate(date);
  const start = DateTime.fromObject({ ...date, zone: location.timeZoneId });
  if (!start.isValid) {
    throw new InvalidTimeZoneError(location.timeZoneId);
  }
  return start;
}

/** The civil date at `instant` in `timeZoneId`: what "today" means for the display. */
export function civilDateAt(instant: number, timeZoneId: string): CivilDate {
  const local = DateTime.fromMillis(instant, { zone: timeZoneId });
  if (!local.isValid) {
    throw new InvalidTimeZoneError(timeZoneId);
  }
  return { year: local.year, month: local.month, day: local.day };
}

/** The instant the day after `date` starts in the location's zone, when the display must refresh. */
export function startOfNextCivilDate(date: CivilDate, location: Location): number {
  return startOfCivilDate(date, location).plus({ days: 1 }).toMillis();
}

export function toZman(time: DateTime | null, location: Location, offsetMinutes = 0): Zman | null {
  if (time === null) {
    return null;
  }
  const shifted = time.plus({ minutes: offsetMinutes }).setZone(location.timeZoneId);
  return { instant: shifted.toMillis(), time: shifted.toFormat('HH:mm') };
}
