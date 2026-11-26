import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

/** v1 wrote these JSON documents with a `.txt` extension in `userData/db/` (plan §3.3). */
const v1ScheduleWeekdaySchema = z.looseObject({
  shacharitChol: z.unknown(),
  minchaChol: z.unknown(),
  arvitChol: z.unknown(),
});
const v1ScheduleShabbatSchema = z.looseObject({
  shirAshirim: z.unknown(),
  minchaErevShbt: z.unknown(),
  shaharitShbt: z.unknown(),
  minchaShbt: z.unknown(),
});
const v1CheckboxSchema = z.looseObject({
  image1: z.unknown(),
  image2: z.unknown(),
  image3: z.unknown(),
  image4: z.unknown(),
  secInterval: z.unknown(),
});
const v1ImagesDisplaySchema = z.looseObject({ imageDisplay: z.array(z.unknown()) });

export type V1Weekday = z.infer<typeof v1ScheduleWeekdaySchema>;
export type V1Shabbat = z.infer<typeof v1ScheduleShabbatSchema>;
export type V1Checkbox = z.infer<typeof v1CheckboxSchema>;

/** The four v1 slide slots, `images/imageAffiche{1..4}.jpg`. */
export const V1_SLOTS = [1, 2, 3, 4] as const;
export type V1Slot = (typeof V1_SLOTS)[number];

export interface V1Data {
  weekday: V1Weekday | undefined;
  shabbat: V1Shabbat | undefined;
  checkbox: V1Checkbox | undefined;
  /** Original file names shown next to each slot, index 0 for slot 1. */
  imageNames: readonly unknown[] | undefined;
  /** Path of each slot's image when the file exists. */
  images: ReadonlyMap<V1Slot, string>;
  /** What could not be read, for the migration log. */
  problems: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readDocument<T>(
  directory: string,
  fileName: string,
  schema: z.ZodType<T>,
  problems: string[],
): Promise<T | undefined> {
  const path = join(directory, fileName);
  if (!(await exists(path))) {
    problems.push(`${fileName}: missing`);
    return undefined;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(await readFile(path, 'utf8')));
    if (parsed.success) {
      return parsed.data;
    }
    problems.push(`${fileName}: unexpected content`);
  } catch {
    problems.push(`${fileName}: not valid JSON`);
  }
  return undefined;
}

/**
 * Reads whatever v1 left in `userData`, never writing to it. `null` when there is no v1
 * data at all (a fresh install). Unreadable parts are reported, not thrown.
 */
export async function readV1Data(userData: string): Promise<V1Data | null> {
  const db = join(userData, 'db');
  if (!(await exists(db))) {
    return null;
  }
  const problems: string[] = [];
  const images = new Map<V1Slot, string>();
  for (const slot of V1_SLOTS) {
    const path = join(userData, 'images', `imageAffiche${String(slot)}.jpg`);
    if (await exists(path)) {
      images.set(slot, path);
    }
  }
  return {
    weekday: await readDocument(db, 'zmanChol.txt', v1ScheduleWeekdaySchema, problems),
    shabbat: await readDocument(db, 'zmanShbt.txt', v1ScheduleShabbatSchema, problems),
    checkbox: await readDocument(db, 'checkbox.txt', v1CheckboxSchema, problems),
    imageNames: (await readDocument(db, 'images-display.txt', v1ImagesDisplaySchema, problems))
      ?.imageDisplay,
    images,
    problems,
  };
}
