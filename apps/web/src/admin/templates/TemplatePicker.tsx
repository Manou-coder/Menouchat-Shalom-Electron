import { Plus, X } from 'lucide-react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

import { strings, type SlideSlot, type Template } from '@menouchat/shared';

import { Button } from '../../components/Button.tsx';
import { TemplateThumbnail } from './TemplateThumbnail.tsx';

const labels = strings.admin.templates;

/** Picks a template to show in a slot, or starts a new one for it. */
export function TemplatePicker({
  slot,
  templates,
  onPick,
  onCreate,
  onClose,
}: {
  slot: SlideSlot;
  templates: readonly Template[];
  onPick: (template: Template) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4"
    >
      <Modal className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-xl">
        <Dialog className="grid gap-4 p-5 outline-none">
          <div className="flex items-center gap-3">
            <Heading slot="title" className="flex-1 text-lg font-semibold">
              {labels.pickFor(slot)}
            </Heading>
            <Button variant="icon" aria-label={labels.cancel} onPress={onClose}>
              <X aria-hidden className="mx-auto size-5" />
            </Button>
          </div>
          <div>
            <Button variant="secondary" onPress={onCreate}>
              <span className="flex items-center gap-2">
                <Plus aria-hidden className="size-5" />
                {labels.create}
              </span>
            </Button>
          </div>
          {templates.length === 0 ? (
            <p className="text-text-muted">{labels.empty}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(template);
                    }}
                    className="grid w-full gap-1 rounded-xl border border-border/70 bg-surface p-2 text-start hover:border-accent focus-visible:outline-3 focus-visible:outline-focus"
                  >
                    <TemplateThumbnail template={template} />
                    <span className="truncate text-sm font-medium" dir="auto">
                      {template.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
