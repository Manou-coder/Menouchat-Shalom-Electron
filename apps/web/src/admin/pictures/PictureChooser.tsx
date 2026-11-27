import { ArrowRight, FileUp, Library, LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';
import {
  Button as AriaButton,
  Dialog,
  FileTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

import { strings, type LibraryItem, type SlideSlot } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { ACCEPTED_SLIDE_TYPES } from '../../slides/convert-slide.ts';
import { ErrorMessage } from '../ui/Card.tsx';
import { useAction } from '../use-action.ts';
import { LibraryPicker } from './LibraryPicker.tsx';
import { useFileUpload } from './use-file-upload.ts';

const labels = strings.admin.chooser;

const choiceClass =
  'grid min-h-32 cursor-pointer place-items-center gap-1 rounded-xl border border-border bg-surface p-4 text-center hover:border-accent focus-visible:outline-3 focus-visible:outline-focus disabled:opacity-60 data-disabled:opacity-60 data-focus-visible:outline-3 data-focus-visible:outline-focus data-hovered:border-accent';

/**
 * What a slot shows next: a file from this device, or anything in the library (a file sent
 * before, or a template, or a new template).
 */
export function PictureChooser({
  slot,
  library,
  onNewTemplate,
  onClose,
}: {
  slot: SlideSlot;
  library: readonly LibraryItem[];
  onNewTemplate: () => void;
  onClose: () => void;
}) {
  const api = useApiClient();
  const [step, setStep] = useState<'choose' | 'library'>('choose');
  const { upload, busy, error } = useFileUpload(slot);
  const show = useAction((itemId: string) => api.admin.slides.show.mutate({ slot, itemId }));

  return (
    <ModalOverlay
      isOpen
      isDismissable={!busy}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4"
    >
      <Modal className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-xl">
        <Dialog className="grid gap-4 p-5 outline-none">
          <div className="flex items-center gap-3">
            {step === 'library' && (
              <Button
                variant="icon"
                aria-label={labels.back}
                onPress={() => {
                  setStep('choose');
                }}
              >
                <ArrowRight aria-hidden className="mx-auto size-5" />
              </Button>
            )}
            <Heading slot="title" className="flex-1 text-lg font-semibold">
              {labels.title(slot)}
            </Heading>
            <Button variant="icon" aria-label={labels.close} onPress={onClose} isDisabled={busy}>
              <X aria-hidden className="mx-auto size-5" />
            </Button>
          </div>

          {step === 'choose' ? (
            <div className="grid grid-cols-2 gap-3">
              <FileTrigger
                acceptedFileTypes={ACCEPTED_SLIDE_TYPES}
                onSelect={(files) => {
                  const file = files?.[0];
                  if (file !== undefined) {
                    void upload(file).then((item) => {
                      if (item !== undefined) {
                        onClose();
                      }
                    });
                  }
                }}
              >
                <AriaButton isDisabled={busy} className={choiceClass}>
                  <span className="grid justify-items-center gap-1">
                    {busy ? (
                      <LoaderCircle aria-hidden className="size-7 animate-spin text-accent" />
                    ) : (
                      <FileUp aria-hidden className="size-7" />
                    )}
                    <span className="font-semibold">
                      {busy ? strings.admin.slides.uploading : labels.file}
                    </span>
                    <span className="text-sm text-text-muted">{labels.fileHint}</span>
                  </span>
                </AriaButton>
              </FileTrigger>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep('library');
                }}
                className={choiceClass}
              >
                <Library aria-hidden className="size-7" />
                <span className="font-semibold">{labels.library}</span>
                <span className="text-sm text-text-muted">{labels.libraryHint}</span>
              </button>
            </div>
          ) : (
            <LibraryPicker
              library={library}
              onNewTemplate={onNewTemplate}
              onPick={(item) => {
                void show.run(item.id).then((shown) => {
                  if (shown) {
                    onClose();
                  }
                });
              }}
            />
          )}
          <ErrorMessage message={error ?? show.error} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
