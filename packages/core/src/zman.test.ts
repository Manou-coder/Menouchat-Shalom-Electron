import { describe, expect, it } from 'vitest';

import { civilDateAt, InvalidTimeZoneError, startOfNextCivilDate } from './zman.ts';

const jerusalem = {
  latitude: 31.77,
  longitude: 35.18,
  elevation: 800,
  timeZoneId: 'Asia/Jerusalem',
  inIsrael: true,
};

describe('civilDateAt', () => {
  it("uses the location's time zone, not the machine's", () => {
    // 22:30 UTC on 26 Nov is already 27 Nov in Jerusalem, still 26 Nov in New York.
    const instant = Date.UTC(2026, 10, 26, 22, 30);
    expect(civilDateAt(instant, 'Asia/Jerusalem')).toEqual({ year: 2026, month: 11, day: 27 });
    expect(civilDateAt(instant, 'America/New_York')).toEqual({ year: 2026, month: 11, day: 26 });
  });

  it('rejects unknown time zones', () => {
    expect(() => civilDateAt(0, 'Mars/Olympus')).toThrow(InvalidTimeZoneError);
  });
});

describe('startOfNextCivilDate', () => {
  it('is local midnight of the following day', () => {
    expect(
      new Date(startOfNextCivilDate({ year: 2026, month: 11, day: 27 }, jerusalem)).toISOString(),
    ).toBe('2026-11-27T22:00:00.000Z');
  });

  it('accounts for the daylight-saving change', () => {
    // Israel moves to summer time on Friday 26 March 2027 at 02:00.
    expect(
      new Date(startOfNextCivilDate({ year: 2027, month: 3, day: 26 }, jerusalem)).toISOString(),
    ).toBe('2027-03-26T21:00:00.000Z');
  });
});
