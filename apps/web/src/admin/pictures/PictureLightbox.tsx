import { X } from 'lucide-react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';

import { strings, type LibraryItem } from '@menouchat/shared';

import { Button } from '../../components/Button.tsx';
import { itemImageUrl } from './library.ts';

/** A picture full size over a dark backdrop; a tap beside it or the ✕ closes it. */
export function PictureLightbox({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      className="fixed inset-0 z-30 grid place-items-center bg-black/85 p-4"
    >
      <Modal className="w-full max-w-5xl outline-none">
        <Dialog aria-label={item.name} className="grid gap-3 outline-none">
          <div className="flex items-center gap-3 text-white">
            <span className="flex-1 truncate font-medium">
              <bdi>{item.name}</bdi>
            </span>
            <Button variant="icon" aria-label={strings.admin.slides.closePreview} onPress={onClose}>
              <X aria-hidden className="mx-auto size-5" />
            </Button>
          </div>
          <img
            src={itemImageUrl(item)}
            alt={item.name}
            className="max-h-[80dvh] w-full rounded-lg object-contain"
          />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
