import { Copy, FileUp, Palette, Pencil, Plus, Trash2, Type } from 'lucide-react';
import { useState } from 'react';
import { FileTrigger } from 'react-aria-components';

import { SLIDE_SLOTS, strings, type LibraryItem, type Slot } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { ACCEPTED_SLIDE_TYPES } from '../../slides/convert-slide.ts';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { TextInput } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { formatSize } from './format-size.ts';
import { LibraryThumbnail } from './LibraryThumbnail.tsx';
import { TemplateEditor } from './TemplateEditor.tsx';
import { useFileUpload } from './use-file-upload.ts';

const labels = strings.admin.library;

type Filter = 'all' | LibraryItem['kind'];
const FILTERS: readonly Filter[] = ['all', 'file', 'template'];

/** What the editor is open on: an item to edit or start from, or nothing for a blank one. */
type Editing =
  | { mode: 'edit'; item: Extract<LibraryItem, { kind: 'template' }> }
  | { mode: 'from'; item: LibraryItem }
  | { mode: 'new' };

function RenameForm({ item, onDone }: { item: LibraryItem; onDone: () => void }) {
  const api = useApiClient();
  const [name, setName] = useState(item.name);
  const rename = useAction(() => api.admin.library.rename.mutate({ itemId: item.id, name }));
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() !== '') {
          void rename.run().then((saved) => {
            if (saved) {
              onDone();
            }
          });
        }
      }}
    >
      <TextInput label={labels.name} value={name} onChange={setName} required maxLength={200} />
      <div className="flex gap-2">
        <Button type="submit" isDisabled={rename.pending}>
          {labels.save}
        </Button>
        <Button variant="secondary" onPress={onDone}>
          {labels.cancel}
        </Button>
      </div>
      <ErrorMessage message={rename.error} />
    </form>
  );
}

