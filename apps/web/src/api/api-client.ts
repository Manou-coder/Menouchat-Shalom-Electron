import { createTRPCClient, httpBatchLink, type TRPCClient } from '@trpc/client';
import { createContext, useContext } from 'react';

import type { AppRouter } from 'menouchat-chalom/api';

import type { ApiConfig } from './api-config.ts';

export type ApiClient = TRPCClient<AppRouter>;

export function createApiClient({ url, token }: ApiConfig): ApiClient {
  const headers = token === undefined ? {} : { Authorization: `Bearer ${token}` };
  return createTRPCClient<AppRouter>({ links: [httpBatchLink({ url, headers })] });
}

export const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === null) {
    throw new Error('useApiClient must be used inside ApiClientContext');
  }
  return client;
}
