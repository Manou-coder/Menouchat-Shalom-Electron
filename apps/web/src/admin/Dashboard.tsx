import { useEffect, useState } from 'react';

import { strings } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { ShabbatTimesCard, WeekdayTimesCard } from './cards/ScheduleCards.tsx';
import { SlidesCard } from './cards/SlidesCard.tsx';
import { PhoneAddress } from './PhoneAddress.tsx';
import { UpdateBanner } from './UpdateBanner.tsx';
import { useAdminState } from './use-admin-state.ts';

function useVersion(): string | undefined {
  const api = useApiClient();
  const [version, setVersion] = useState<string>();
  useEffect(() => {
    void api.health.query().then(
      (health) => {
        setVersion(health.version);
      },
      () => undefined,
    );
  }, [api]);
  return version;
}

/** Every card on one page: one column on a phone, a grid on wider screens (plan §9). */
export function Dashboard() {
  const { state, reconnecting } = useAdminState();
  const version = useVersion();

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-4 sm:py-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">
          {strings.appName} · {strings.admin.title}
        </h1>
        {state !== undefined && <PhoneAddress urls={state.phoneUrls} />}
      </header>

      {reconnecting && (
        <p role="status" className="rounded-lg bg-danger px-4 py-2 text-white">
          {strings.admin.connectionLost}
        </p>
      )}

      {state !== undefined && <UpdateBanner update={state.update} />}

      {state === undefined ? (
        <p role="status">{strings.admin.loading}</p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <WeekdayTimesCard schedule={state.schedule} />
          <ShabbatTimesCard schedule={state.schedule} />
          <div className="md:col-span-2">
            <SlidesCard slides={state.slides} slideIntervalSec={state.slideIntervalSec} />
          </div>
        </div>
      )}

      {version !== undefined && (
        <footer className="text-center text-sm text-text-muted" dir="ltr">
          v{version}
        </footer>
      )}
    </main>
  );
}
