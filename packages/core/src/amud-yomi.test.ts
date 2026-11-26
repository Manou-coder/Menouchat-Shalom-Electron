import { describe, expect, it } from 'vitest';

import { HDate } from '@hebcal/core';

import { AMUD_YOMI_CYCLE_DAYS, amudYomi } from './amud-yomi.ts';
import { toHebrewDate } from './civil-date.ts';

const on = (year: number, month: number, day: number) =>
  amudYomi(toHebrewDate({ year, month, day }));

describe('amudYomi', () => {
  it('starts with Berachot 2a on Rosh Chodesh Cheshvan 5784, one amud a day', () => {
    expect(on(2023, 10, 15)).toBe('ברכות ב.');
    expect(on(2023, 10, 16)).toBe('ברכות ב:');
    expect(on(2023, 10, 17)).toBe('ברכות ג.');
  });

  it('matches the dates of Dirshu’s siyumim', () => {
    // Siyum on Yoma, Motzei Shabbat 17 October 2026; Sukkah began the next day.
    expect(on(2026, 10, 17)).toBe('יומא פח.');
    expect(on(2026, 10, 18)).toBe('סוכה ב.');
  });

  it('counts every day, Shabbat included', () => {
    expect(on(2026, 11, 26)).toBe('סוכה כא:');
    expect(on(2026, 11, 28)).toBe('סוכה כב:');
  });

  it('ends the Shas with Niddah 73a, then starts again', () => {
    const start = toHebrewDate({ year: 2023, month: 10, day: 15 }).abs();
    expect(amudYomi(new HDate(start + AMUD_YOMI_CYCLE_DAYS - 1))).toBe('נדה עג.');
    expect(amudYomi(new HDate(start + AMUD_YOMI_CYCLE_DAYS))).toBe('ברכות ב.');
  });

  it('has nothing before the program began', () => {
    expect(on(2023, 10, 14)).toBeUndefined();
  });
});
