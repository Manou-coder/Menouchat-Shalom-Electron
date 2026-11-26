import { useState } from 'react';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A card's editable copy of server data. It follows the server while untouched, so changes
 * made elsewhere (another phone, the PC) show up, and stops following once edited.
 */
export function useDraft<T>(server: T) {
  const [draft, setDraft] = useState(server);
  const [lastServer, setLastServer] = useState(server);
  if (!same(server, lastServer)) {
    setLastServer(server);
    if (same(draft, lastServer)) {
      setDraft(server);
    }
  }
  return {
    draft,
    setDraft,
    dirty: !same(draft, server),
    reset: () => {
      setDraft(server);
    },
  };
}
