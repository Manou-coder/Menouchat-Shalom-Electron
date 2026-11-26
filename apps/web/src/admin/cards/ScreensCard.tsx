import { strings, type Display } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { findLayout, layouts } from '../../layouts/registry.ts';
import { FormCard } from '../ui/Card.tsx';
import { NumberInput, SelectInput, Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { useDraft } from '../use-draft.ts';

const labels = strings.admin.screens;

function ScreenForm({ display }: { display: Display }) {
  const api = useApiClient();
  const server = {
    id: display.id,
    layoutId: display.layoutId,
    layoutOptions: display.layoutOptions,
    slideIntervalSec: display.slideIntervalSec,
  };
  const { draft, setDraft, dirty } = useDraft(server);
  const save = useAction(() => api.admin.updateDisplay.mutate(draft), strings.admin.saved);
  const layout = findLayout(draft.layoutId);
  const options = layout?.optionsSchema.safeParse(draft.layoutOptions);
  const values = options?.success === true ? options.data : {};

  return (
    <FormCard
      title={`${labels.title} · ${display.name}`}
      dirty={dirty}
      pending={save.pending}
      onSave={() => void save.run()}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-4">
          <SelectInput
            label={labels.layout}
            value={draft.layoutId}
            options={layouts.map(({ id }) => ({ value: id, label: labels.layouts[id] ?? id }))}
            onChange={(layoutId) => {
              setDraft({ ...draft, layoutId, layoutOptions: {} });
            }}
          />
          {layout?.booleanOptions.map((key) => (
            <Toggle
              key={key}
              label={labels.options[key] ?? key}
              isSelected={values[key] === true}
              onChange={(isSelected) => {
                setDraft({ ...draft, layoutOptions: { ...values, [key]: isSelected } });
              }}
            />
          ))}
          <NumberInput
            label={labels.interval}
            value={draft.slideIntervalSec}
            min={3}
            max={300}
            onChange={(slideIntervalSec) => {
              setDraft({ ...draft, slideIntervalSec });
            }}
          />
        </div>
        <figure className="grid justify-items-center gap-1">
          {/* The real display page, scaled by its own layout: what the screen shows now. */}
          <iframe
            src={`/display/${encodeURIComponent(display.id)}`}
            title={labels.preview}
            tabIndex={-1}
            className="pointer-events-none aspect-[9/16] w-40 rounded-lg border border-border bg-black sm:w-48"
          />
          <figcaption className="text-sm text-text-muted">{labels.preview}</figcaption>
        </figure>
      </div>
    </FormCard>
  );
}

export function ScreensCards({ displays }: { displays: readonly Display[] }) {
  return displays.map((display) => <ScreenForm key={display.id} display={display} />);
}
