// The web app imports `AppRouter` from this folder for its types, so nothing here may
// depend on Node or Electron; services are injected instead.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import {
  adminStateSchema,
  dayEventToggleInputSchema,
  displayStateSchema,
  healthSchema,
  layoutInputSchema,
  scheduleInputSchema,
  slideIntervalInputSchema,
  slideToggleInputSchema,
  libraryItemRefInputSchema,
  renameLibraryItemInputSchema,
  showLibraryItemInputSchema,
  updateCheckResultSchema,
  type AdminState,
  type DayEventKind,
  type DisplayState,
  type LayoutId,
  type ScheduleInput,
  type LibraryItem,
  type SlideSlot,
  type UpdateCheckResult,
} from '@menouchat/shared';

import { parseSlideUpload, type SlideUpload } from './slide-upload.ts';
import { parseTemplateUpload, type TemplateUpload } from './template-upload.ts';
import { publicProcedure, router } from './trpc.ts';

export interface DisplayStateApi {
  get(displayId: string): Promise<DisplayState | undefined>;
  watch(displayId: string, signal: AbortSignal): AsyncIterable<DisplayState>;
}

export interface AdminApi {
  getState(): Promise<AdminState>;
  watch(signal: AbortSignal): AsyncIterable<AdminState>;
  updateSchedule(input: ScheduleInput): Promise<void>;
  uploadFile(upload: SlideUpload): Promise<LibraryItem>;
  showItem(slot: SlideSlot, itemId: string): Promise<void>;
  setSlideEnabled(slot: SlideSlot, enabled: boolean): Promise<void>;
  setSlideInterval(seconds: number): Promise<void>;
  setLayout(layoutId: LayoutId): Promise<void>;
  setDayEventEnabled(kind: DayEventKind, enabled: boolean): Promise<void>;
  saveTemplate(upload: TemplateUpload): Promise<LibraryItem>;
  duplicateItem(itemId: string): Promise<LibraryItem>;
  renameItem(itemId: string, name: string): Promise<void>;
  removeItem(itemId: string): Promise<void>;
}

/** What only the app's own windows may ask of the desktop app. */
export interface DesktopApi {
  showAdmin(): void;
  /** Restarts into a downloaded update. */
  installUpdate(): void;
  checkForUpdate(): Promise<UpdateCheckResult>;
}

export interface AppRouterDependencies {
  version: string;
  displayStates: DisplayStateApi;
  admin: AdminApi;
  desktop: DesktopApi;
}

const displayIdInput = z.object({ displayId: z.string().min(1).max(50) });

export function createAppRouter({ version, displayStates, admin, desktop }: AppRouterDependencies) {
  /**
   * Anyone who can reach the server may edit: the app's windows, and phones on the
   * synagogue's Wi-Fi, without a PIN (owner's decision, plan §9.2).
   */
  const adminProcedure = publicProcedure;

  /** The app's own windows only: these act on the PC itself. */
  const localProcedure = publicProcedure.use(({ ctx, next }) => {
    if (ctx.client !== 'local') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only on the synagogue PC' });
    }
    return next();
  });

  async function requireDisplayState(displayId: string): Promise<DisplayState> {
    const state = await displayStates.get(displayId);
    if (state === undefined) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `No display with id "${displayId}"` });
    }
    return state;
  }

  return router({
    health: publicProcedure
      .output(healthSchema)
      .query(({ ctx }) => ({ status: 'ok' as const, version, client: ctx.client })),

    display: router({
      state: publicProcedure
        .input(displayIdInput)
        .output(displayStateSchema)
        .query(({ input }) => requireDisplayState(input.displayId)),

      /** Pushed over server-sent events: no polling, no reloads (plan §4.3). */
      onState: publicProcedure.input(displayIdInput).subscription(async function* ({
        input,
        signal,
      }) {
        await requireDisplayState(input.displayId);
        yield* displayStates.watch(input.displayId, signal ?? new AbortController().signal);
      }),
    }),

    desktop: router({
      showAdmin: localProcedure.mutation(() => {
        desktop.showAdmin();
      }),
    }),

    admin: router({
      installUpdate: adminProcedure.mutation(() => {
        desktop.installUpdate();
      }),

      checkForUpdate: adminProcedure
        .output(updateCheckResultSchema)
        .mutation(() => desktop.checkForUpdate()),

      state: adminProcedure.output(adminStateSchema).query(() => admin.getState()),

      onState: adminProcedure.subscription(async function* ({ signal }) {
        yield* admin.watch(signal ?? new AbortController().signal);
      }),

      updateSchedule: adminProcedure
        .input(scheduleInputSchema)
        .mutation(({ input }) => admin.updateSchedule(input)),

      setDayEventEnabled: adminProcedure
        .input(dayEventToggleInputSchema)
        .mutation(({ input }) => admin.setDayEventEnabled(input.kind, input.enabled)),

      setLayout: adminProcedure
        .input(layoutInputSchema)
        .mutation(({ input }) => admin.setLayout(input.layoutId)),

      slides: router({
        /** A file to the library, shown in a slot when the form names one. */
        upload: adminProcedure
          .input(z.instanceof(FormData))
          .mutation(({ input }) => admin.uploadFile(parseSlideUpload(input))),
        show: adminProcedure
          .input(showLibraryItemInputSchema)
          .mutation(({ input }) => admin.showItem(input.slot, input.itemId)),
        setEnabled: adminProcedure
          .input(slideToggleInputSchema)
          .mutation(({ input }) => admin.setSlideEnabled(input.slot, input.enabled)),
        setInterval: adminProcedure
          .input(slideIntervalInputSchema)
          .mutation(({ input }) => admin.setSlideInterval(input.slideIntervalSec)),
      }),

      library: router({
        saveTemplate: adminProcedure
          .input(z.instanceof(FormData))
          .mutation(({ input }) => admin.saveTemplate(parseTemplateUpload(input))),
        duplicate: adminProcedure
          .input(libraryItemRefInputSchema)
          .mutation(({ input }) => admin.duplicateItem(input.itemId)),
        rename: adminProcedure
          .input(renameLibraryItemInputSchema)
          .mutation(({ input }) => admin.renameItem(input.itemId, input.name)),
        remove: adminProcedure
          .input(libraryItemRefInputSchema)
          .mutation(({ input }) => admin.removeItem(input.itemId)),
      }),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
