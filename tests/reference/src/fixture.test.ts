import { readFileSync } from 'node:fs';

import { HDate, Sedra } from '@hebcal/core';
import { describe, expect, it } from 'vitest';

import { captureDays, HEBREW_YEARS } from './build-fixture.ts';
import { referenceFixtureSchema } from './fixture-schema.ts';

const fixture = referenceFixtureSchema.parse(
  JSON.parse(readFileSync(new URL('../../fixtures/v1-reference.json', import.meta.url), 'utf8')),
);

function hebrewDateOf(isoDate: string): HDate {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid date ${isoDate}`);
  }
  return new HDate(new Date(year, month - 1, day));
}

describe('v1 reference fixture', () => {
  it('covers every day of the captured Hebrew years, in order', () => {
    const expected = captureDays(HEBREW_YEARS[0], HEBREW_YEARS[1]).map((day) =>
      [
        String(day.getFullYear()),
        String(day.getMonth() + 1).padStart(2, '0'),
        String(day.getDate()).padStart(2, '0'),
      ].join('-'),
    );
    expect(fixture.days.map((day) => day.date)).toEqual(expected);
  });

  it('spans every Israeli daylight-saving transition of those years', () => {
    const transitions = fixture.days.flatMap((day, index) => {
      const previous = fixture.days[index - 1];
      const offset = day.dailyZmanim.sunset.iso.slice(-6);
      return previous !== undefined && previous.dailyZmanim.sunset.iso.slice(-6) !== offset
        ? [`${day.date} ${offset}`]
        : [];
    });
    expect(transitions).toEqual([
      '2026-10-25 +02:00',
      '2027-03-26 +03:00',
      '2027-10-31 +02:00',
      '2028-03-24 +03:00',
    ]);
  });

  it("shows v1's parasha is already right for the actual year despite the hard-coded 5782", () => {
    const mismatches = fixture.days.filter((day) => {
      const hebrewDate = hebrewDateOf(day.date);
      const words = new Sedra(hebrewDate.getFullYear(), true)
        .getString(hebrewDate, 'he-x-NoNikud')
        .split(' ');
      words.shift();
      return words.toString() !== day.calendar.parasha;
    });
    expect(mismatches).toEqual([]);
  });

  it('records candle lighting from Saturday in v1 and from Friday once corrected', () => {
    for (const day of fixture.days) {
      const v1 = new Date(day.shabbat.candleLighting.iso);
      const corrected = new Date(day.correctedV1Bugs.candleLighting.iso);
      expect(v1.getTime() - corrected.getTime()).toBeGreaterThan(23 * 3_600_000);
      expect(v1.getTime() - corrected.getTime()).toBeLessThan(25 * 3_600_000);
    }
  });
});
