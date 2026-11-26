import { useParams } from 'react-router';

import { strings } from '@menouchat/shared';

import { useDisplayState } from '../display/use-display-state.ts';
import { findLayout } from '../layouts/registry.ts';

function Message({ text }: { text: string }) {
  return (
    <main className="flex h-dvh items-center justify-center bg-black text-2xl text-white">
      {text}
    </main>
  );
}

export function DisplayPage() {
  const { id = '' } = useParams();
  const result = useDisplayState(id);

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
