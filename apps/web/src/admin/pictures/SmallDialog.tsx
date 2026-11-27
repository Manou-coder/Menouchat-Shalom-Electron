import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

import { strings } from '@menouchat/shared';

import { Button } from '../../components/Button.tsx';

/** A small dialog over the admin, for one question or one field. */
export function SmallDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
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
      <Modal className="w-full max-w-md rounded-2xl bg-background shadow-xl">
        <Dialog className="grid gap-4 p-5 outline-none">
          <div className="flex items-start gap-3">
            <Heading slot="title" className="flex-1 text-lg font-semibold">
              {title}
            </Heading>
            <Button variant="icon" aria-label={strings.admin.library.close} onPress={onClose}>
              <X aria-hidden className="mx-auto size-5" />
            </Button>
          </div>
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
