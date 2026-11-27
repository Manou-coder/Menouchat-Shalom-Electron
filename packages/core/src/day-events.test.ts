import { describe, expect, it } from 'vitest';

import { computeDayEvents } from './day-events.ts';
import type { Location } from './location.ts';

const jerusalem: Location = {
  latitude: 31.7707,
  longitude: 35.1822,
  elevation: 800,
  timeZoneId: 'Asia/Jerusalem',
  inIsrael: true,
};

const on = (year: number, month: number, day: number) =>
  computeDayEvents({ year, month, day }, jerusalem);

describe('computeDayEvents', () => {
  it('names Rosh Chodesh first, then the Chanukah candles of the evening', () => {
    // Hebcal also lists Chag HaBanot that day, which the synagogue does not mark.
    expect(on(2026, 12, 10)).toEqual([
      { kind: 'roshChodesh', text: 'ראש חודש טבת' },
      { kind: 'chanukah', text: 'חנוכה: ז׳ נרות' },
    ]);
  });

  it('announces the month on Shabbat Mevarchim', () => {
    expect(on(2026, 12, 5)).toContainEqual({
      kind: 'roshChodesh',
      text: 'שבת מברכים חודש טבת',
    });
  });

  it('names fasts and holidays', () => {
    expect(on(2026, 12, 20)).toEqual([{ kind: 'holiday', text: 'עשרה בטבת' }]);
    expect(on(2027, 3, 23)).toEqual([{ kind: 'holiday', text: 'פורים' }]);
  });

  it("gives tonight's Omer count, from the second night of Pesach to the eve of Shavuot", () => {
    // 15 Nisan 5787: the first count is said that evening.
    expect(on(2027, 4, 22)).toContainEqual({ kind: 'omer', day: 1, dayText: 'א׳' });
    // 18 Nisan: chol hamoed, and the fourth count tonight.
    expect(on(2027, 4, 25)).toEqual([
      { kind: 'holiday', text: 'פסח ד׳ (חוה״מ)' },
      { kind: 'omer', day: 4, dayText: 'ד׳' },
    ]);
    // 5 Sivan, erev Shavuot: day 49 was counted the night before; nothing tonight.
    expect(on(2027, 6, 10).some((event) => event.kind === 'omer')).toBe(false);
  });

  it('leaves out the minor days the synagogue does not mark', () => {
    // Yom Kippur Katan Kislev, Purim Katan, Rosh Hashana LaBehemot, Leil Selichot.
    for (const [year, month, day] of [
      [2026, 11, 9],
      [2027, 2, 21],
      [2027, 9, 3],
      [2027, 9, 25],
    ] as const) {
      expect(on(year, month, day).filter((event) => event.kind === 'holiday')).toEqual([]);
    }
  });

  it('writes Rosh Hashana without the year in digits', () => {
    expect(on(2026, 9, 12)).toEqual([{ kind: 'holiday', text: 'ראש השנה' }]);
  });

  it('has nothing to say on an ordinary weekday', () => {
    expect(on(2026, 11, 26)).toEqual([]);
  });
});
