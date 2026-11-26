import { HDate } from '@hebcal/core';

/** A calendar date with no time or zone, interpreted in the location's time zone. */
export interface CivilDate {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
}

export class InvalidCivilDateError extends Error {
  override readonly name = 'InvalidCivilDateError';

  constructor(readonly date: CivilDate) {
    super(`Invalid civil date ${String(date.year)}-${String(date.month)}-${String(date.day)}`);
  }
}

export function assertValidCivilDate(date: CivilDate): void {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day));
  if (
    !Number.isInteger(date.year) ||
    utc.getUTCFullYear() !== date.year ||
    utc.getUTCMonth() !== date.month - 1 ||
    utc.getUTCDate() !== date.day
  ) {
    throw new InvalidCivilDateError(date);
  }
}

// Noon keeps the conversion on the same calendar day in every system time zone, since
// @hebcal/core reads the local date components of a JavaScript Date.
const NOON = 12;

export function toHebrewDate(date: CivilDate): HDate {
  assertValidCivilDate(date);
  return new HDate(new Date(date.year, date.month - 1, date.day, NOON));
}

export function fromHebrewDate(hebrewDate: HDate): CivilDate {
  const jsDate = hebrewDate.greg();
  return { year: jsDate.getFullYear(), month: jsDate.getMonth() + 1, day: jsDate.getDate() };
}
