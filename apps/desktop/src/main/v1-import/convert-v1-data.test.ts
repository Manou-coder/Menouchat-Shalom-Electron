import { describe, expect, it } from 'vitest';

import { createDefaultSchedule, type Prayer } from '@menouchat/shared';

import { convertV1Data } from './convert-v1-data.ts';
import type { V1Data, V1Slot } from './read-v1-data.ts';

function v1(overrides: Partial<V1Data> = {}): V1Data {
  return {
    weekday: { shacharitChol: '06:20', minchaChol: '17:50', arvitChol: '20:10' },
    shabbat: {
      shirAshirim: '19:10',
      minchaErevShbt: '19:25',
      shaharitShbt: '08:20',
      minchaShbt: '18:40',
    },
    checkbox: { image1: true, image2: false, image3: true, image4: false, secInterval: '12' },
    imageNames: ['halacha.pdf', 'shabbat.jpg', '', 'notice.pdf'],
    images: new Map<V1Slot, string>([
      [1, '/v1/images/imageAffiche1.jpg'],
      [2, '/v1/images/imageAffiche2.jpg'],
      [3, '/v1/images/imageAffiche3.jpg'],
    ]),
    problems: [],
    ...overrides,
  };
}

const times = (prayers: readonly Prayer[]) => prayers.map((prayer) => prayer.time);

describe('convertV1Data', () => {
  it('maps the times, the interval and the slides as plan §5 says', () => {
    const result = convertV1Data(v1());
    expect(result.schedule).toEqual(createDefaultSchedule());
    expect(result.slideIntervalSec).toBe(12);
    expect(result.slides).toEqual([
      { slot: 1, sourcePath: '/v1/images/imageAffiche1.jpg', title: 'halacha', enabled: true },
      { slot: 2, sourcePath: '/v1/images/imageAffiche2.jpg', title: 'shabbat', enabled: false },
      { slot: 3, sourcePath: '/v1/images/imageAffiche3.jpg', title: 'שקופית 3', enabled: true },
    ]);
    expect(result.notes).toEqual(['imageAffiche4.jpg: missing, slot skipped']);
  });

  it('accepts the time formats v1 may have stored', () => {
    const result = convertV1Data(
      v1({ weekday: { shacharitChol: '6:05', minchaChol: '17:50:00', arvitChol: ' 20:10 ' } }),
    );
    expect(times(result.schedule.weekday)).toEqual(['06:05', '17:50', '20:10']);
  });

  it('keeps the defaults for unusable times and says so', () => {
    const result = convertV1Data(
      v1({
        weekday: { shacharitChol: '', minchaChol: '25:00', arvitChol: 2010 },
        shabbat: undefined,
      }),
    );
    expect(times(result.schedule.weekday)).toEqual(['06:20', '17:50', '20:10']);
    expect(result.schedule.shabbat[0]).toEqual({
      id: 'shabbat-shir-hashirim',
      name: 'שיר השירים',
      time: '19:10',
    });
    expect(result.notes.filter((note) => note.includes('is not a time'))).toHaveLength(7);
  });

  it.each([
    ['', 10],
    [undefined, 10],
    ['abc', 10],
    ['1', 3],
    ['999', 300],
    [15, 15],
  ])('turns secInterval %j into %i seconds', (secInterval, expected) => {
    const result = convertV1Data(
      v1({ checkbox: { image1: true, image2: false, image3: false, image4: false, secInterval } }),
    );
    expect(result.slideIntervalSec).toBe(expected);
  });

  it('hides every slide when checkbox.txt is unreadable, and keeps the reason', () => {
    const result = convertV1Data(
      v1({ checkbox: undefined, problems: ['checkbox.txt: not valid JSON'] }),
    );
    expect(result.slides.every((slide) => !slide.enabled)).toBe(true);
    expect(result.notes).toContain('checkbox.txt: not valid JSON');
  });
});
