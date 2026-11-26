import { initTRPC, TRPCError } from '@trpc/server';

import type { ClientKind } from '@menouchat/shared';

import { AdminError } from './errors.ts';

export interface RequestContext {
  /** `local` when the caller presented this launch's token: a window of this app. */
  client: ClientKind;
  /** Network address of the caller, for login throttling. */
  remoteAddress: string;
  /** Session id from the cookie, if any; validity is checked by the auth service. */
  sessionId: string | undefined;
  /** Sets (or clears, with `null`) the admin session cookie on the response. */
  setSessionCookie: (sessionId: string | null) => void;
}

const t = initTRPC.context<RequestContext>().create();

export const router = t.router;

/** Business-rule errors become the matching HTTP status instead of a 500. */
const reportAdminErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof AdminError) {
    throw new TRPCError({
      code: result.error.cause.code,
      message: result.error.cause.message,
      cause: result.error.cause,
    });
  }
  return result;
});

export const publicProcedure = t.procedure.use(reportAdminErrors);
