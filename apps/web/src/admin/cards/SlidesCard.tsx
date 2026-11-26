import { ImageIcon, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { FileTrigger } from 'react-aria-components';

import {
  SLIDE_SLOTS,
  SLIDE_UPLOAD_FIELDS,
  slidePageUrl,
  strings,
  type Slide,
  type SlideSlot,
} from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import {
  ACCEPTED_SLIDE_TYPES,
  convertSlide,
  SlideConversionError,
} from '../../slides/convert-slide.ts';
import { errorMessage } from '../errors.ts';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { NumberInput, Toggle } from '../ui/fields.tsx';
import { SaveButton } from '../ui/SaveButton.tsx';
import { useAction } from '../use-action.ts';
import { useDraft } from '../use-draft.ts';
import { useUnsavedWarning } from '../use-unsaved-warning.ts';

const labels = strings.admin.slides;

function useSlotUpload(slot: SlideSlot) {
  const api = useApiClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setBusy(true);
    setError(undefined);
    try {
      const image = await convertSlide(file);
      const form = new FormData();
      form.set(SLIDE_UPLOAD_FIELDS.slot, String(slot));
      form.set(SLIDE_UPLOAD_FIELDS.title, file.name);
      form.set(SLIDE_UPLOAD_FIELDS.original, file);
      form.set(SLIDE_UPLOAD_FIELDS.image, image, 'page-1.jpg');
      await api.admin.slides.upload.mutate(form);
    } catch (failure) {
      setError(
        failure instanceof SlideConversionError ? labels.conversionFailed : errorMessage(failure),
      );
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy, error };
}

/** The slot's picture, or an empty frame; a spinner covers it while a new file goes up. */
function Thumbnail({ slide, busy }: { slide: Slide | undefined; busy: boolean }) {
  return (
    <div className="relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-background">
      {slide === undefined ? (
        <ImageIcon aria-hidden className="size-6 text-text-muted" />
      ) : (
        <img
          src={slidePageUrl(slide.id, slide.image)}
          alt=""
          className="size-full object-contain"
        />
      )}
      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-surface/80">
          <LoaderCircle
            aria-label={labels.converting}
            className="size-6 animate-spin text-accent"
          />
        </div>
      )}
    </div>
  );
}

function SlotRow({ slot, slide }: { slot: SlideSlot; slide: Slide | undefined }) {
  const api = useApiClient();
  const { upload, busy, error } = useSlotUpload(slot);
  const toggle = useAction((enabled: boolean) =>
    api.admin.slides.setEnabled.mutate({ slot, enabled }),
  );

  return (
    <li className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border/70 p-3">
      {/* On a phone the file name gets its own line under the picture. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent">
          {slot}
        </span>
        <Thumbnail slide={slide} busy={busy} />
        <span
          className="w-full min-w-0 truncate sm:w-auto sm:flex-1"
          dir="auto"
          title={slide?.title}
        >
          {slide?.title ?? labels.emptySlot}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle
          label={labels.shown}
          isSelected={slide?.enabled === true}
          isDisabled={slide === undefined || toggle.pending}
          onChange={(enabled) => void toggle.run(enabled)}
        />
        <FileTrigger
          acceptedFileTypes={ACCEPTED_SLIDE_TYPES}
          onSelect={(files) => {
            const file = files?.[0];
            if (file !== undefined) {
              void upload(file);
            }
          }}
        >
          <Button variant="secondary" isDisabled={busy}>
            {busy ? labels.converting : slide === undefined ? labels.choose : labels.replace}
          </Button>
        </FileTrigger>
      </div>
      <ErrorMessage message={error ?? toggle.error} />
    </li>
  );
}

/** v1's four slide slots: a picture each, shown or not, and the seconds per slide. */
export function SlidesCard({
  slides,
  slideIntervalSec,
}: {
  slides: readonly Slide[];
  slideIntervalSec: number;
}) {
  const api = useApiClient();
  const interval = useDraft(slideIntervalSec);
  const save = useAction(() =>
    api.admin.slides.setInterval.mutate({ slideIntervalSec: interval.draft }),
  );
  useUnsavedWarning(interval.dirty);

  return (
    <Card title={labels.title}>
      <p className="-mt-2 text-sm text-text-muted">{labels.accepted}</p>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SLIDE_SLOTS.map((slot) => (
          <SlotRow key={slot} slot={slot} slide={slides.find((slide) => slide.slot === slot)} />
        ))}
      </ul>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (event.currentTarget.reportValidity()) {
            void save.run();
          }
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <NumberInput
              label={labels.interval}
              value={interval.draft}
              min={3}
              max={300}
              onChange={interval.setDraft}
            />
          </div>
          <SaveButton dirty={interval.dirty} pending={save.pending} done={save.done} />
        </div>
        <ErrorMessage message={save.error} />
      </form>
    </Card>
  );
}
