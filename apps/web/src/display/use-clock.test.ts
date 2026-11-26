import { describe, expect, it } from 'vitest';

import { handAngles, readClock } from './use-clock.ts';

const format = (timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

describe('readClock', () => {
  it("reads the location's time, not the machine's (v1 added a fixed 2 hours)", () => {
    const instant = Date.UTC(2026, 6, 1, 9, 5, 30); // summer: Jerusalem is UTC+3
    expect(readClock(format('Asia/Jerusalem'), instant)).toEqual({
      hours: 12,
      minutes: 5,
      seconds: 30,
    });
    expect(readClock(format('America/New_York'), instant)).toEqual({
      hours: 5,
      minutes: 5,
      seconds: 30,
    });
  });
});

describe('handAngles', () => {
  it.each([
    [
      { hours: 0, minutes: 0, seconds: 0 },
      { hour: 0, minute: 0 },
    ],
    [
      { hours: 15, minutes: 0, seconds: 0 },
      { hour: 90, minute: 0 },
    ],
    [
      { hours: 9, minutes: 30, seconds: 0 },
      { hour: 285, minute: 180 },
    ],
    [
      { hours: 23, minutes: 59, seconds: 30 },
      { hour: 359.75, minute: 357 },
    ],
  ])('%o → %o', (reading, angles) => {
    expect(handAngles(reading)).toEqual(angles);
  });
});
