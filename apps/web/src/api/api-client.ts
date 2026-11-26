import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  httpSubscriptionLink,
  isNonJsonSerializable,
  splitLink,
  type TRPCClient,
} from '@trpc/client';
import { createContext, useContext } from 'react';

import type { AppRouter } from 'menouchat-chalom/api';

import type { ApiConfig } from './api-config.ts';

export type ApiClient = TRPCClient<AppRouter>;

export function createApiClient({ url, token }: ApiConfig): ApiClient {
  const headers = token === undefined ? {} : { Authorization: `Bearer ${token}` };
  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        // Server-sent events reconnect by themselves; they cannot carry headers, so the
        // token travels as a connection parameter.
        condition: (operation) => operation.type === 'subscription',
        true: httpSubscriptionLink({
          url,
          ...(token === undefined ? {} : { connectionParams: { token } }),
        }),
        false: splitLink({
          // File uploads (FormData) cannot be batched.
          condition: (operation) => isNonJsonSerializable(operation.input),
          true: httpLink({ url, headers }),
          false: httpBatchLink({ url, headers }),
        }),
      }),
    ],
  });
}

export const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === null) {
    throw new Error('useApiClient must be used inside ApiClientContext');
  }
  return client;
}
