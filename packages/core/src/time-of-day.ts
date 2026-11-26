const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes since midnight, in the range [0, 1440). */
export type MinutesOfDay = number;

export class InvalidTimeOfDayError extends Error {
  override readonly name = 'InvalidTimeOfDayError';

  constructor(readonly input: string) {
    super(`Invalid time of day "${input}": expected HH:MM between 00:00 and 23:59`);
  }
}

/** Parses an `"HH:MM"` string, the format of every time entered in the admin. */
export function parseTimeOfDay(text: string): MinutesOfDay {
  const match = TIME_OF_DAY_PATTERN.exec(text);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new InvalidTimeOfDayError(text);
  }
  return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]);
}

/**
 * Formats minutes since midnight as `"HH:MM"`, wrapping around midnight so that
 * offsets such as "Tzais + 1 minute" never produce an out-of-range time.
 */
export function formatTimeOfDay(minutes: MinutesOfDay): string {
  if (!Number.isInteger(minutes)) {
    throw new RangeError(`Minutes must be an integer, received ${String(minutes)}`);
  }
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / MINUTES_PER_HOUR);
  const rest = wrapped % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
