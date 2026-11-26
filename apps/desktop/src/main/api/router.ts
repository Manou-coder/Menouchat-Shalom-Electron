// The web app imports `AppRouter` from this folder for its types, so nothing here may
// depend on Node or Electron; services are injected instead.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import {
  adminStateSchema,
  displayStateSchema,
  healthSchema,
  pinSchema,
  scheduleInputSchema,
  slideIntervalInputSchema,
  slideToggleInputSchema,
  type AdminState,
  type DisplayState,
  type ScheduleInput,
  type Slide,
  type SlideSlot,
} from '@menouchat/shared';

import { parseSlideUpload, type SlideUpload } from './slide-upload.ts';
import { publicProcedure, router, type RequestContext } from './trpc.ts';

export interface DisplayStateApi {
  get(displayId: string): Promise<DisplayState | undefined>;
  watch(displayId: string, signal: AbortSignal): AsyncIterable<DisplayState>;
}

export interface AdminApi {
  getState(): Promise<AdminState>;
  watch(signal: AbortSignal): AsyncIterable<AdminState>;
  updateSchedule(input: ScheduleInput): Promise<void>;
  uploadSlide(upload: SlideUpload): Promise<Slide>;
  setSlideEnabled(slot: SlideSlot, enabled: boolean): Promise<void>;
  setSlideInterval(seconds: number): Promise<void>;
  setPin(pin: string): Promise<void>;
  setPhoneAccess(enabled: boolean): Promise<void>;
}

export type LoginResult = { ok: true; sessionId: string } | { ok: false; retryAfterMs: number };

export interface AuthApi {
  login(pin: string, remoteAddress: string): Promise<LoginResult>;
  isSessionValid(sessionId: string | undefined): boolean;
  logout(sessionId: string | undefined): void;
  isPinSet(): Promise<boolean>;
}

/** What only the app's own windows may ask of the desktop app. */
export interface DesktopApi {
  showAdmin(): void;
  /** Restarts into a downloaded update. */
  installUpdate(): void;
}

export interface AppRouterDependencies {
  version: string;
  displayStates: DisplayStateApi;
  admin: AdminApi;
  auth: AuthApi;
  desktop: DesktopApi;
}

const displayIdInput = z.object({ displayId: z.string().min(1).max(50) });

export function createAppRouter({
  version,
  displayStates,
  admin,
  auth,
  desktop,
}: AppRouterDependencies) {
  const isAdmin = (ctx: RequestContext) =>
    ctx.client === 'local' || auth.isSessionValid(ctx.sessionId);

  /** The app's own windows, or a phone signed in with the PIN (plan §4.4). */
  const adminProcedure = publicProcedure.use(({ ctx, next }) => {
    if (!isAdmin(ctx)) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in with the admin PIN' });
    }
    return next();
  });

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

    auth: router({
      status: publicProcedure.query(async ({ ctx }) => ({
        signedIn: isAdmin(ctx),
        pinSet: await auth.isPinSet(),
      })),

      login: publicProcedure
        .input(z.object({ pin: pinSchema }))
        .mutation(async ({ input, ctx }) => {
          const result = await auth.login(input.pin, ctx.remoteAddress);
          if (!result.ok) {
            throw new TRPCError(
              result.retryAfterMs > 0
                ? {
                    code: 'TOO_MANY_REQUESTS',
                    message: String(Math.ceil(result.retryAfterMs / 60_000)),
                  }
                : { code: 'UNAUTHORIZED', message: 'Wrong PIN' },
            );
          }
          ctx.setSessionCookie(result.sessionId);
        }),

      logout: publicProcedure.mutation(({ ctx }) => {
        auth.logout(ctx.sessionId);
        ctx.setSessionCookie(null);
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

      state: adminProcedure.output(adminStateSchema).query(() => admin.getState()),

      onState: adminProcedure.subscription(async function* ({ signal }) {
        yield* admin.watch(signal ?? new AbortController().signal);
      }),

      updateSchedule: adminProcedure
        .input(scheduleInputSchema)
        .mutation(({ input }) => admin.updateSchedule(input)),

      slides: router({
        upload: adminProcedure
          .input(z.instanceof(FormData))
          .mutation(({ input }) => admin.uploadSlide(parseSlideUpload(input))),
        setEnabled: adminProcedure
          .input(slideToggleInputSchema)
          .mutation(({ input }) => admin.setSlideEnabled(input.slot, input.enabled)),
        setInterval: adminProcedure
          .input(slideIntervalInputSchema)
          .mutation(({ input }) => admin.setSlideInterval(input.slideIntervalSec)),
      }),

      phone: router({
        setPin: adminProcedure
          .input(z.object({ pin: pinSchema }))
          .mutation(({ input }) => admin.setPin(input.pin)),
        setEnabled: adminProcedure
          .input(z.object({ enabled: z.boolean() }))
          .mutation(({ input }) => admin.setPhoneAccess(input.enabled)),
      }),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
