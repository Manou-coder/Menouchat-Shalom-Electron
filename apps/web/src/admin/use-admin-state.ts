import { useEffect, useState } from 'react';

import { adminStateSchema, type AdminState } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { errorCode } from './errors.ts';

export interface AdminStateResult {
  state: AdminState | undefined;
  /** True while the stream reconnects; the last state stays on screen meanwhile. */
  reconnecting: boolean;
  unauthorized: boolean;
}

/** The admin state, pushed by the server after every change from any device. */
export function useAdminState(): AdminStateResult {
  const api = useApiClient();
  const [state, setState] = useState<AdminState>();
  const [reconnecting, setReconnecting] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const subscription = api.admin.onState.subscribe(undefined, {
      onData: (data) => {
        const parsed = adminStateSchema.safeParse(data);
        if (parsed.success) {
          setState(parsed.data);
          setReconnecting(false);
        }
      },
      onError: (error) => {
        if (errorCode(error) === 'UNAUTHORIZED') {
          setUnauthorized(true);
        }
      },
      onConnectionStateChange: (connection) => {
        setReconnecting(connection.state === 'connecting' && connection.error !== null);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [api]);

  return { state, reconnecting, unauthorized };
}
