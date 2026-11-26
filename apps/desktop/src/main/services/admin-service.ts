import { randomUUID } from 'node:crypto';

import type {
  AdminState,
  DisplayInput,
  LocationInput,
  ScheduleInput,
  Slide,
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
  hashPin: (pin: string) => Promise<string>;
  verifyPin: (pin: string, hash: string) => Promise<boolean>;
  /** Called after the PIN changes, so every phone signs in again. */
  onPinChanged: () => void;
  /** Applies phone access: listen on the local network or on this PC only. */
  onPhoneAccessChanged: (enabled: boolean) => void;
  /** Where phones can reach the admin, for the current listening port. */
  phoneUrls: (port: number) => string[];
}

export interface AdminService {
  getState(): Promise<AdminState>;
  watch(signal: AbortSignal): AsyncGenerator<AdminState>;
  updateSchedule(input: ScheduleInput): Promise<void>;
  updateLocation(input: LocationInput): Promise<void>;
  updateDisplay(input: DisplayInput): Promise<void>;
  addSlide(upload: SlideUpload): Promise<Slide>;
  setSlideEnabled(slideId: string, enabled: boolean): Promise<void>;
  renameSlide(slideId: string, title: string): Promise<void>;
  reorderSlides(slideIds: readonly string[]): Promise<void>;
  deleteSlide(slideId: string): Promise<void>;
  setPin(pin: string): Promise<void>;
  setPhoneAccess(enabled: boolean): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
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
    return {
      location: {
        location: settings.location,
        candleLightingMinutes: settings.candleLightingMinutes,
        motzashArvitOffsetMinutes: settings.motzashArvitOffsetMinutes,
      },
      schedule: { weekday: schedule.weekday, shabbat: schedule.shabbat },
      slides: slides.slides,
      displays: displays.displays,
      phoneAccess: {
        enabled: settings.lan.enabled,
        pinSet: settings.lan.pinHash !== null,
        port: settings.lan.port,
        urls: settings.lan.enabled ? dependencies.phoneUrls(settings.lan.port) : [],
      },
    };
  }

  async function updateSlides(update: (slides: Slide[]) => Slide[]): Promise<void> {
    const document = await store.slides.read();
    await store.slides.write({ ...document, slides: update(document.slides) });
  }

  function requireSlide(slides: readonly Slide[], slideId: string): void {
    if (!slides.some((slide) => slide.id === slideId)) {
      throw new AdminError('NOT_FOUND', `No slide with id "${slideId}"`);
    }
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
      exclusive(() => store.schedule.write({ schemaVersion: 1, ...input })),

    updateLocation: (input) =>
      exclusive(async () => {
        const settings = await store.settings.read();
        await store.settings.write({ ...settings, ...input });
      }),

    updateDisplay: (input) =>
      exclusive(async () => {
        const document = await store.displays.read();
        if (!document.displays.some((display) => display.id === input.id)) {
          throw new AdminError('NOT_FOUND', `No display with id "${input.id}"`);
        }
        await store.displays.write({
          ...document,
          displays: document.displays.map((display) =>
            display.id === input.id ? { ...display, ...input } : display,
          ),
        });
      }),

    addSlide: (upload) =>
      exclusive(async () => {
        const id = randomUUID();
        const files = await saveSlideFiles(dependencies.slidesRoot, id, upload);
        const slide: Slide = { id, title: upload.title, ...files, enabled: true };
        try {
          await updateSlides((slides) => [...slides, slide]);
        } catch (error) {
          await removeSlideFiles(dependencies.slidesRoot, id);
          throw error;
        }
        return slide;
      }),

    setSlideEnabled: (slideId, enabled) =>
      exclusive(() =>
        updateSlides((slides) => {
          requireSlide(slides, slideId);
          return slides.map((slide) => (slide.id === slideId ? { ...slide, enabled } : slide));
        }),
      ),

    renameSlide: (slideId, title) =>
      exclusive(() =>
        updateSlides((slides) => {
          requireSlide(slides, slideId);
          return slides.map((slide) => (slide.id === slideId ? { ...slide, title } : slide));
        }),
      ),

    reorderSlides: (slideIds) =>
      exclusive(() =>
        updateSlides((slides) => {
          const byId = new Map(slides.map((slide) => [slide.id, slide]));
          if (slideIds.length !== slides.length || new Set(slideIds).size !== slides.length) {
            throw new AdminError('BAD_REQUEST', 'The new order must list every slide once');
          }
          return slideIds.map((id) => {
            const slide = byId.get(id);
            if (slide === undefined) {
              throw new AdminError('BAD_REQUEST', `No slide with id "${id}"`);
            }
            return slide;
          });
        }),
      ),

    deleteSlide: (slideId) =>
      exclusive(async () => {
        await updateSlides((slides) => {
          requireSlide(slides, slideId);
          return slides.filter((slide) => slide.id !== slideId);
        });
        const displays = await store.displays.read();
        if (displays.displays.some((display) => display.slideIds.includes(slideId))) {
          await store.displays.write({
            ...displays,
            displays: displays.displays.map((display) => ({
              ...display,
              slideIds: display.slideIds.filter((id) => id !== slideId),
            })),
          });
        }
        await removeSlideFiles(dependencies.slidesRoot, slideId);
      }),

    setPin: (pin) =>
      exclusive(async () => {
        const settings = await store.settings.read();
        const pinHash = await dependencies.hashPin(pin);
        await store.settings.write({ ...settings, lan: { ...settings.lan, pinHash } });
        dependencies.onPinChanged();
      }),

    setPhoneAccess: (enabled) =>
      exclusive(async () => {
        const settings = await store.settings.read();
        if (enabled && settings.lan.pinHash === null) {
          throw new AdminError('PRECONDITION_FAILED', 'Set a PIN before enabling phone access');
        }
        await store.settings.write({ ...settings, lan: { ...settings.lan, enabled } });
        dependencies.onPhoneAccessChanged(enabled);
      }),

    async verifyPin(pin) {
      const { pinHash } = (await store.settings.read()).lan;
      return pinHash !== null && dependencies.verifyPin(pin, pinHash);
    },
  };
}
