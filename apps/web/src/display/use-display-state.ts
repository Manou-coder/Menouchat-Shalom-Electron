import { TRPCClientError } from '@trpc/client';
import { useEffect, useState } from 'react';

import { displayStateSchema, type DisplayState } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';

export type DisplayStateStatus =
  { status: 'waiting' } | { status: 'ready'; state: DisplayState } | { status: 'not-found' };

/**
 * Follows a display's snapshot pushed by the server. The last snapshot stays on screen
 * while the connection is down, so a server restart never blanks the display.
 */
export function useDisplayState(displayId: string): DisplayStateStatus {
  const api = useApiClient();
  const [result, setResult] = useState<DisplayStateStatus>({ status: 'waiting' });

  useEffect(() => {
    const subscription = api.display.onState.subscribe(
      { displayId },
      {
        onData: (data) => {
          const parsed = displayStateSchema.safeParse(data);
          if (parsed.success) {
            setResult({ status: 'ready', state: parsed.data });
          }
        },
        onError: (error) => {
          if (error instanceof TRPCClientError && isNotFound(error.data)) {
            setResult({ status: 'not-found' });
          }
        },
      },
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [api, displayId]);

  return result;
}

function isNotFound(data: unknown): boolean {
  return typeof data === 'object' && data !== null && 'code' in data && data.code === 'NOT_FOUND';
}
