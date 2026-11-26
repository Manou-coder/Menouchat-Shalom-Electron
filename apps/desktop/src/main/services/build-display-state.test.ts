import { describe, expect, it } from 'vitest';

import {
  createDefaultDisplays,
  createDefaultSchedule,
  createDefaultSettings,
  type Slide,
} from '@menouchat/shared';

import {
  buildDisplayState,
  DisplayNotFoundError,
  type DisplayInputs,
} from './build-display-state.ts';

const slide = (id: string, slot: Slide['slot'], enabled: boolean): Slide => ({
  id,
  slot,
  title: id,
  originalFile: null,
  image: 'page-1.jpg',
  enabled,
});

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

function inputs(overrides: Partial<DisplayInputs> = {}): DisplayInputs {
  return {
    settings: createDefaultSettings(),
    schedule: createDefaultSchedule(),
    slides: {
      schemaVersion: 1,
      slides: [slide(C, 4, true), slide(B, 2, false), slide(A, 1, true)],
    },
    displays: createDefaultDisplays(),
    ...overrides,
  };
}

// Friday 27 November 2026, noon in Jerusalem: a day recorded in the v1 reference fixture.
const FRIDAY_NOON = Date.UTC(2026, 10, 27, 10);

describe('buildDisplayState', () => {
  it("computes the location's day with v1's values and the corrected candle lighting", () => {
    const state = buildDisplayState(inputs(), 'main', FRIDAY_NOON);
    expect(state.date).toEqual({ year: 2026, month: 11, day: 27 });
    expect(state.dailyZmanim.sunset?.time).toBe('16:40');
    expect(state.dailyZmanim.tzais?.time).toBe('17:14');
    expect(state.shabbat.candleLighting?.time).toBe('16:00');
    expect(state.shabbat.motzeiShabbatArvit?.time).toBe('17:15');
    expect(state.calendar).toEqual({
      hebrewDate: 'י״ז כסלו תשפ״ז',
      parasha: 'וישלח',
      dafYomi: 'ערכין י׳',
      amudYomi: 'סוכה כב.',
    });
    expect(state.schedule.weekday.shacharit).toBe('06:20');
    expect(state.layoutId).toBe('classic-portrait');
  });

  it("switches day at the location's midnight, not the machine's", () => {
    const state = buildDisplayState(inputs(), 'main', Date.UTC(2026, 10, 26, 22, 30));
    expect(state.date).toEqual({ year: 2026, month: 11, day: 27 });
    expect(new Date(state.validUntil).toISOString()).toBe('2026-11-27T22:00:00.000Z');
  });

  it('shows the enabled slots in slot order, as v1 did', () => {
    const state = buildDisplayState(inputs(), 'main', FRIDAY_NOON);
    expect(state.slideshow).toEqual({
      intervalSec: 10,
      pages: [
        { key: `${A}/page-1.jpg`, url: `/slides/${A}/page-1.jpg` },
        { key: `${C}/page-1.jpg`, url: `/slides/${C}/page-1.jpg` },
      ],
    });
  });

  it('rejects unknown displays', () => {
    expect(() => buildDisplayState(inputs(), 'lobby', FRIDAY_NOON)).toThrow(DisplayNotFoundError);
  });
});
