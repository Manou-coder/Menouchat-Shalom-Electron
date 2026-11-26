import { describe, expect, it } from 'vitest';

import { storedFileNameSchema, timeOfDaySchema } from './common.ts';
import { createDefaultDisplays, displaysSchema } from './displays.ts';
import { createDefaultSchedule, scheduleSchema } from './schedule.ts';
import { createDefaultSettings, settingsSchema } from './settings.ts';
import { createDefaultSlides, slidesSchema } from './slides.ts';

const slideId = '0b7f8a59-3a3e-4c55-9d0e-2f61c1f0a6a1';

describe('defaults', () => {
  it.each([
    ['settings', settingsSchema, createDefaultSettings],
    ['schedule', scheduleSchema, createDefaultSchedule],
    ['slides', slidesSchema, createDefaultSlides],
    ['displays', displaysSchema, createDefaultDisplays],
  ] as const)('%s defaults satisfy their schema', (_name, schema, createDefault) => {
    expect(schema.safeParse(createDefault()).success).toBe(true);
  });

  it('returns a fresh object on every call', () => {
    expect(createDefaultSettings()).not.toBe(createDefaultSettings());
  });
});

describe('timeOfDaySchema', () => {
  it.each(['00:00', '06:20', '23:59'])('accepts %s', (value) => {
    expect(timeOfDaySchema.safeParse(value).success).toBe(true);
  });

  it.each(['', '6:20', '24:00', '12:60', '12:30:00'])('rejects %j', (value) => {
    expect(timeOfDaySchema.safeParse(value).success).toBe(false);
  });
});

describe('storedFileNameSchema', () => {
  it.each(['page-1.jpg', 'halaha 10.pdf', 'scan_2026.png'])('accepts %s', (value) => {
    expect(storedFileNameSchema.safeParse(value).success).toBe(true);
  });

  it.each(['', '../settings.json', '..', 'a/b.jpg', 'a\\b.jpg', '.hidden', 'C:evil'])(
    'rejects %j',
    (value) => {
      expect(storedFileNameSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('settingsSchema', () => {
  it('rejects an unknown time zone', () => {
    const settings = createDefaultSettings();
    settings.location.timeZoneId = 'Mars/Olympus';
    expect(settingsSchema.safeParse(settings).success).toBe(false);
  });
});

describe('slidesSchema', () => {
  const slide = {
    id: slideId,
    slot: 1,
    title: 'Halacha',
    originalFile: 'original.pdf',
    image: 'page-1.jpg',
    enabled: true,
  };

  it('accepts one slide per slot', () => {
    const second = { ...slide, id: '0b7f8a59-3a3e-4c55-9d0e-2f61c1f0a6a2', slot: 4 };
    expect(slidesSchema.safeParse({ schemaVersion: 1, slides: [slide, second] }).success).toBe(
      true,
    );
  });

  it('rejects two slides in the same slot', () => {
    const twin = { ...slide, id: '0b7f8a59-3a3e-4c55-9d0e-2f61c1f0a6a2' };
    expect(slidesSchema.safeParse({ schemaVersion: 1, slides: [slide, twin] }).success).toBe(false);
  });

  it.each([0, 5])('rejects slot %i: v1 had four', (slot) => {
    expect(slidesSchema.safeParse({ schemaVersion: 1, slides: [{ ...slide, slot }] }).success).toBe(
      false,
    );
  });
});

describe('displaysSchema', () => {
  it('requires the main display', () => {
    const displays = createDefaultDisplays();
    const [main] = displays.displays;
    expect(
      displaysSchema.safeParse({ ...displays, displays: main ? [{ ...main, id: 'lobby' }] : [] })
        .success,
    ).toBe(false);
  });

  it('rejects an older or newer schema version', () => {
    expect(displaysSchema.safeParse({ ...createDefaultDisplays(), schemaVersion: 2 }).success).toBe(
      false,
    );
  });
});
