import { TRPCClientError } from '@trpc/client';

import { strings } from '@menouchat/shared';

export function errorCode(error: unknown): string | undefined {
  if (!(error instanceof TRPCClientError)) {
    return undefined;
  }
  const data: unknown = error.data;
  return typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string'
    ? data.code
    : undefined;
}

/** A Hebrew sentence for a failed request, shown in the card where it happened. */
export function errorMessage(error: unknown): string {
  const messages = strings.admin.errors;
  switch (errorCode(error)) {
    case 'BAD_REQUEST':
    case 'PRECONDITION_FAILED':
      return messages.invalid;
    case 'NOT_FOUND':
      return messages.notFound;
    case undefined:
      return error instanceof TypeError ? messages.network : messages.generic;
    default:
      return messages.generic;
  }
}
