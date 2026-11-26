import { initTRPC } from '@trpc/server';

import type { ClientKind } from '@menouchat/shared';

export interface RequestContext {
  client: ClientKind;
}

const t = initTRPC.context<RequestContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
