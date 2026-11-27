import {
  DAY_EVENT_KINDS,
  strings,
  type DayEventKind,
  type DayEventSettings,
} from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';

const labels = strings.admin.events;

/** One switch per kind of day event; each saves at once, like the slide switches. */
export function DayEventsCard({ events }: { events: DayEventSettings }) {
  const api = useApiClient();
  const toggle = useAction((kind: DayEventKind, enabled: boolean) =>
    api.admin.setDayEventEnabled.mutate({ kind, enabled }),
  );
  return (
    <Card title={labels.title}>
      <p className="-mt-2 text-sm text-text-muted">{labels.hint}</p>
      <div className="grid gap-1">
        {DAY_EVENT_KINDS.map((kind) => (
          <Toggle
            key={kind}
            label={labels.kinds[kind]}
            isSelected={events[kind]}
            isDisabled={toggle.pending}
            onChange={(enabled) => void toggle.run(kind, enabled)}
          />
        ))}
      </div>
      <ErrorMessage message={toggle.error} />
    </Card>
  );
}
