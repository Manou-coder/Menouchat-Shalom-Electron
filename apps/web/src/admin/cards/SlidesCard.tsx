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
import { toast } from '../toasts.tsx';
import { Card } from '../ui/Card.tsx';
import { NumberInput, Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { useDraft } from '../use-draft.ts';

const labels = strings.admin.slides;

function SlotRow({ slot, slide }: { slot: SlideSlot; slide: Slide | undefined }) {
  const api = useApiClient();
  const [busy, setBusy] = useState(false);
  const toggle = useAction((enabled: boolean) =>
    api.admin.slides.setEnabled.mutate({ slot, enabled }),
  );

  async function upload(file: File) {
    setBusy(true);
    try {
      const image = await convertSlide(file);
      const form = new FormData();
      form.set(SLIDE_UPLOAD_FIELDS.slot, String(slot));
      form.set(SLIDE_UPLOAD_FIELDS.title, file.name);
      form.set(SLIDE_UPLOAD_FIELDS.original, file);
      form.set(SLIDE_UPLOAD_FIELDS.image, image, 'page-1.jpg');
      await api.admin.slides.upload.mutate(form);
      toast.success(labels.added);
    } catch (error) {
      toast.error(
        error instanceof SlideConversionError ? labels.conversionFailed : errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background font-semibold">
          {slot}
        </span>
        {slide === undefined ? (
          <div className="h-16 w-24 shrink-0 rounded bg-background" />
        ) : (
          <img
            src={slidePageUrl(slide.id, slide.image)}
            alt=""
            className="h-16 w-24 shrink-0 rounded bg-background object-contain"
          />
        )}
        <span className="min-w-0 flex-1 truncate" dir="auto">
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
  const saveInterval = useAction(
    () => api.admin.slides.setInterval.mutate({ slideIntervalSec: interval.draft }),
    strings.admin.saved,
  );

  return (
    <Card title={labels.title}>
      <p className="text-sm text-text-muted">{labels.accepted}</p>
      <ul className="grid gap-2">
        {SLIDE_SLOTS.map((slot) => (
          <SlotRow key={slot} slot={slot} slide={slides.find((slide) => slide.slot === slot)} />
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (event.currentTarget.reportValidity()) {
            void saveInterval.run();
          }
        }}
      >
        <div className="w-40">
          <NumberInput
            label={labels.interval}
            value={interval.draft}
            min={3}
            max={300}
            onChange={interval.setDraft}
          />
        </div>
        <Button type="submit" isDisabled={!interval.dirty || saveInterval.pending}>
          {saveInterval.pending ? strings.admin.saving : strings.admin.save}
        </Button>
      </form>
    </Card>
  );
}
