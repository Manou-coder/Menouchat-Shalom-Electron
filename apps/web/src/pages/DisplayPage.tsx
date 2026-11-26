import { useParams } from 'react-router';

import { strings } from '@menouchat/shared';

import { useIsDesktopWindow } from '../api/is-desktop-window.ts';
import { AdminButton } from '../display/AdminButton.tsx';
import { useDisplayState } from '../display/use-display-state.ts';
import { usePointerActivity } from '../display/use-pointer-activity.ts';
import { findLayout } from '../layouts/registry.ts';

function Message({ text }: { text: string }) {
  return (
    <main className="flex h-dvh items-center justify-center bg-black text-2xl text-white">
      {text}
    </main>
  );
}

/** The cursor and the admin button disappear this long after the mouse stops. */
const POINTER_IDLE_MS = 3_000;

export function DisplayPage() {
  const { id = '' } = useParams();
  const result = useDisplayState(id);
  const pointerActive = usePointerActivity(POINTER_IDLE_MS);
  const isDesktopWindow = useIsDesktopWindow();

  return (
    <div className={pointerActive ? '' : 'cursor-none'}>
      {isDesktopWindow && pointerActive && <AdminButton />}
      <DisplayContent result={result} />
    </div>
  );
}

function DisplayContent({ result }: { result: ReturnType<typeof useDisplayState> }) {
  switch (result.status) {
    case 'waiting':
      return <Message text={strings.display.waiting} />;
    case 'not-found':
      return <Message text={strings.display.notFound} />;
    case 'ready': {
      const layout = findLayout(result.state.layoutId);
      return layout === undefined ? (
        <Message text={strings.display.unknownLayout} />
      ) : (
        layout.render(result.state)
      );
    }
  }
}
