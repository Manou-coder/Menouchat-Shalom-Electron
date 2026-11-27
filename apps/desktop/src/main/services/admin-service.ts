import { randomUUID } from 'node:crypto';

import {
  DEFAULT_LAYOUT_ID,
  MAIN_DISPLAY_ID,
  SCHEDULE_SCHEMA_VERSION,
  type AdminState,
  type LayoutId,
  type ScheduleInput,
  type Slide,
  type SlideSlot,
  type UpdateStatus,
} from '@menouchat/shared';

import { AdminError } from '../api/errors.ts';
import type { SlideUpload } from '../api/slide-upload.ts';
import type { Store } from '../store/store.ts';
import type { ChangeHub } from './change-hub.ts';
import { removeSlideFiles, saveSlideFiles } from './slide-files.ts';

/** The admin state has no daily rollover; this only bounds how long a stream sleeps. */
const IDLE_REFRESH_MS = 3_600_000;

export interface AdminServiceDependencies {
  store: Store;
  slidesRoot: string;
  changes: ChangeHub;
  /** Full admin addresses on this PC's local network, for the listening port. */
  phoneUrls: (port: number) => string[];
  updateStatus: () => UpdateStatus;
}

export interface AdminService {
  getState(): Promise<AdminState>;
  watch(signal: AbortSignal): AsyncGenerator<AdminState>;
  updateSchedule(input: ScheduleInput): Promise<void>;
  /** Puts a new picture in a slot, replacing what was there (as in v1). */
  uploadSlide(upload: SlideUpload): Promise<Slide>;
  setSlideEnabled(slot: SlideSlot, enabled: boolean): Promise<void>;
  setSlideInterval(seconds: number): Promise<void>;
  /** Switches the main display to another layout; its options start from the defaults. */
  setLayout(layoutId: LayoutId): Promise<void>;
}

export function createAdminService(dependencies: AdminServiceDependencies): AdminService {
  const { store, changes } = dependencies;
  // Every change is a read-modify-write of a document; running them one at a time keeps
  // two quick edits from overwriting each other.
  let queue: Promise<unknown> = Promise.resolve();

  function exclusive<T>(change: () => Promise<T>): Promise<T> {
    const result = queue.then(change);
    queue = result.catch(() => undefined);
    return result.then((value) => {
      changes.notify();
      return value;
    });
  }

  async function getState(): Promise<AdminState> {
    const [settings, schedule, slides, displays] = await Promise.all([
      store.settings.read(),
      store.schedule.read(),
      store.slides.read(),
      store.displays.read(),
    ]);
    const main = displays.displays.find((display) => display.id === MAIN_DISPLAY_ID);
    return {
      schedule: { weekday: schedule.weekday, shabbat: schedule.shabbat },
      slides: slides.slides.toSorted((a, b) => a.slot - b.slot),
      slideIntervalSec: main?.slideIntervalSec ?? 10,
      layoutId: main?.layoutId ?? DEFAULT_LAYOUT_ID,
      phoneUrls: dependencies.phoneUrls(settings.lan.port),
      update: dependencies.updateStatus(),
    };
  }

  return {
    getState,

    async *watch(signal) {
      while (!signal.aborted) {
        yield await getState();
        await changes.wait(IDLE_REFRESH_MS, signal);
      }
    },

    updateSchedule: (input) =>
      exclusive(() => store.schedule.write({ schemaVersion: SCHEDULE_SCHEMA_VERSION, ...input })),

    uploadSlide: (upload) =>
      exclusive(async () => {
        const id = randomUUID();
        const files = await saveSlideFiles(dependencies.slidesRoot, id, upload);
        const document = await store.slides.read();
        const previous = document.slides.find((slide) => slide.slot === upload.slot);
        // A new picture is shown, as ticking the slot was the point of choosing it.
        const slide: Slide = {
          id,
          slot: upload.slot,
          title: upload.title,
          ...files,
          enabled: previous?.enabled ?? true,
        };
        try {
          await store.slides.write({
            ...document,
            slides: [...document.slides.filter((other) => other.slot !== upload.slot), slide],
          });
        } catch (error) {
          await removeSlideFiles(dependencies.slidesRoot, id);
          throw error;
        }
        if (previous !== undefined) {
          await removeSlideFiles(dependencies.slidesRoot, previous.id);
        }
        return slide;
      }),

    setSlideEnabled: (slot, enabled) =>
      exclusive(async () => {
        const document = await store.slides.read();
        if (!document.slides.some((slide) => slide.slot === slot)) {
          throw new AdminError('NOT_FOUND', `Slot ${String(slot)} is empty`);
        }
        await store.slides.write({
          ...document,
          slides: document.slides.map((slide) =>
            slide.slot === slot ? { ...slide, enabled } : slide,
          ),
        });
      }),

    setSlideInterval: (seconds) =>
      exclusive(async () => {
        const document = await store.displays.read();
        await store.displays.write({
          ...document,
          displays: document.displays.map((display) =>
            display.id === MAIN_DISPLAY_ID ? { ...display, slideIntervalSec: seconds } : display,
          ),
        });
      }),

    setLayout: (layoutId) =>
      exclusive(async () => {
        const document = await store.displays.read();
        await store.displays.write({
          ...document,
          displays: document.displays.map((display) =>
            display.id === MAIN_DISPLAY_ID ? { ...display, layoutId, layoutOptions: {} } : display,
          ),
        });
      }),
  };
}
