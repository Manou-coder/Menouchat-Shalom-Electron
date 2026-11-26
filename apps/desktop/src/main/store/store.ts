import {
  createDefaultDisplays,
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
  type Displays,
  type Schedule,
  type Settings,
  type Slides,
} from '@menouchat/shared';

import { createDocumentStore, type DocumentStore, type StoreLogger } from './document-store.ts';

/** The only way the app reads or writes its data (plan §4.7). */
export interface Store {
  settings: DocumentStore<Settings>;
  schedule: DocumentStore<Schedule>;
  slides: DocumentStore<Slides>;
  displays: DocumentStore<Displays>;
}

/** `dataDirectory` is `userData/data`. Every document is at schema version 1: no migrations yet. */
export function createStore(dataDirectory: string, logger: StoreLogger): Store {
  return {
    settings: createDocumentStore(
      dataDirectory,
      {
        fileName: 'settings.json',
        schema: settingsSchema,
        currentVersion: SETTINGS_SCHEMA_VERSION,
        migrations: {},
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
        migrations: {},
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
