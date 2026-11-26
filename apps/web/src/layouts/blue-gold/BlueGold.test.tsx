// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { LAYOUT_IDS, type DisplayState } from '@menouchat/shared';

import { findLayout } from '../registry.ts';

const zman = (time: string) => ({ instant: 0, time });

const state: DisplayState = {
  displayId: 'main',
  layoutId: 'blue-gold',
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
  const layout = findLayout('blue-gold');
  if (layout === undefined) throw new Error('blue-gold is not registered');
  return render(layout.render({ ...state, layoutOptions }));
}

// jsdom has no FontFaceSet; the layout waits for its font before fitting the daf yomi tile.
beforeAll(() => {
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
});

afterEach(cleanup);

describe('blue-gold layout', () => {
  it('shows the entered times, the computed zmanim and the calendar', () => {
    renderLayout();
    for (const text of ['06:20', '19:10', '08:20', '17:15', '05:01', '16:40', '16:00', '17:52']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    for (const text of ['פרשת וישלח', 'ערכין י׳', 'ימי חול', 'שבת קודש']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByText(/י״ז כסלו תשפ״ז/)).toBeTruthy();
  });

  it('alternates the daf yomi and the amud yomi in the same tile', () => {
    vi.useFakeTimers();
    try {
      renderLayout();
      const daf = screen.getByText('ערכין י׳').parentElement;
      const amud = screen.getByText('סוכה כא:').parentElement;
      expect(daf?.style.opacity).toBe('1');
      expect(amud?.style.opacity).toBe('0');
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(daf?.style.opacity).toBe('0');
      expect(amud?.style.opacity).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows only the daf yomi when there is no amud yomi', () => {
    render(
      findLayout('blue-gold')?.render({
        ...state,
        calendar: { ...state.calendar, amudYomi: null },
      }) ?? <></>,
    );
    expect(screen.getByText('ערכין י׳')).toBeTruthy();
    expect(screen.queryByText('עמוד היומי')).toBeNull();
  });

  it('shows a dash for a zman that does not occur', () => {
    renderLayout();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('accepts empty options, and ignores unknown ones', () => {
    expect(() => renderLayout({ showClock: false })).not.toThrow();
    expect(findLayout('blue-gold')?.optionsSchema.safeParse({}).success).toBe(true);
  });
});

describe('layout registry', () => {
  it('has a layout for every id the admin can choose', () => {
    for (const id of LAYOUT_IDS) {
      expect(findLayout(id)).toBeDefined();
    }
  });
});
