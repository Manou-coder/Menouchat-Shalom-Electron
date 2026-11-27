import { strings } from '@menouchat/shared';

import logo from '../assets/logo.png';
import { LayoutCard } from './cards/LayoutCard.tsx';
import { ShabbatTimesCard, WeekdayTimesCard } from './cards/ScheduleCards.tsx';
import { SlidesCard } from './cards/SlidesCard.tsx';
import { UpdateCard } from './cards/UpdateCard.tsx';
import { PhoneAddress } from './PhoneAddress.tsx';
import { useAdminState } from './use-admin-state.ts';

/** Every card on one page: one column on a phone, a grid on wider screens (plan §9). */
export function Dashboard() {
  const { state, reconnecting } = useAdminState();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <img src={logo} alt="" className="size-11 shrink-0" />
          <h1 className="min-w-0 flex-1 text-xl font-bold">
            {strings.appName} ·{' '}
            <span className="font-medium text-text-muted">{strings.admin.title}</span>
          </h1>
          {state !== undefined && (
            // Its own full-width line, so the addresses do not break beside the logo.
            <div className="w-full">
              <PhoneAddress urls={state.phoneUrls} />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-5 sm:py-8">
        {reconnecting && (
          <p role="status" className="rounded-lg bg-danger px-4 py-2 text-white">
            {strings.admin.connectionLost}
          </p>
        )}

        {state === undefined ? (
          <p role="status">{strings.admin.loading}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <WeekdayTimesCard schedule={state.schedule} />
            <ShabbatTimesCard schedule={state.schedule} />
            <div className="md:col-span-2">
              <SlidesCard slides={state.slides} slideIntervalSec={state.slideIntervalSec} />
            </div>
            <div className="md:col-span-2">
              <LayoutCard layoutId={state.layoutId} />
            </div>
            <div className="md:col-span-2">
              <UpdateCard update={state.update} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
