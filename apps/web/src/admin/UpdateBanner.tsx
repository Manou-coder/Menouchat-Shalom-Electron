import { strings, type UpdateStatus } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { Button } from '../components/Button.tsx';
import { useAction } from './use-action.ts';

const labels = strings.admin.update;

/** Says when a new version is on its way or ready, and can restart into it at once. */
export function UpdateBanner({ update }: { update: UpdateStatus }) {
  const api = useApiClient();
  const install = useAction(() => api.admin.installUpdate.mutate());
  if (update.status === 'none') {
    return null;
  }
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent bg-surface px-4 py-3"
    >
      <span>
        {update.status === 'ready'
          ? labels.ready(update.version)
          : labels.downloading(update.version)}
      </span>
      {update.status === 'ready' && (
        <Button onPress={() => void install.run()} isDisabled={install.pending}>
          {labels.installNow}
        </Button>
      )}
    </div>
  );
}
