import { ImagePlus, Pencil, Replace } from 'lucide-react';
import { useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';

import {
  SLIDE_SLOTS,
  strings,
  type LibraryItem,
  type SlideSlot,
  type Slot,
} from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import type { TemplateItem } from '../pictures/library.ts';
import { LibraryThumbnail } from '../pictures/LibraryThumbnail.tsx';
import { PictureChooser } from '../pictures/PictureChooser.tsx';
import { TemplateEditor } from '../pictures/TemplateEditor.tsx';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';

const labels = strings.admin.slides;

const MIN_INTERVAL = 3;
const MAX_INTERVAL = 300;

/** The seconds per slide, saved when the field is left or Enter is pressed. */
function IntervalField({ seconds }: { seconds: number }) {
  const api = useApiClient();
  const [draft, setDraft] = useState(String(seconds));
  const [lastSaved, setLastSaved] = useState(seconds);
  const save = useAction((value: number) =>
    api.admin.slides.setInterval.mutate({ slideIntervalSec: value }),
  );
  // Follows changes made elsewhere (another phone) while the field is untouched.
  if (seconds !== lastSaved) {
    setLastSaved(seconds);
    setDraft(String(seconds));
  }

  function commit() {
    const value = Number(draft);
    if (Number.isInteger(value) && value >= MIN_INTERVAL && value <= MAX_INTERVAL) {
      if (value !== seconds) {
        void save.run(value);
      }
    } else {
      setDraft(String(seconds));
    }
  }

  return (
    <div className="grid gap-1">
      <label className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        {labels.interval}
        <input
          type="number"
          inputMode="numeric"
          dir="ltr"
          min={MIN_INTERVAL}
          max={MAX_INTERVAL}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit();
            }
          }}
          className="h-11 w-20 rounded-xl border border-border bg-surface px-3 text-center text-base text-text tabular-nums shadow-xs outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-focus/40"
        />
        {labels.intervalUnit}
      </label>
      <ErrorMessage message={save.error} />
    </div>
  );
}

function SlotCard({
  slot,
  entry,
  item,
  library,
}: {
  slot: SlideSlot;
  entry: Slot | undefined;
  item: LibraryItem | undefined;
  library: readonly LibraryItem[];
}) {
  const api = useApiClient();
  // The chooser, or the editor on the slot's template or on a new one for this slot.
  const [dialog, setDialog] = useState<'choose' | 'new-template' | 'edit-template'>();
  const toggle = useAction((enabled: boolean) =>
    api.admin.slides.setEnabled.mutate({ slot, enabled }),
  );
  const show = useAction((itemId: string) => api.admin.slides.show.mutate({ slot, itemId }));
  const shown = entry?.enabled === true;
  const template: TemplateItem | undefined = item?.kind === 'template' ? item : undefined;
  const open = () => {
    setDialog('choose');
  };

  return (
    <li className="grid content-start gap-3 rounded-xl border border-border/70 bg-surface p-3">
      {item === undefined ? (
        <AriaButton
          onPress={open}
          className="relative grid aspect-[594/280] w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-text-muted data-focus-visible:outline-3 data-focus-visible:outline-focus data-hovered:border-accent data-hovered:text-accent"
        >
          <span className="grid justify-items-center gap-1">
            <ImagePlus aria-hidden className="size-7" />
            {labels.add}
          </span>
          <SlotNumber slot={slot} />
        </AriaButton>
      ) : (
        <AriaButton
          onPress={open}
          aria-label={`${labels.change} – ${labels.slot(slot)}`}
          className="relative block w-full cursor-pointer rounded-lg data-focus-visible:outline-3 data-focus-visible:outline-focus"
        >
          <LibraryThumbnail item={item} dimmed={!shown} />
          <SlotNumber slot={slot} />
        </AriaButton>
      )}

      <div className="grid min-h-11 content-center gap-0.5">
        <span className="truncate font-medium" title={item?.name}>
          <bdi>{item?.name ?? labels.empty}</bdi>
        </span>
        {template !== undefined && (
          <button
            type="button"
            onClick={() => {
              setDialog('edit-template');
            }}
            className="flex w-fit items-center gap-1 text-sm text-accent hover:underline focus-visible:outline-3 focus-visible:outline-focus"
          >
            <Pencil aria-hidden className="size-4" />
            {labels.editTemplate}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle
          label={labels.shown}
          isSelected={shown}
          isDisabled={item === undefined || toggle.pending}
          onChange={(enabled) => void toggle.run(enabled)}
        />
        {item !== undefined && (
          <Button variant="secondary" onPress={open}>
            <span className="flex items-center gap-2">
              <Replace aria-hidden className="size-5" />
              {labels.change}
            </span>
          </Button>
        )}
      </div>
      <ErrorMessage message={toggle.error ?? show.error} />

      {dialog === 'choose' && (
        <PictureChooser
          slot={slot}
          library={library}
          onNewTemplate={() => {
            setDialog('new-template');
          }}
          onClose={() => {
            setDialog(undefined);
          }}
        />
      )}
      {(dialog === 'new-template' || dialog === 'edit-template') && (
        <TemplateEditor
          {...(dialog === 'edit-template' && template !== undefined ? { template } : {})}
          library={library}
          onClose={() => {
            setDialog(undefined);
          }}
          onSaved={(saved) => {
            setDialog(undefined);
            // An edited template already reaches the screens; a new one goes in this slot.
            if (dialog === 'new-template') {
              void show.run(saved.id);
            }
          }}
        />
      )}
    </li>
  );
}

function SlotNumber({ slot }: { slot: SlideSlot }) {
  return (
    <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-surface/90 font-semibold text-accent shadow-sm">
      {slot}
    </span>
  );
}

/** v1's four slide slots, each showing an item of the library, and the seconds per slide. */
export function SlidesCard({
  slots,
  library,
  slideIntervalSec,
}: {
  slots: readonly Slot[];
  library: readonly LibraryItem[];
  slideIntervalSec: number;
}) {
  return (
    <Card title={labels.title}>
      <IntervalField seconds={slideIntervalSec} />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SLIDE_SLOTS.map((slot) => {
          const entry = slots.find((candidate) => candidate.slot === slot);
          return (
            <SlotCard
              key={slot}
              slot={slot}
              entry={entry}
              item={library.find((candidate) => candidate.id === entry?.itemId)}
              library={library}
            />
          );
        })}
      </ul>
    </Card>
  );
}
