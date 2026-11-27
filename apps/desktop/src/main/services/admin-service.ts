import { randomUUID } from 'node:crypto';

import {
  DEFAULT_LAYOUT_ID,
  MAIN_DISPLAY_ID,
  SCHEDULE_SCHEMA_VERSION,
  strings,
  type AdminState,
  type DayEventKind,
  type LayoutId,
  type ScheduleInput,
  type LibraryItem,
  type SlideSlot,
  type Slides,
  type UpdateStatus,
} from '@menouchat/shared';

import { AdminError } from '../api/errors.ts';
import type { SlideUpload } from '../api/slide-upload.ts';
import type { TemplateUpload } from '../api/template-upload.ts';
import type { Store } from '../store/store.ts';
import type { ChangeHub } from './change-hub.ts';
import {
  copyFolder,
  folderSize,
  libraryFolder,
  removeFolder,
  removeItemFiles,
  saveTemplateFiles,
  saveUploadedFiles,
} from './slide-files.ts';

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
  /** Adds an uploaded file to the library, and shows it in a slot if one is given. */
  uploadFile(upload: SlideUpload): Promise<LibraryItem>;
  /** Shows a library item in a slot; what the slot showed stays in the library. */
  showItem(slot: SlideSlot, itemId: string): Promise<void>;
  setSlideEnabled(slot: SlideSlot, enabled: boolean): Promise<void>;
  setSlideInterval(seconds: number): Promise<void>;
  /** Switches the main display to another layout; its options start from the defaults. */
  setLayout(layoutId: LayoutId): Promise<void>;
  setDayEventEnabled(kind: DayEventKind, enabled: boolean): Promise<void>;
  /** Creates a template, or saves a new version of one; the slots showing it follow. */
  saveTemplate(upload: TemplateUpload): Promise<LibraryItem>;
  duplicateItem(itemId: string): Promise<LibraryItem>;
  renameItem(itemId: string, name: string): Promise<void>;
  /** Deletes an item and its files; refused while a slot shows it. */
  removeItem(itemId: string): Promise<void>;
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
    const library = await Promise.all(
      slides.library.map(async (item) => ({
        ...item,
        sizeBytes: await folderSize(dependencies.slidesRoot, item.folder),
      })),
    );
    const main = displays.displays.find((display) => display.id === MAIN_DISPLAY_ID);
    return {
      schedule: { weekday: schedule.weekday, shabbat: schedule.shabbat },
      slots: slides.slots.toSorted((a, b) => a.slot - b.slot),
      library,
      slideIntervalSec: main?.slideIntervalSec ?? 10,
      layoutId: main?.layoutId ?? DEFAULT_LAYOUT_ID,
      phoneUrls: dependencies.phoneUrls(settings.lan.port),
      events: settings.events,
      update: dependencies.updateStatus(),
    };
  }

  function findItem(document: Slides, itemId: string): LibraryItem {
    const item = document.library.find((candidate) => candidate.id === itemId);
    if (item === undefined) {
      throw new AdminError('NOT_FOUND', `No picture ${itemId} in the library`);
    }
    return item;
  }

  /** Shows `itemId` in `slot`, keeping whether the slot is shown; a new slot is shown. */
  function withItemInSlot(document: Slides, slot: SlideSlot, itemId: string): Slides {
    const previous = document.slots.find((candidate) => candidate.slot === slot);
    return {
      ...document,
      slots: [
        ...document.slots.filter((candidate) => candidate.slot !== slot),
        { slot, itemId, enabled: previous?.enabled ?? true },
      ],
    };
  }

  /** Saves the library with `item` first, or in its place; its files are removed on failure. */
  async function saveItem(document: Slides, item: LibraryItem, slot?: SlideSlot): Promise<void> {
    const exists = document.library.some((other) => other.id === item.id);
    const library = exists
      ? document.library.map((other) => (other.id === item.id ? item : other))
      : [item, ...document.library];
    const updated = { ...document, library };
    try {
      await store.slides.write(
        slot === undefined ? updated : withItemInSlot(updated, slot, item.id),
      );
    } catch (error) {
      await removeFolder(dependencies.slidesRoot, item.folder);
      throw error;
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
      exclusive(() => store.schedule.write({ schemaVersion: SCHEDULE_SCHEMA_VERSION, ...input })),

    uploadFile: (upload) =>
      exclusive(async () => {
        const id = randomUUID();
        const folder = libraryFolder(id);
        const files = await saveUploadedFiles(dependencies.slidesRoot, folder, upload);
        const item: LibraryItem = { kind: 'file', id, name: upload.title, folder, ...files };
        await saveItem(await store.slides.read(), item, upload.slot);
        return item;
      }),

    showItem: (slot, itemId) =>
      exclusive(async () => {
        const document = await store.slides.read();
        findItem(document, itemId);
        await store.slides.write(withItemInSlot(document, slot, itemId));
      }),

    saveTemplate: (upload) =>
      exclusive(async () => {
        const document = await store.slides.read();
        const previous = upload.id === undefined ? undefined : findItem(document, upload.id);
        if (previous !== undefined && previous.kind !== 'template') {
          throw new AdminError('BAD_REQUEST', 'Only a template can be edited');
        }
        const id = previous?.id ?? randomUUID();
        // A new folder per version: the slots showing it get the new picture, never a cached one.
        const folder = libraryFolder(id, randomUUID());
        const files = await saveTemplateFiles(dependencies.slidesRoot, folder, upload);
        const item: LibraryItem = {
          kind: 'template',
          id,
          name: upload.name,
          folder,
          ...files,
          design: upload.design,
        };
        await saveItem(document, item);
        if (previous !== undefined) {
          await removeFolder(dependencies.slidesRoot, previous.folder);
        }
        return item;
      }),

    duplicateItem: (itemId) =>
      exclusive(async () => {
        const document = await store.slides.read();
        const source = findItem(document, itemId);
        const id = randomUUID();
        const folder =
          source.kind === 'template' ? libraryFolder(id, randomUUID()) : libraryFolder(id);
        await copyFolder(dependencies.slidesRoot, source.folder, folder);
        const copy: LibraryItem = {
          ...source,
          id,
          folder,
          name: strings.defaults.copyName(source.name).slice(0, 200),
        };
        await saveItem(document, copy);
        return copy;
      }),

    renameItem: (itemId, name) =>
      exclusive(async () => {
        const document = await store.slides.read();
        const item = findItem(document, itemId);
        await store.slides.write({
          ...document,
          library: document.library.map((other) =>
            other.id === itemId ? { ...item, name } : other,
          ),
        });
      }),

    removeItem: (itemId) =>
      exclusive(async () => {
        const document = await store.slides.read();
        const item = findItem(document, itemId);
        const showing = document.slots.find((slot) => slot.itemId === itemId);
        if (showing !== undefined) {
          throw new AdminError(
            'PRECONDITION_FAILED',
            `Slot ${String(showing.slot)} shows this picture`,
          );
        }
        await store.slides.write({
          ...document,
          library: document.library.filter((other) => other.id !== itemId),
        });
        await removeItemFiles(dependencies.slidesRoot, item);
      }),

    setSlideEnabled: (slot, enabled) =>
      exclusive(async () => {
        const document = await store.slides.read();
        if (!document.slots.some((candidate) => candidate.slot === slot)) {
          throw new AdminError('NOT_FOUND', `Slot ${String(slot)} is empty`);
        }
        await store.slides.write({
          ...document,
          slots: document.slots.map((candidate) =>
            candidate.slot === slot ? { ...candidate, enabled } : candidate,
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

    setDayEventEnabled: (kind, enabled) =>
      exclusive(async () => {
        const settings = await store.settings.read();
        await store.settings.write({
          ...settings,
          events: { ...settings.events, [kind]: enabled },
        });
      }),
  };
}
