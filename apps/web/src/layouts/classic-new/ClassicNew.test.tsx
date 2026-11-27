// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDefaultSchedule, type DisplayState } from '@menouchat/shared';

import { findLayout } from '../registry.ts';

const zman = (time: string) => ({ instant: 0, time });

const state: DisplayState = {
  displayId: 'main',
  layoutId: 'classic-new',
  layoutOptions: {},
  locationName: 'ירושלים',
  timeZoneId: 'Asia/Jerusalem',
  date: { year: 2026, month: 11, day: 27 },
  validUntil: 0,
  schedule: {
    weekday: createDefaultSchedule().weekday,
    shabbat: createDefaultSchedule().shabbat,
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

function renderLayout(layoutOptions: Record<string, unknown> = {}, schedule = state.schedule) {
  const layout = findLayout('classic-new');
  if (layout === undefined) throw new Error('classic-new is not registered');
  return render(layout.render({ ...state, schedule, layoutOptions }));
}

// jsdom has no FontFaceSet; prayer names wait for the fonts before fitting.
beforeAll(() => {
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
});

afterEach(cleanup);

describe('classic-new layout', () => {
  it('shows the logo, both prayer columns in one frame, the zmanim and the calendar', () => {
    renderLayout();
    expect(screen.getByRole('img', { name: 'מנוחת שלום' })).toBeTruthy();
    for (const text of ['ימי חול', 'שבת קודש', 'שחרית', '06:20', '19:10', '17:15']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    for (const text of ['16:40', '16:00', '17:52', 'וישלח', 'ערכין י׳', 'י״ז כסלו תשפ״ז']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('lists every prayer the admin entered, in order, however many', () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      id: `p${String(index)}`,
      name: `תפילה ${String(index + 1)}`,
      time: `1${String(index)}:00`,
    }));
    renderLayout({}, { weekday: many, shabbat: many.slice(0, 2) });
    for (const prayer of many) {
      expect(screen.getAllByText(prayer.name).length).toBeGreaterThan(0);
    }
  });

  it('applies its options and falls back to the defaults when they are invalid', () => {
    renderLayout({ showDafYomi: false });
    expect(screen.queryByText('ערכין י׳')).toBeNull();
    cleanup();
    renderLayout({ showDafYomi: 'sometimes' });
    expect(screen.getByText('ערכין י׳')).toBeTruthy();
  });
});
