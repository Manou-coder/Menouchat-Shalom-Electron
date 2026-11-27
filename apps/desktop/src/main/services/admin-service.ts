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
  type Slide,
  type SlideSlot,
  type Template,
  type UpdateStatus,
} from '@menouchat/shared';

import { AdminError } from '../api/errors.ts';
import type { SlideUpload } from '../api/slide-upload.ts';
import type { TemplateUpload } from '../api/template-upload.ts';
import type { Store } from '../store/store.ts';
import type { ChangeHub } from './change-hub.ts';
import { removeSlideFiles, saveSlideFiles } from './slide-files.ts';
import {
  copyTemplateFiles,
  copyTemplateToSlide,
  removeTemplateFiles,
  saveTemplateFiles,
} from './template-files.ts';

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
  setDayEventEnabled(kind: DayEventKind, enabled: boolean): Promise<void>;
  /** Creates a template, or saves a new version of one; the slots showing it follow. */
  saveTemplate(upload: TemplateUpload): Promise<Template>;
  duplicateTemplate(templateId: string): Promise<Template>;
  /** Deletes a template; slots showing it keep their picture. */
  removeTemplate(templateId: string): Promise<void>;
  /** Shows a template in a slot, replacing what was there. */
  useTemplate(slot: SlideSlot, templateId: string): Promise<Slide>;
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
    const [settings, schedule, slides, templates, displays] = await Promise.all([
      store.settings.read(),
      store.schedule.read(),
      store.slides.read(),
      store.templates.read(),
      store.displays.read(),
    ]);
    const main = displays.displays.find((display) => display.id === MAIN_DISPLAY_ID);
    return {
      schedule: { weekday: schedule.weekday, shabbat: schedule.shabbat },
      slides: slides.slides.toSorted((a, b) => a.slot - b.slot),
      templates: templates.templates,
      slideIntervalSec: main?.slideIntervalSec ?? 10,
      layoutId: main?.layoutId ?? DEFAULT_LAYOUT_ID,
      phoneUrls: dependencies.phoneUrls(settings.lan.port),
      events: settings.events,
      update: dependencies.updateStatus(),
    };
  }

  /**
   * Puts a new picture in a slot, replacing what was there (as in v1). `writeFiles` fills
   * `slides/<id>/`; the files of the picture replaced are removed once the new one is saved.
   */
  async function replaceSlot(
    slot: SlideSlot,
    title: string,
    writeFiles: (slideId: string) => Promise<{ originalFile: string; image: string }>,
    templateId?: string,
  ): Promise<Slide> {
    const id = randomUUID();
    const files = await writeFiles(id);
    const document = await store.slides.read();
    const previous = document.slides.find((slide) => slide.slot === slot);
    // A new picture is shown, as ticking the slot was the point of choosing it.
    const slide: Slide = {
      id,
      slot,
      title,
      ...files,
      enabled: previous?.enabled ?? true,
      ...(templateId === undefined ? {} : { templateId }),
    };
    try {
      await store.slides.write({
        ...document,
        slides: [...document.slides.filter((other) => other.slot !== slot), slide],
      });
    } catch (error) {
      await removeSlideFiles(dependencies.slidesRoot, id);
      throw error;
    }
    if (previous !== undefined) {
      await removeSlideFiles(dependencies.slidesRoot, previous.id);
    }
    return slide;
  }

  async function findTemplate(templateId: string): Promise<Template> {
    const { templates } = await store.templates.read();
    const template = templates.find((candidate) => candidate.id === templateId);
    if (template === undefined) {
      throw new AdminError('NOT_FOUND', `No template ${templateId}`);
    }
    return template;
  }

  /** Every slot showing `template` gets its current version, keeping whether it is shown. */
  async function refreshSlotsOf(template: Template): Promise<void> {
    const { slides } = await store.slides.read();
    for (const slide of slides.filter((candidate) => candidate.templateId === template.id)) {
      await replaceSlot(
        slide.slot,
        template.name,
        (slideId) => copyTemplateToSlide(dependencies.slidesRoot, template, slideId),
        template.id,
      );
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

    uploadSlide: (upload) =>
      exclusive(() =>
        replaceSlot(upload.slot, upload.title, (slideId) =>
          saveSlideFiles(dependencies.slidesRoot, slideId, upload),
        ),
      ),

    saveTemplate: (upload) =>
      exclusive(async () => {
        const previous = upload.id === undefined ? undefined : await findTemplate(upload.id);
        const id = previous?.id ?? randomUUID();
        const revision = randomUUID();
        const files = await saveTemplateFiles(dependencies.slidesRoot, id, revision, upload);
        const template: Template = {
          id,
          name: upload.name,
          revision,
          ...files,
          design: upload.design,
        };
        const document = await store.templates.read();
        try {
          await store.templates.write({
            ...document,
            // Newest first; a new version keeps its place.
            templates:
              previous === undefined
                ? [template, ...document.templates]
                : document.templates.map((other) => (other.id === id ? template : other)),
          });
        } catch (error) {
          await removeTemplateFiles(dependencies.slidesRoot, id, revision);
          throw error;
        }
        await refreshSlotsOf(template);
        if (previous !== undefined) {
          await removeTemplateFiles(dependencies.slidesRoot, id, previous.revision);
        }
        return template;
      }),

    duplicateTemplate: (templateId) =>
      exclusive(async () => {
        const source = await findTemplate(templateId);
        const copy: Template = {
          ...source,
          id: randomUUID(),
          revision: randomUUID(),
          name: strings.defaults.templateCopyName(source.name).slice(0, 100),
        };
        await copyTemplateFiles(dependencies.slidesRoot, source, copy.id, copy.revision);
        const document = await store.templates.read();
        await store.templates.write({ ...document, templates: [copy, ...document.templates] });
        return copy;
      }),

    removeTemplate: (templateId) =>
      exclusive(async () => {
        await findTemplate(templateId);
        const document = await store.templates.read();
        await store.templates.write({
          ...document,
          templates: document.templates.filter((template) => template.id !== templateId),
        });
        // The slots keep their copy of the picture, now an ordinary one.
        const slides = await store.slides.read();
        await store.slides.write({
          ...slides,
          slides: slides.slides.map((slide) => {
            if (slide.templateId !== templateId) {
              return slide;
            }
            const picture: Slide = { ...slide };
            delete picture.templateId;
            return picture;
          }),
        });
        await removeTemplateFiles(dependencies.slidesRoot, templateId);
      }),

    useTemplate: (slot, templateId) =>
      exclusive(async () => {
        const template = await findTemplate(templateId);
        return replaceSlot(
          slot,
          template.name,
          (slideId) => copyTemplateToSlide(dependencies.slidesRoot, template, slideId),
          template.id,
        );
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
