import { Navigate, useParams } from 'react-router';

import { strings } from '@menouchat/shared';

import logo from '../assets/logo.png';
import { AdminNav } from './AdminNav.tsx';
import { LayoutCard } from './cards/LayoutCard.tsx';
import { ShabbatTimesCard, WeekdayTimesCard } from './cards/ScheduleCards.tsx';
import { SlidesCard } from './cards/SlidesCard.tsx';
import { UpdateCard } from './cards/UpdateCard.tsx';
import { PhoneAddress } from './PhoneAddress.tsx';
import { DEFAULT_SECTION, parseSection, sectionPath, type AdminSection } from './sections.ts';
import { Card } from './ui/Card.tsx';
import { useAdminState } from './use-admin-state.ts';

/**
 * One section of the menu at a time. Every section stays mounted and only the current one
 * is shown, so unsaved edits survive a switch to another section and back.
 */
export function Dashboard() {
  const { section: param } = useParams();
  const section = parseSection(param);
  const { state, reconnecting } = useAdminState();

  if (section === undefined) {
    return <Navigate to={sectionPath(DEFAULT_SECTION)} replace />;
  }

  const shown = (id: AdminSection) => ({ hidden: section !== id });

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <img src={logo} alt="" className="size-11 shrink-0" />
          <h1 className="min-w-0 flex-1 text-xl font-bold">
            {strings.appName} ·{' '}
            <span className="font-medium text-text-muted">{strings.admin.title}</span>
          </h1>
        </div>
      </header>
      {/* Bottom padding on a phone keeps the last card clear of the tab bar. */}
      <div className="mx-auto max-w-5xl gap-6 px-4 pt-5 pb-28 sm:pt-8 md:flex md:pb-8">
        <AdminNav updatePending={state !== undefined && state.update.status !== 'none'} />
        <main className="grid min-w-0 flex-1 content-start gap-5">
          {reconnecting && (
            <p role="status" className="rounded-lg bg-danger px-4 py-2 text-white">
              {strings.admin.connectionLost}
            </p>
          )}

          {state === undefined ? (
            <p role="status">{strings.admin.loading}</p>
          ) : (
            <>
              <div {...shown('times')} className="grid gap-5">
                <WeekdayTimesCard schedule={state.schedule} />
                <ShabbatTimesCard schedule={state.schedule} />
              </div>
              <div {...shown('slides')}>
                <SlidesCard slides={state.slides} slideIntervalSec={state.slideIntervalSec} />
              </div>
              <div {...shown('layout')}>
                <LayoutCard layoutId={state.layoutId} />
              </div>
              <div {...shown('settings')} className="grid gap-5">
                <Card title={strings.admin.phone.title}>
                  <PhoneAddress urls={state.phoneUrls} />
                </Card>
                <UpdateCard update={state.update} />
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
