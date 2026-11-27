import {
  createDefaultDisplays,
  DEFAULT_HTTP_PORT,
  createDefaultSchedule,
  createDefaultSettings,
  createDefaultSlides,
  displaysSchema,
  DISPLAYS_SCHEMA_VERSION,
  scheduleSchema,
  SCHEDULE_SCHEMA_VERSION,
  settingsSchema,
  SETTINGS_SCHEMA_VERSION,
  slidesSchema,
  SLIDES_SCHEMA_VERSION,
  V1_PRAYERS,
  type Displays,
  type Schedule,
  type Settings,
  type Slides,
} from '@menouchat/shared';

import {
  createDocumentStore,
  type DocumentStore,
  type Migration,
  type StoreLogger,
} from './document-store.ts';

/** The only way the app reads or writes its data (plan §4.7). */
export interface Store {
  settings: DocumentStore<Settings>;
  schedule: DocumentStore<Schedule>;
  slides: DocumentStore<Slides>;
  displays: DocumentStore<Displays>;
}

/**
 * Settings 1 → 2 (2.0.0 → 2.0.1): phone access became always on without a PIN, so the
 * switch and the PIN hash go; the port stays.
 */
export const migrateSettingsFrom1: Migration = ({ lan, ...rest }) => {
  const port =
    typeof lan === 'object' && lan !== null && 'port' in lan && typeof lan.port === 'number'
      ? lan.port
      : DEFAULT_HTTP_PORT;
  return { ...rest, lan: { port } };
};

/**
 * Schedule 1 → 2: the fixed prayers became lists the admin can add to, remove from and
 * reorder. Each keeps its stored time under its v1 name, in v1's order.
 */
export const migrateScheduleFrom1: Migration = ({ weekday, shabbat, ...rest }) => {
  const group = (stored: unknown, prayers: (typeof V1_PRAYERS)[keyof typeof V1_PRAYERS]) =>
    prayers.map(({ key, id, name, time }) => {
      const value: unknown =
        typeof stored === 'object' && stored !== null ? Reflect.get(stored, key) : undefined;
      return { id, name, time: typeof value === 'string' ? value : time };
    });
  return {
    ...rest,
    weekday: group(weekday, V1_PRAYERS.weekday),
    shabbat: group(shabbat, V1_PRAYERS.shabbat),
  };
};

/** `dataDirectory` is `userData/data`. */
export function createStore(dataDirectory: string, logger: StoreLogger): Store {
  return {
    settings: createDocumentStore(
      dataDirectory,
      {
        fileName: 'settings.json',
        schema: settingsSchema,
        currentVersion: SETTINGS_SCHEMA_VERSION,
        migrations: { 1: migrateSettingsFrom1 },
        createDefault: createDefaultSettings,
      },
      logger,
    ),
    schedule: createDocumentStore(
      dataDirectory,
      {
        fileName: 'schedule.json',
        schema: scheduleSchema,
        currentVersion: SCHEDULE_SCHEMA_VERSION,
        migrations: { 1: migrateScheduleFrom1 },
        createDefault: createDefaultSchedule,
      },
      logger,
    ),
    slides: createDocumentStore(
      dataDirectory,
      {
        fileName: 'slides.json',
        schema: slidesSchema,
        currentVersion: SLIDES_SCHEMA_VERSION,
        migrations: {},
        createDefault: createDefaultSlides,
      },
      logger,
    ),
    displays: createDocumentStore(
      dataDirectory,
      {
        fileName: 'displays.json',
        schema: displaysSchema,
        currentVersion: DISPLAYS_SCHEMA_VERSION,
        migrations: {},
        createDefault: createDefaultDisplays,
      },
      logger,
    ),
  };
}
