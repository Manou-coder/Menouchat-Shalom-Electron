// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { DisplayState } from '@menouchat/shared';

import { findLayout } from '../registry.ts';

const zman = (time: string) => ({ instant: 0, time });

const state: DisplayState = {
  displayId: 'main',
  layoutId: 'classic-portrait',
  layoutOptions: {},
  locationName: 'ירושלים',
  timeZoneId: 'Asia/Jerusalem',
  date: { year: 2026, month: 11, day: 27 },
  validUntil: 0,
  schedule: {
    weekday: { shacharit: '06:20', mincha: '17:50', arvit: '20:10' },
    shabbat: { shirHashirim: '19:10', minchaErev: '19:25', shacharit: '08:20', mincha: '18:40' },
  },
  dailyZmanim: {
    alosHashachar: zman('05:01'),
    seaLevelSunrise: zman('06:17'),
    sofZmanShmaMGA: zman('08:16'),
    sofZmanShmaGRA: zman('08:52'),
    chatzos: zman('11:26'),
    sunset: zman('16:40'),
    tzais: null,
  },
  shabbat: {
    candleLighting: zman('16:00'),
    motzeiShabbatArvit: zman('17:15'),
    rabbeinuTam: zman('17:52'),
  },
  calendar: {
    hebrewDate: 'י״ז כסלו תשפ״ז',
    parasha: 'וישלח',
    dafYomi: 'ערכין י׳',
    amudYomi: 'סוכה כא:',
  },
  slideshow: { intervalSec: 10, pages: [] },
};

function renderLayout(layoutOptions: Record<string, unknown> = {}) {
  const layout = findLayout('classic-portrait');
  if (layout === undefined) throw new Error('classic-portrait is not registered');
  return render(layout.render({ ...state, layoutOptions }));
}

afterEach(cleanup);

describe('classic-portrait layout', () => {
  it('shows the entered times, the computed zmanim and the calendar', () => {
    renderLayout();
    for (const text of ['06:20', '19:10', '17:15', '16:40', '16:00', '17:52']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    for (const text of ['וישלח', 'ערכין י׳', 'י״ז כסלו תשפ״ז']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('shows a dash for a zman that does not occur', () => {
    renderLayout();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('applies its options', () => {
    renderLayout({ showDafYomi: false });
    expect(screen.queryByText('ערכין י׳')).toBeNull();
  });

  it('falls back to the default options when the saved ones are invalid', () => {
    renderLayout({ showDafYomi: 'sometimes' });
    expect(screen.getByText('ערכין י׳')).toBeTruthy();
  });

  it('accepts empty options, as every layout must', () => {
    expect(findLayout('classic-portrait')?.optionsSchema.safeParse({}).success).toBe(true);
  });
});
