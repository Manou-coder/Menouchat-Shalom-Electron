import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultSchedule, createDefaultSettings } from '@menouchat/shared';

import { createStore } from './store.ts';

let dataDirectory: string;

beforeEach(async () => {
  dataDirectory = join(await mkdtemp(join(tmpdir(), 'menouchat-userdata-')), 'data');
});

afterEach(async () => {
  await rm(join(dataDirectory, '..'), { recursive: true, force: true });
});

describe('store', () => {
  it('serves the defaults until something is saved', async () => {
    const store = createStore(dataDirectory, { info: vi.fn(), warn: vi.fn() });
    await expect(store.settings.read()).resolves.toEqual(createDefaultSettings());
    await expect(store.displays.read()).resolves.toMatchObject({
      displays: [{ id: 'main', layoutId: 'classic-portrait' }],
    });
  });

  it('keeps each document in its own file', async () => {
    const store = createStore(dataDirectory, { info: vi.fn(), warn: vi.fn() });
    const schedule = createDefaultSchedule();
    schedule.weekday.push({ id: 'weekday-late', name: 'ערבית ב׳', time: '22:00' });
    await store.schedule.write(schedule);
    await store.slides.write({ schemaVersion: 1, slides: [] });
    await expect(store.schedule.read()).resolves.toEqual(schedule);
    expect((await readdir(dataDirectory)).sort()).toEqual(['schedule.json', 'slides.json']);
  });
});
