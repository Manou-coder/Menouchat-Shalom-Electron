import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultSettings } from '@menouchat/shared';

import { createStore, migrateSettingsFrom1 } from './store.ts';

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
