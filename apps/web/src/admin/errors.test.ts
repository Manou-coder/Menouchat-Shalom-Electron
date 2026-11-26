import { TRPCClientError } from '@trpc/client';
import { describe, expect, it } from 'vitest';

import { strings } from '@menouchat/shared';

import { errorCode, errorMessage } from './errors.ts';

const clientError = (code: string) =>
  new TRPCClientError('failed', { result: { error: { data: { code } } } });

describe('errorMessage', () => {
  it.each([
    ['BAD_REQUEST', strings.admin.errors.invalid],
    ['PRECONDITION_FAILED', strings.admin.errors.invalid],
    ['NOT_FOUND', strings.admin.errors.notFound],
    ['INTERNAL_SERVER_ERROR', strings.admin.errors.generic],
  ])('explains %s in Hebrew', (code, message) => {
    expect(errorCode(clientError(code))).toBe(code);
    expect(errorMessage(clientError(code))).toBe(message);
  });

  it('reports a lost network separately', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(strings.admin.errors.network);
  });
});
