import { randomUUID } from 'node:crypto';
import { access, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  createDefaultDisplays,
  createDefaultSettings,
  MAIN_DISPLAY_ID,
  type Slide,
} from '@menouchat/shared';

import { moveIfExists } from '../store/atomic-file.ts';
import type { StoreLogger } from '../store/document-store.ts';
import { createStore } from '../store/store.ts';
import { convertV1Data } from './convert-v1-data.ts';
import { readV1Data } from './read-v1-data.ts';

export const DATA_DIRECTORY = 'data';
export const SLIDES_DIRECTORY = 'slides';
const STAGING_DIRECTORY = 'data.importing';
const MIGRATION_LOG = 'migration.log';
const PAGE_FILE = 'page-1.jpg';
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export type ImportOutcome =
  | { status: 'already-imported' }
  | { status: 'no-v1-data' }
  | { status: 'imported'; slides: number; notes: string[] };

async function isJpeg(path: string): Promise<boolean> {
  const bytes = await readFile(path);
  return JPEG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Imports v1's data on the first launch of v2 (plan §5): when `userData/data/` does not
 * exist yet and v1's `db/` does. v1's files are only read.
 *
 * Everything is written into `data.importing/` first and renamed to `data/` at the very
 * end, so an interrupted import is simply redone on the next launch.
 */
export async function importV1IfNeeded(
  userData: string,
  logger: StoreLogger,
  now: () => Date,
): Promise<ImportOutcome> {
  const dataDirectory = join(userData, DATA_DIRECTORY);
  const stagingDirectory = join(userData, STAGING_DIRECTORY);
  const slidesRoot = join(userData, SLIDES_DIRECTORY);

  if (await exists(dataDirectory)) {
    return { status: 'already-imported' };
  }

  const v1 = await readV1Data(userData);
  if (v1 === null) {
    return { status: 'no-v1-data' };
  }

  await rm(stagingDirectory, { recursive: true, force: true });
  // Without data/, nothing references slides/: anything there is left over from an
  // import that did not finish.
  await rm(slidesRoot, { recursive: true, force: true });

  const conversion = convertV1Data(v1);
  const notes = [...conversion.notes];
  const slides: Slide[] = [];
  for (const imported of conversion.slides) {
    if (!(await isJpeg(imported.sourcePath))) {
      notes.push(`imageAffiche${String(imported.slot)}.jpg: not a JPEG image, slot skipped`);
      continue;
    }
    const id = randomUUID();
    await mkdir(join(slidesRoot, id), { recursive: true });
    await copyFile(imported.sourcePath, join(slidesRoot, id, PAGE_FILE));
    slides.push({
      id,
      title: imported.title,
      // v1 kept only the converted JPEG, never the uploaded original.
      originalFile: null,
      pages: [PAGE_FILE],
      enabled: imported.enabled,
    });
  }

  const store = createStore(stagingDirectory, logger);
  const displays = createDefaultDisplays();
  await store.settings.write(createDefaultSettings());
  await store.schedule.write(conversion.schedule);
  await store.slides.write({ schemaVersion: 1, slides });
  await store.displays.write({
    ...displays,
    displays: displays.displays.map((display) =>
      display.id === MAIN_DISPLAY_ID
        ? { ...display, slideIntervalSec: conversion.slideIntervalSec }
        : display,
    ),
  });

  const report = [
    `${now().toISOString()} Imported Menouchat Chalom v1 data from ${userData}`,
    `schedule: weekday ${Object.values(conversion.schedule.weekday).join(' ')}, shabbat ${Object.values(conversion.schedule.shabbat).join(' ')}`,
    `slide interval: ${String(conversion.slideIntervalSec)} s`,
    ...slides.map(
      (slide, index) =>
        `slide ${String(index + 1)}: "${slide.title}" ${slide.enabled ? 'shown' : 'hidden'} (${slide.id})`,
    ),
    'location: Jerusalem (v1 coordinates)',
    ...notes.map((note) => `note: ${note}`),
    '',
  ].join('\n');
  await writeFile(join(stagingDirectory, MIGRATION_LOG), report);

  if (!(await moveIfExists(stagingDirectory, dataDirectory))) {
    throw new Error(`Import staging folder ${stagingDirectory} disappeared`);
  }
  logger.info(`Imported v1 data: ${String(slides.length)} slides, ${String(notes.length)} notes`);
  return { status: 'imported', slides: slides.length, notes };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
