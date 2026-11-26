// The web app imports `AppRouter` from this folder for its types, so nothing here may
// depend on Node or Electron; services are injected instead.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { displayStateSchema, healthSchema, type DisplayState } from '@menouchat/shared';

import { publicProcedure, router } from './trpc.ts';

export interface DisplayStateApi {
  get(displayId: string): Promise<DisplayState | undefined>;
  watch(displayId: string, signal: AbortSignal): AsyncIterable<DisplayState>;
}

export interface AppRouterDependencies {
  version: string;
  displayStates: DisplayStateApi;
}

const displayInput = z.object({ displayId: z.string().min(1).max(50) });

export function createAppRouter({ version, displayStates }: AppRouterDependencies) {
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
        .input(displayInput)
        .output(displayStateSchema)
        .query(({ input }) => requireDisplayState(input.displayId)),

      /** Pushed over server-sent events: no polling, no reloads (plan §4.3). */
      onState: publicProcedure.input(displayInput).subscription(async function* ({
        input,
        signal,
      }) {
        await requireDisplayState(input.displayId);
        yield* displayStates.watch(input.displayId, signal ?? new AbortController().signal);
      }),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
