import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultSettings } from '@menouchat/shared';

import {
  createStore,
  migrateScheduleFrom1,
  migrateSettingsFrom1,
  migrateSettingsFrom2,
  migrateSlidesFrom1,
} from './store.ts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menouchat-migrations-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('settings 1 → 2', () => {
  it('drops the phone-access switch and PIN of 2.0.0, keeping the port', () => {
    expect(
      migrateSettingsFrom1({
        schemaVersion: 1,
        candleLightingMinutes: 40,
        lan: { enabled: true, port: 4000, pinHash: 'scrypt$…' },
      }),
    ).toEqual({ schemaVersion: 1, candleLightingMinutes: 40, lan: { port: 4000 } });
  });

  it('reads a settings.json written by 2.0.0 as version 2', async () => {
    await writeFile(
      join(directory, 'settings.json'),
      JSON.stringify({
        ...createDefaultSettings(),
        schemaVersion: 1,
        lan: { enabled: false, port: 3741, pinHash: null },
      }),
    );
    const store = createStore(directory, { info: vi.fn(), warn: vi.fn() });
    await expect(store.settings.read()).resolves.toEqual(createDefaultSettings());
  });
});

describe('settings 2 → 3', () => {
  it('switches every kind of day event on', () => {
    expect(migrateSettingsFrom2({ schemaVersion: 2, lan: { port: 3741 } })).toEqual({
      schemaVersion: 2,
      lan: { port: 3741 },
      events: { roshChodesh: true, holiday: true, chanukah: true, omer: true },
    });
  });
});

describe('schedule 1 → 2', () => {
  const version1 = {
    schemaVersion: 1,
    weekday: { shacharit: '06:45', mincha: '13:30', arvit: '21:00' },
    shabbat: { shirHashirim: '18:00', minchaErev: '18:15', shacharit: '09:00', mincha: '17:00' },
  };

  it('turns the fixed prayers into lists, keeping every time in v1 order', () => {
    expect(migrateScheduleFrom1(version1)).toEqual({
      schemaVersion: 1,
      weekday: [
        { id: 'weekday-shacharit', name: 'שחרית', time: '06:45' },
        { id: 'weekday-mincha', name: 'מנחה', time: '13:30' },
        { id: 'weekday-arvit', name: 'ערבית', time: '21:00' },
      ],
      shabbat: [
        { id: 'shabbat-shir-hashirim', name: 'שיר השירים', time: '18:00' },
        { id: 'shabbat-mincha-erev', name: 'מנחה ע״ש', time: '18:15' },
        { id: 'shabbat-shacharit', name: 'שחרית', time: '09:00' },
        { id: 'shabbat-mincha', name: 'מנחה', time: '17:00' },
      ],
    });
  });

  it('reads a schedule.json written by 2.0.4 as version 2', async () => {
    await writeFile(join(directory, 'schedule.json'), JSON.stringify(version1));
    const store = createStore(directory, { info: vi.fn(), warn: vi.fn() });
    const schedule = await store.schedule.read();
    expect(schedule.schemaVersion).toBe(2);
    expect(schedule.weekday.map((prayer) => prayer.time)).toEqual(['06:45', '13:30', '21:00']);
  });
});

describe('slides 1 → 2', () => {
  const id = '00000000-0000-4000-8000-00000000000a';
  const version1 = {
    schemaVersion: 1,
    slides: [
      {
        id,
        slot: 3,
        title: 'הלכה',
        originalFile: 'original.pdf',
        image: 'page-1.jpg',
        enabled: false,
      },
    ],
  };

  it('puts every picture in the library, where its files already are, and in its slot', () => {
    expect(migrateSlidesFrom1(version1)).toEqual({
      schemaVersion: 1,
      library: [
        {
          kind: 'file',
          id,
          name: 'הלכה',
          folder: id,
          original: 'original.pdf',
          image: 'page-1.jpg',
        },
      ],
      slots: [{ slot: 3, itemId: id, enabled: false }],
    });
  });

  it('reads a slides.json written by 2.0.4 as version 2', async () => {
    await writeFile(join(directory, 'slides.json'), JSON.stringify(version1));
    const store = createStore(directory, { info: vi.fn(), warn: vi.fn() });
    const slides = await store.slides.read();
    expect(slides.schemaVersion).toBe(2);
    expect(slides.slots).toEqual([{ slot: 3, itemId: id, enabled: false }]);
  });
});
