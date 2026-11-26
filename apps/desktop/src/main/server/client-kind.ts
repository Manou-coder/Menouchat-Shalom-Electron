import { timingSafeEqual } from 'node:crypto';

import type { ClientKind } from '@menouchat/shared';

const BEARER_PREFIX = 'Bearer ';

/** The token of an `Authorization: Bearer …` header, if any. */
export function bearerToken(authorization: string | undefined): string | undefined {
  return authorization?.startsWith(BEARER_PREFIX) === true
    ? authorization.slice(BEARER_PREFIX.length)
    : undefined;
}

/** A caller is local when it presents this launch's token, which only our preload knows. */
export function resolveClientKind(presented: string | undefined, token: string): ClientKind {
  if (presented === undefined) {
    return 'remote';
  }
  const presentedBytes = Buffer.from(presented);
  const expected = Buffer.from(token);
  return presentedBytes.length === expected.length && timingSafeEqual(presentedBytes, expected)
    ? 'local'
    : 'remote';
}
