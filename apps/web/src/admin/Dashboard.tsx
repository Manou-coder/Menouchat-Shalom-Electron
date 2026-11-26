import { useEffect, useState } from 'react';

import { strings, type ClientKind } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { Button } from '../components/Button.tsx';
import { PhoneAccessCard } from './cards/PhoneAccessCard.tsx';
import { ShabbatTimesCard, WeekdayTimesCard } from './cards/ScheduleCards.tsx';
import { SlidesCard } from './cards/SlidesCard.tsx';
import { useAdminState } from './use-admin-state.ts';

function useServerInfo(): { version: string; client: ClientKind } | undefined {
  const api = useApiClient();
  const [info, setInfo] = useState<{ version: string; client: ClientKind }>();
  useEffect(() => {
    void api.health.query().then(setInfo, () => undefined);
  }, [api]);
  return info;
}

/** Every card on one page: one column on a phone, a grid on wider screens (plan §9). */
export function Dashboard({ onSignedOut }: { onSignedOut: () => void }) {
  const api = useApiClient();
  const { state, reconnecting, unauthorized } = useAdminState();
  const info = useServerInfo();

  useEffect(() => {
    if (unauthorized) {
      onSignedOut();
    }
  }, [unauthorized, onSignedOut]);

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-4 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {strings.appName} · {strings.admin.title}
        </h1>
        {info?.client === 'remote' && (
          <Button
            variant="secondary"
            onPress={() => {
              void api.auth.logout.mutate().then(onSignedOut);
            }}
          >
            {strings.admin.login.logout}
          </Button>
        )}
      </header>

      {reconnecting && (
        <p role="status" className="rounded-lg bg-danger px-4 py-2 text-white">
          {strings.admin.connectionLost}
        </p>
      )}

      {state === undefined ? (
        <p role="status">{strings.admin.loading}</p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <WeekdayTimesCard schedule={state.schedule} />
          <ShabbatTimesCard schedule={state.schedule} />
          <SlidesCard slides={state.slides} slideIntervalSec={state.slideIntervalSec} />
          <PhoneAccessCard access={state.phoneAccess} />
        </div>
      )}

      {info !== undefined && (
        <footer className="text-center text-sm text-text-muted" dir="ltr">
          v{info.version}
        </footer>
      )}
    </main>
  );
}
