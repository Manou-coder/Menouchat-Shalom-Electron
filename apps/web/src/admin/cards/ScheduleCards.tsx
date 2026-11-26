import { strings, type ScheduleInput } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { FormCard } from '../ui/Card.tsx';
import { TimeInput } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { useDraft } from '../use-draft.ts';

const labels = strings.display;

function useScheduleForm(schedule: ScheduleInput) {
  const api = useApiClient();
  const form = useDraft(schedule);
  const save = useAction(() => api.admin.updateSchedule.mutate(form.draft), strings.admin.saved);
  return { ...form, save };
}

export function WeekdayTimesCard({ schedule }: { schedule: ScheduleInput }) {
  const { draft, setDraft, dirty, save } = useScheduleForm(schedule);
  return (
    <FormCard
      title={strings.admin.weekday.title}
      dirty={dirty}
      pending={save.pending}
      onSave={() => void save.run()}
    >
      <div className="grid grid-cols-3 gap-3">
        {(['shacharit', 'mincha', 'arvit'] as const).map((key) => (
          <TimeInput
            key={key}
            label={labels.weekday[key]}
            value={draft.weekday[key]}
            onChange={(value) => {
              setDraft({ ...draft, weekday: { ...draft.weekday, [key]: value } });
            }}
          />
        ))}
      </div>
    </FormCard>
  );
}

export function ShabbatTimesCard({ schedule }: { schedule: ScheduleInput }) {
  const { draft, setDraft, dirty, save } = useScheduleForm(schedule);
  return (
    <FormCard
      title={strings.admin.shabbat.title}
      dirty={dirty}
      pending={save.pending}
      onSave={() => void save.run()}
    >
      <div className="grid grid-cols-2 gap-3">
        {(['shirHashirim', 'minchaErev', 'shacharit', 'mincha'] as const).map((key) => (
          <TimeInput
            key={key}
            label={labels.shabbat[key]}
            value={draft.shabbat[key]}
            onChange={(value) => {
              setDraft({ ...draft, shabbat: { ...draft.shabbat, [key]: value } });
            }}
          />
        ))}
      </div>
    </FormCard>
  );
}
