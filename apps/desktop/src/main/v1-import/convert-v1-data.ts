import { SCHEDULE_SCHEMA_VERSION, strings, V1_PRAYERS, type Schedule } from '@menouchat/shared';

import { V1_SLOTS, type V1Data, type V1Slot } from './read-v1-data.ts';

/** v1's default; also what an empty `secInterval` meant (plan §5). */
const DEFAULT_INTERVAL_SEC = 10;
const MIN_INTERVAL_SEC = 3;
const MAX_INTERVAL_SEC = 300;

export interface ImportedSlide {
  slot: V1Slot;
  sourcePath: string;
  title: string;
  enabled: boolean;
}

export interface V1Conversion {
  schedule: Schedule;
  slideIntervalSec: number;
  slides: ImportedSlide[];
  /** Every decision worth recording in `migration.log`. */
  notes: string[];
}

/** `"7:05"`, `"07:05"` and `"07:05:00"` all mean 07:05; anything else is unusable. */
function normaliseTime(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (match === null || hours > 23 || minutes > 59) {
    return undefined;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** How a v1 value appears in the migration log. */
function shown(value: unknown): string {
  return value === undefined ? 'missing' : JSON.stringify(value);
}

function slideTitle(name: unknown, slot: V1Slot): string {
  const trimmed = typeof name === 'string' ? name.trim().replace(/\.[^.]+$/, '') : '';
  return (trimmed.length > 0 ? trimmed : strings.defaults.importedSlideTitle(slot)).slice(0, 200);
}

/** Maps v1's data onto v2's documents (plan §5). Pure: file copies are done by the caller. */
export function convertV1Data(v1: V1Data): V1Conversion {
  const notes = [...v1.problems];

  function time(value: unknown, fallback: string, label: string): string {
    const normalised = normaliseTime(value);
    if (normalised === undefined) {
      notes.push(`${label}: ${shown(value)} is not a time, using ${fallback}`);
      return fallback;
    }
    return normalised;
  }

  // v1's field name and value for each prayer, in the order of V1_PRAYERS.
  const v1Times = {
    weekday: [
      ['shacharitChol', v1.weekday?.shacharitChol],
      ['minchaChol', v1.weekday?.minchaChol],
      ['arvitChol', v1.weekday?.arvitChol],
    ],
    shabbat: [
      ['shirAshirim', v1.shabbat?.shirAshirim],
      ['minchaErevShbt', v1.shabbat?.minchaErevShbt],
      ['shaharitShbt', v1.shabbat?.shaharitShbt],
      ['minchaShbt', v1.shabbat?.minchaShbt],
    ],
  } as const;
  const group = (key: 'weekday' | 'shabbat') =>
    V1_PRAYERS[key].map(({ id, name, time: fallback }, index) => {
      const [field, value] = v1Times[key][index] ?? [id, undefined];
      return { id, name, time: time(value, fallback, field) };
    });
  const schedule: Schedule = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    weekday: group('weekday'),
    shabbat: group('shabbat'),
  };

  const rawInterval = v1.checkbox?.secInterval;
  const parsedInterval =
    typeof rawInterval === 'number'
      ? rawInterval
      : typeof rawInterval === 'string'
        ? Number.parseInt(rawInterval, 10)
        : Number.NaN;
  let slideIntervalSec = DEFAULT_INTERVAL_SEC;
  if (Number.isFinite(parsedInterval)) {
    slideIntervalSec = Math.min(
      MAX_INTERVAL_SEC,
      Math.max(MIN_INTERVAL_SEC, Math.round(parsedInterval)),
    );
    if (slideIntervalSec !== parsedInterval) {
      notes.push(
        `secInterval ${String(parsedInterval)} out of range, using ${String(slideIntervalSec)}`,
      );
    }
  } else {
    notes.push(`secInterval ${shown(rawInterval)} unusable, using ${String(DEFAULT_INTERVAL_SEC)}`);
  }

  const slides = V1_SLOTS.flatMap((slot): ImportedSlide[] => {
    const sourcePath = v1.images.get(slot);
    if (sourcePath === undefined) {
      notes.push(`imageAffiche${String(slot)}.jpg: missing, slot skipped`);
      return [];
    }
    return [
      {
        slot,
        sourcePath,
        title: slideTitle(v1.imageNames?.[slot - 1], slot),
        enabled: v1.checkbox?.[`image${String(slot)}`] === true,
      },
    ];
  });

  return { schedule, slideIntervalSec, slides, notes };
}
