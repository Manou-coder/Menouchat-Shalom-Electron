import { useState } from 'react';
import {
  FileTrigger,
  GridList,
  GridListItem,
  ProgressBar,
  useDragAndDrop,
} from 'react-aria-components';

import { SLIDE_UPLOAD_FIELDS, slidePageUrl, strings, type Slide } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { ACCEPTED_SLIDE_TYPES, convertSlide } from '../../slides/convert-slide.ts';
import { errorMessage } from '../errors.ts';
import { toast } from '../toasts.tsx';
import { Card } from '../ui/Card.tsx';
import { Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';

const labels = strings.admin.slides;

type UploadProgress = { stage: 'converting'; done: number; total: number } | { stage: 'uploading' };

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').slice(0, 200) || name;
}

function useSlideUpload() {
  const api = useApiClient();
  const [progress, setProgress] = useState<UploadProgress>();

  async function upload(file: File) {
    setProgress({ stage: 'converting', done: 0, total: 1 });
    try {
      const pages = await convertSlide(file, (done, total) => {
        setProgress({ stage: 'converting', done, total });
      });
      setProgress({ stage: 'uploading' });
      const form = new FormData();
      form.set(SLIDE_UPLOAD_FIELDS.title, titleFromFileName(file.name));
      form.set(SLIDE_UPLOAD_FIELDS.original, file);
      pages.forEach((page, index) => {
        form.append(SLIDE_UPLOAD_FIELDS.pages, page, `page-${String(index + 1)}.jpg`);
      });
      await api.admin.slides.add.mutate(form);
      toast.success(labels.added);
    } catch (error) {
      toast.error(
        error instanceof Error && error.name === 'SlideConversionError'
          ? labels.conversionFailed
          : errorMessage(error),
      );
    } finally {
      setProgress(undefined);
    }
  }

  return { upload, progress };
}

function moved(ids: readonly string[], from: number, to: number): string[] {
  const order = [...ids];
  const [item] = order.splice(from, 1);
  if (item !== undefined) {
    order.splice(to, 0, item);
  }
  return order;
}

/** The slide library: upload, order (drag, or arrows on touch screens), show/hide, delete. */
export function SlidesCard({ slides }: { slides: readonly Slide[] }) {
  const api = useApiClient();
  const { upload, progress } = useSlideUpload();
  const ids = slides.map((slide) => slide.id);
  const reorder = useAction((slideIds: string[]) => api.admin.slides.reorder.mutate({ slideIds }));
  const toggle = useAction((slideId: string, enabled: boolean) =>
    api.admin.slides.setEnabled.mutate({ slideId, enabled }),
  );
  const remove = useAction(
    (slideId: string) => api.admin.slides.delete.mutate({ slideId }),
    labels.deleted,
  );

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ 'text/plain': String(key) })),
    onReorder: (event) => {
      const dragged = [...event.keys].map(String);
      const rest = ids.filter((id) => !dragged.includes(id));
      const targetIndex = rest.indexOf(String(event.target.key));
      const insertAt = event.target.dropPosition === 'before' ? targetIndex : targetIndex + 1;
      void reorder.run([...rest.slice(0, insertAt), ...dragged, ...rest.slice(insertAt)]);
    },
  });

  function confirmDelete(slide: Slide) {
    if (window.confirm(labels.confirmDelete(slide.title))) {
      void remove.run(slide.id);
    }
  }

  return (
    <Card title={labels.title}>
      <div className="grid gap-2">
        <FileTrigger
          acceptedFileTypes={ACCEPTED_SLIDE_TYPES}
          onSelect={(files) => {
            const file = files?.[0];
            if (file !== undefined) {
              void upload(file);
            }
          }}
        >
          <Button isDisabled={progress !== undefined}>{labels.add}</Button>
        </FileTrigger>
        <p className="text-sm text-text-muted">{labels.accepted}</p>
        {progress !== undefined && (
          <ProgressBar
            aria-label={progress.stage === 'converting' ? labels.converting : labels.uploading}
            {...(progress.stage === 'converting'
              ? { value: progress.done, maxValue: progress.total }
              : { isIndeterminate: true })}
            className="grid gap-1"
          >
            {({ percentage }) => (
              <>
                <span className="text-sm">
                  {progress.stage === 'converting' ? labels.converting : labels.uploading}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${String(percentage ?? 100)}%` }}
                  />
                </div>
              </>
            )}
          </ProgressBar>
        )}
      </div>

      <GridList
        aria-label={labels.title}
        items={slides}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => <p className="p-3 text-text-muted">{labels.empty}</p>}
        className="grid gap-2"
      >
        {(slide) => {
          const index = ids.indexOf(slide.id);
          const firstPage = slide.pages[0];
          return (
            <GridListItem
              id={slide.id}
              textValue={slide.title}
              className="grid gap-2 rounded-lg border border-border p-2 outline-none data-dragging:opacity-50 data-focus-visible:ring-3 data-focus-visible:ring-focus"
            >
              <div className="flex items-center gap-3">
                <Button slot="drag" variant="icon" aria-label={slide.title}>
                  ⠿
                </Button>
                {firstPage !== undefined && (
                  <img
                    src={slidePageUrl(slide.id, firstPage)}
                    alt=""
                    className="h-14 w-20 shrink-0 rounded bg-background object-contain"
                  />
                )}
                <div className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{slide.title}</span>
                  <span className="text-sm text-text-muted">
                    {labels.pages(slide.pages.length)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Toggle
                  label={labels.shown}
                  isSelected={slide.enabled}
                  onChange={(enabled) => void toggle.run(slide.id, enabled)}
                />
                <div className="flex gap-1">
                  <Button
                    variant="icon"
                    aria-label={labels.moveUp}
                    isDisabled={index === 0}
                    onPress={() => void reorder.run(moved(ids, index, index - 1))}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="icon"
                    aria-label={labels.moveDown}
                    isDisabled={index === ids.length - 1}
                    onPress={() => void reorder.run(moved(ids, index, index + 1))}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => {
                      confirmDelete(slide);
                    }}
                  >
                    {labels.delete}
                  </Button>
                </div>
              </div>
            </GridListItem>
          );
        }}
      </GridList>
    </Card>
  );
}