function LibraryEntry({
  item,
  shownIn,
  onEdit,
}: {
  item: LibraryItem & { sizeBytes: number };
  /** The slots showing this item. */
  shownIn: readonly number[];
  onEdit: (editing: Editing) => void;
}) {
  const api = useApiClient();
  const [mode, setMode] = useState<'idle' | 'rename' | 'confirm-remove' | 'cannot-remove'>('idle');
  const show = useAction((slot: Slot['slot']) =>
    api.admin.slides.show.mutate({ slot, itemId: item.id }),
  );
  const duplicate = useAction(() => api.admin.library.duplicate.mutate({ itemId: item.id }));
  const remove = useAction(() => api.admin.library.remove.mutate({ itemId: item.id }));
  const busy = show.pending || duplicate.pending || remove.pending;

  return (
    <li className="grid content-start gap-3 rounded-xl border border-border/70 bg-surface p-3">
      <LibraryThumbnail item={item} />
      {mode === 'rename' ? (
        <RenameForm
          item={item}
          onDone={() => {
            setMode('idle');
          }}
        />
      ) : (
        <div className="grid gap-0.5">
          <span className="truncate font-semibold" dir="auto" title={item.name}>
            {item.name}
          </span>
          <span className="text-sm text-text-muted">
            {labels.kinds[item.kind]} · <span dir="ltr">{formatSize(item.sizeBytes)}</span>
          </span>
          {shownIn.length > 0 && (
            <span className="text-sm text-accent">{labels.shownIn(shownIn.join(', '))}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">{labels.showIn}</span>
        <div className="flex gap-1">
          {SLIDE_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              aria-label={labels.showInSlot(slot)}
              aria-pressed={shownIn.includes(slot)}
              disabled={busy}
              onClick={() => void show.run(slot)}
              className="grid size-10 place-items-center rounded-lg border border-border bg-surface font-medium focus-visible:outline-3 focus-visible:outline-focus disabled:opacity-60 aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {mode === 'confirm-remove' ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{labels.confirmRemove}</span>
          <Button variant="danger" isDisabled={busy} onPress={() => void remove.run()}>
            {labels.remove}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              setMode('idle');
            }}
          >
            {labels.cancel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {item.kind === 'template' ? (
            <Button
              variant="secondary"
              isDisabled={busy}
              onPress={() => {
                onEdit({ mode: 'edit', item });
              }}
            >
              <span className="flex items-center gap-2">
                <Pencil aria-hidden className="size-4" />
                {labels.edit}
              </span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              isDisabled={busy}
              onPress={() => {
                onEdit({ mode: 'from', item });
              }}
            >
              <span className="flex items-center gap-2">
                <Palette aria-hidden className="size-4" />
                {labels.makeTemplate}
              </span>
            </Button>
          )}
          {item.kind === 'template' && (
            <Button variant="secondary" isDisabled={busy} onPress={() => void duplicate.run()}>
              <span className="flex items-center gap-2">
                <Copy aria-hidden className="size-4" />
                {labels.duplicate}
              </span>
            </Button>
          )}
          <Button
            variant="secondary"
            isDisabled={busy}
            onPress={() => {
              setMode('rename');
            }}
          >
            <span className="flex items-center gap-2">
              <Type aria-hidden className="size-4" />
              {labels.rename}
            </span>
          </Button>
          <Button
            variant="danger"
            isDisabled={busy}
            onPress={() => {
              setMode(shownIn.length > 0 ? 'cannot-remove' : 'confirm-remove');
            }}
          >
            <span className="flex items-center gap-2">
              <Trash2 aria-hidden className="size-4" />
              {labels.remove}
            </span>
          </Button>
        </div>
      )}
      {mode === 'cannot-remove' && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {labels.cannotRemove}
        </p>
      )}
      <ErrorMessage message={show.error ?? duplicate.error ?? remove.error} />
    </li>
  );
}

/** Every file ever sent and every template: show, edit, rename, duplicate, delete. */
export function LibraryCard({
  library,
  slots,
}: {
  library: readonly (LibraryItem & { sizeBytes: number })[];
  slots: readonly Slot[];
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Editing>();
  const { upload, busy, error } = useFileUpload();
  const total = library.reduce((sum, item) => sum + item.sizeBytes, 0);
  const shown = library.filter((item) => filter === 'all' || item.kind === filter);

  return (
    <Card title={labels.title}>
      <p className="-mt-2 text-sm text-text-muted">
        {labels.hint} <span dir="rtl">{labels.totalSize(formatSize(total))}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <FileTrigger
          acceptedFileTypes={ACCEPTED_SLIDE_TYPES}
          onSelect={(files) => {
            const file = files?.[0];
            if (file !== undefined) {
              void upload(file);
            }
          }}
        >
          <Button isDisabled={busy}>
            <span className="flex items-center gap-2">
              <FileUp aria-hidden className="size-5" />
              {busy ? strings.admin.slides.uploading : labels.upload}
            </span>
          </Button>
        </FileTrigger>
        <Button
          variant="secondary"
          onPress={() => {
            setEditing({ mode: 'new' });
          }}
        >
          <span className="flex items-center gap-2">
            <Plus aria-hidden className="size-5" />
            {labels.newTemplate}
          </span>
        </Button>
      </div>
      <ErrorMessage message={error} />

      <div role="group" aria-label={labels.title} className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => {
              setFilter(option);
            }}
            className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-3 focus-visible:outline-focus aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
          >
            {labels.filters[option]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-text-muted">{labels.empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((item) => (
            <LibraryEntry
              key={item.id}
              item={item}
              shownIn={slots.filter((slot) => slot.itemId === item.id).map((slot) => slot.slot)}
              onEdit={setEditing}
            />
          ))}
        </ul>
      )}

      {editing !== undefined && (
        <TemplateEditor
          {...(editing.mode === 'edit' ? { template: editing.item } : {})}
          {...(editing.mode === 'from' ? { startFrom: editing.item } : {})}
          library={library}
          onClose={() => {
            setEditing(undefined);
          }}
          onSaved={() => {
            setEditing(undefined);
          }}
        />
      )}
    </Card>
  );
}
