import { describe, expect, it } from 'vitest';

import { InvalidCivilDateError } from './civil-date.ts';
import { computeDay } from './compute-day.ts';
import type { Location } from './location.ts';
import { InvalidTimeZoneError } from './zman.ts';

const newYork: Location = {
  latitude: 40.7128,
  longitude: -74.006,
  elevation: 0,
  timeZoneId: 'America/New_York',
  inIsrael: false,
};

const tromso: Location = {
  latitude: 69.6492,
  longitude: 18.9553,
  elevation: 0,
  timeZoneId: 'Europe/Oslo',
  inIsrael: false,
};

const options = { candleLightingMinutes: 18, motzeiShabbatArvitOffsetMinutes: 0 };

describe('computeDay outside Jerusalem', () => {
  it("formats times in the location's own time zone", () => {
    const day = computeDay({ year: 2026, month: 12, day: 21 }, newYork, options);
    expect(day.dailyZmanim.sunset?.time).toBe('16:31');
    expect(new Date(day.dailyZmanim.sunset?.instant ?? 0).toISOString()).toBe(
      '2026-12-21T21:31:49.426Z',
    );
  });

  it("uses the configured candle-lighting minutes before Friday's sunset", () => {
    const thursday = computeDay({ year: 2026, month: 12, day: 24 }, newYork, options);
    const friday = computeDay({ year: 2026, month: 12, day: 25 }, newYork, options);
    const { sunset } = friday.dailyZmanim;
    expect(thursday.shabbat.date).toEqual({ year: 2026, month: 12, day: 26 });
    expect(thursday.shabbat.candleLighting?.instant).toBe((sunset?.instant ?? 0) - 18 * 60_000);
  });

  it('keeps the same Shabbat on Saturday and moves to the next one on Sunday', () => {
    const saturday = computeDay({ year: 2026, month: 12, day: 26 }, newYork, options);
    const sunday = computeDay({ year: 2026, month: 12, day: 27 }, newYork, options);
    expect(saturday.shabbat.date).toEqual({ year: 2026, month: 12, day: 26 });
    expect(sunday.shabbat.date).toEqual({ year: 2027, month: 1, day: 2 });
  });

  it('follows the diaspora reading schedule outside Israel', () => {
    // 7 Sivan 5787 falls on Shabbat: second day of Shavuot abroad, Naso in Israel.
    const date = { year: 2027, month: 6, day: 12 };
    expect(computeDay(date, newYork, options).calendar.parasha).toBe('שבועות');
    expect(computeDay(date, { ...newYork, inIsrael: true }, options).calendar.parasha).toBe('נשא');
    // The diaspora then reads two portions together to catch up.
    expect(computeDay({ year: 2027, month: 7, day: 17 }, newYork, options).calendar.parasha).toBe(
      'חקת-בלק',
    );
  });

  it('returns null for zmanim that do not occur during the polar night', () => {
    const day = computeDay({ year: 2026, month: 12, day: 21 }, tromso, options);
    expect(day.dailyZmanim.seaLevelSunrise).toBeNull();
    expect(day.dailyZmanim.sunset).toBeNull();
    expect(day.shabbat.candleLighting).toBeNull();
    expect(day.dailyZmanim.alosHashachar).not.toBeNull();
  });
});

describe('computeDay input validation', () => {
  it('rejects dates that do not exist', () => {
    expect(() => computeDay({ year: 2027, month: 2, day: 29 }, newYork, options)).toThrow(
      InvalidCivilDateError,
    );
  });

  it('rejects unknown time zones', () => {
    expect(() =>
      computeDay(
        { year: 2027, month: 1, day: 1 },
        { ...newYork, timeZoneId: 'Mars/Olympus' },
        options,
      ),
    ).toThrow(InvalidTimeZoneError);
  });
});
