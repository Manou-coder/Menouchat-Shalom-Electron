import {
  createDefaultDayEventSettings,
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
  strings,
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

/** Settings 2 → 3: the screens announce day events, every kind on to begin with. */
export const migrateSettingsFrom2: Migration = (document) => ({
  ...document,
  events: createDefaultDayEventSettings(),
});

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

/**
 * Slides 1 → 2: every picture becomes an item of the library, its files left where they
 * are (`slides/<id>/`), and the slot shows that item.
 */
export const migrateSlidesFrom1: Migration = ({ slides, ...rest }) => {
  const pictures: unknown[] = Array.isArray(slides) ? slides : [];
  const field = (picture: unknown, name: string): unknown =>
    typeof picture === 'object' && picture !== null ? Reflect.get(picture, name) : undefined;
  return {
    ...rest,
    library: pictures.map((picture) => {
      const title = field(picture, 'title');
      return {
        kind: 'file',
        id: field(picture, 'id'),
        // v1 imports could have an empty title; the library needs a name.
        name:
          typeof title === 'string' && title.trim() !== ''
            ? title
            : strings.defaults.importedSlideTitle(Number(field(picture, 'slot'))),
        folder: field(picture, 'id'),
        original: field(picture, 'originalFile') ?? null,
        image: field(picture, 'image'),
      };
    }),
    slots: pictures.map((picture) => ({
      slot: field(picture, 'slot'),
      itemId: field(picture, 'id'),
      enabled: field(picture, 'enabled'),
    })),
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
        migrations: { 1: migrateSettingsFrom1, 2: migrateSettingsFrom2 },
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
        migrations: { 1: migrateSlidesFrom1 },
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
