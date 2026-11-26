import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultSettings } from '@menouchat/shared';

import { createStore } from '../store/store.ts';
import { importV1IfNeeded } from './import-v1.ts';

const FIXTURE = new URL('../../../../../tests/fixtures/v1-userdata/', import.meta.url);
const NOW = () => new Date('2026-11-26T12:00:00Z');

let userData: string;
const logger = { info: vi.fn(), warn: vi.fn() };

beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), 'menouchat-v1-'));
});

afterEach(async () => {
  await rm(userData, { recursive: true, force: true });
});

async function copyFixture(): Promise<void> {
  await cp(FIXTURE, userData, { recursive: true });
}

/** A fingerprint of every v1 file, to prove the import never changes them. */
async function fingerprintV1(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const folder of ['db', 'images']) {
    for (const name of await readdir(join(userData, folder))) {
      const bytes = await readFile(join(userData, folder, name));
      result[`${folder}/${name}`] = createHash('sha256').update(bytes).digest('hex');
    }
  }
  return result;
}

describe('v1 import, on a copy of a real v1 userData', () => {
  it('imports the schedule, the slides and the interval, and leaves v1 untouched', async () => {
    await copyFixture();
    const before = await fingerprintV1();

    const outcome = await importV1IfNeeded(userData, logger, NOW);
    expect(outcome).toEqual({ status: 'imported', slides: 4, notes: [] });

    const store = createStore(join(userData, 'data'), logger);
    await expect(store.schedule.read()).resolves.toEqual({
      schemaVersion: 1,
      weekday: { shacharit: '06:20', mincha: '17:50', arvit: '20:10' },
      shabbat: { shirHashirim: '19:10', minchaErev: '19:25', shacharit: '08:20', mincha: '18:40' },
    });
    await expect(store.settings.read()).resolves.toEqual(createDefaultSettings());

    const { slides } = await store.slides.read();
    expect(
      slides.map(({ slot, title, enabled, originalFile, image }) => ({
        slot,
        title,
        enabled,
        originalFile,
        image,
      })),
    ).toEqual([
      {
        slot: 1,
        title: 'ian-dooley-d1UPkiFd04A-unsplash',
        enabled: true,
        originalFile: null,
        image: 'page-1.jpg',
      },
      { slot: 2, title: 'test-image2', enabled: false, originalFile: null, image: 'page-1.jpg' },
      { slot: 3, title: 'test-image3', enabled: false, originalFile: null, image: 'page-1.jpg' },
      { slot: 4, title: 'test-image4', enabled: false, originalFile: null, image: 'page-1.jpg' },
    ]);
    const [first] = slides;
    expect(await readFile(join(userData, 'slides', first?.id ?? '', first?.image ?? ''))).toEqual(
      await readFile(join(userData, 'images', 'imageAffiche1.jpg')),
    );

    await expect(store.displays.read()).resolves.toMatchObject({
      displays: [{ id: 'main', layoutId: 'classic-portrait', slideIntervalSec: 10 }],
    });

    const log = await readFile(join(userData, 'data', 'migration.log'), 'utf8');
    expect(log).toContain('2026-11-26T12:00:00.000Z Imported Menouchat Chalom v1 data');
    expect(log).toContain('slot 1: "ian-dooley-d1UPkiFd04A-unsplash" shown');

    expect(await fingerprintV1()).toEqual(before);
  });

  it('runs only once', async () => {
    await copyFixture();
    await importV1IfNeeded(userData, logger, NOW);
    const store = createStore(join(userData, 'data'), logger);
    const schedule = await store.schedule.read();
    await store.schedule.write({ ...schedule, weekday: { ...schedule.weekday, arvit: '20:30' } });

    await expect(importV1IfNeeded(userData, logger, NOW)).resolves.toEqual({
      status: 'already-imported',
    });
    await expect(store.schedule.read()).resolves.toMatchObject({ weekday: { arvit: '20:30' } });
  });

  it('redoes an import that was interrupted before the final rename', async () => {
    await copyFixture();
    await mkdir(join(userData, 'data.importing'), { recursive: true });
    await writeFile(join(userData, 'data.importing', 'settings.json'), '{"half":');
    await mkdir(join(userData, 'slides', 'left-over'), { recursive: true });

    await expect(importV1IfNeeded(userData, logger, NOW)).resolves.toMatchObject({
      status: 'imported',
    });
    const entries = await readdir(userData);
    expect(entries).not.toContain('data.importing');
    expect(await readdir(join(userData, 'slides'))).not.toContain('left-over');
    expect(await readdir(join(userData, 'slides'))).toHaveLength(4);
  });

  it('does nothing on a fresh install without v1 data', async () => {
    await expect(importV1IfNeeded(userData, logger, NOW)).resolves.toEqual({
      status: 'no-v1-data',
    });
    expect(await readdir(userData)).toEqual([]);
  });

  it('skips what cannot be used and records why', async () => {
    await copyFixture();
    await writeFile(join(userData, 'db', 'zmanChol.txt'), 'not json');
    await writeFile(join(userData, 'images', 'imageAffiche2.jpg'), 'not a jpeg');
    await rm(join(userData, 'images', 'imageAffiche3.jpg'));

    const outcome = await importV1IfNeeded(userData, logger, NOW);
    expect(outcome).toMatchObject({ status: 'imported', slides: 2 });
    const log = await readFile(join(userData, 'data', 'migration.log'), 'utf8');
    expect(log).toContain('note: zmanChol.txt: not valid JSON');
    expect(log).toContain('note: imageAffiche2.jpg: not a JPEG image, slot skipped');
    expect(log).toContain('note: imageAffiche3.jpg: missing, slot skipped');
    const store = createStore(join(userData, 'data'), logger);
    await expect(store.schedule.read()).resolves.toMatchObject({
      weekday: { shacharit: '06:20', mincha: '17:50', arvit: '20:10' },
    });
  });
});
