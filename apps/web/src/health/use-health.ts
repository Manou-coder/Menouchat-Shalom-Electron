import { useCallback, useEffect, useState } from 'react';

import type { Health } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';

export type HealthState =
  { status: 'checking' } | { status: 'connected'; health: Health } | { status: 'failed' };

export function useHealth(): { state: HealthState; recheck: () => void } {
  const api = useApiClient();
  const [state, setState] = useState<HealthState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.health.query(undefined, { signal: controller.signal }).then(
      (health) => {
        setState({ status: 'connected', health });
      },
      () => {
        if (!controller.signal.aborted) {
          setState({ status: 'failed' });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [api, attempt]);

  const recheck = useCallback(() => {
    setState({ status: 'checking' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, recheck };
}
