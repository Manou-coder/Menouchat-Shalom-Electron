import {
  Button,
  Text,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from 'react-aria-components';

interface ToastMessage {
  text: string;
  tone: 'success' | 'error';
}

const TIMEOUT_MS = 4_000;

// One queue for the whole admin: every card reports through it.
const queue = new ToastQueue<ToastMessage>({ maxVisibleToasts: 3 });

export const toast = {
  success: (text: string) => queue.add({ text, tone: 'success' }, { timeout: TIMEOUT_MS }),
  error: (text: string) => queue.add({ text, tone: 'error' }, { timeout: TIMEOUT_MS * 2 }),
};

export function Toasts() {
  return (
    <ToastRegion
      queue={queue}
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-4"
    >
      {({ toast: item }) => (
        <Toast
          toast={item}
          className={`flex min-h-11 w-full max-w-sm items-center gap-3 rounded-lg px-4 py-2 text-white shadow-lg ${
            item.content.tone === 'success' ? 'bg-success' : 'bg-danger'
          }`}
        >
          <ToastContent className="flex-1">
            <Text slot="title">{item.content.text}</Text>
          </ToastContent>
          <Button slot="close" aria-label="×" className="size-8 rounded text-xl">
            ×
          </Button>
        </Toast>
      )}
    </ToastRegion>
  );
}
