import { strings } from '@menouchat/shared';

import type { HealthState } from './use-health.ts';

export function HealthStatus({ state }: { state: HealthState }) {
  return (
    <p
      role="status"
      data-status={state.status}
      className="flex items-center gap-2 text-text-muted before:size-2.5 before:shrink-0 before:rounded-full before:bg-pending data-[status=connected]:before:bg-success data-[status=failed]:before:bg-danger"
    >
      {describe(state)}
    </p>
  );
}

function describe(state: HealthState): string {
  switch (state.status) {
    case 'checking':
      return strings.health.checking;
    case 'failed':
      return strings.health.failed;
    case 'connected': {
      const client =
        state.health.client === 'local' ? strings.health.localClient : strings.health.remoteClient;
      return `${strings.health.connected} · ${client} · ${strings.health.version} ${state.health.version}`;
    }
  }
}
