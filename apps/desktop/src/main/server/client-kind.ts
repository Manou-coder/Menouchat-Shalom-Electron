import { timingSafeEqual } from 'node:crypto';

import type { ClientKind } from '@menouchat/shared';

const BEARER_PREFIX = 'Bearer ';

/** A caller is local when it presents this launch's token, which only our preload knows. */
export function resolveClientKind(authorization: string | undefined, token: string): ClientKind {
  if (authorization?.startsWith(BEARER_PREFIX) !== true) {
    return 'remote';
  }
  const presented = Buffer.from(authorization.slice(BEARER_PREFIX.length));
  const expected = Buffer.from(token);
  return presented.length === expected.length && timingSafeEqual(presented, expected)
    ? 'local'
    : 'remote';
}
