// The web app imports `AppRouter` from this folder for its types, so nothing here may
// depend on Node or Electron; services are injected instead.
import { healthSchema } from '@menouchat/shared';

import { publicProcedure, router } from './trpc.ts';

export interface AppRouterDependencies {
  version: string;
}

export function createAppRouter({ version }: AppRouterDependencies) {
  return router({
    health: publicProcedure
      .output(healthSchema)
      .query(({ ctx }) => ({ status: 'ok' as const, version, client: ctx.client })),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
