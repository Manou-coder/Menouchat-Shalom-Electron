import { Copy, Ellipsis, FileUp, Palette, Pencil, Plus, Trash2, Type } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Button as AriaButton,
  FileTrigger,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';

import { strings, type LibraryItem, type Slot } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { ACCEPTED_SLIDE_TYPES } from '../../slides/convert-slide.ts';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { TextInput } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { formatSize } from './format-size.ts';
import type { TemplateItem } from './library.ts';
import { LibraryThumbnail } from './LibraryThumbnail.tsx';
import { SmallDialog } from './SmallDialog.tsx';
import { TemplateEditor } from './TemplateEditor.tsx';
import { useFileUpload } from './use-file-upload.ts';

const labels = strings.admin.library;

type Filter = 'all' | LibraryItem['kind'];
const FILTERS: readonly Filter[] = ['all', 'file', 'template'];

type Entry = LibraryItem & { sizeBytes: number };

/** What the editor is open on: a template to edit, an item to start from, or nothing. */
type Editing =
  { mode: 'edit'; item: TemplateItem } | { mode: 'from'; item: LibraryItem } | { mode: 'new' };

/** What a row's menu opened. */
type RowDialog = 'rename' | 'remove';

function MenuEntry({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-3">
      {icon}
      {children}
    </span>
  );
}

const menuItemClass =
  'flex min-h-11 cursor-pointer items-center rounded-lg px-3 outline-none data-focused:bg-accent-soft data-focused:text-accent';

function RenameDialog({ item, onClose }: { item: Entry; onClose: () => void }) {
  const api = useApiClient();
  const [name, setName] = useState(item.name);
  const rename = useAction(() => api.admin.library.rename.mutate({ itemId: item.id, name }));
  return (
    <SmallDialog title={labels.rename} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() !== '') {
            void rename.run().then((saved) => {
              if (saved) {
                onClose();
              }
            });
          }
        }}
      >
        <TextInput label={labels.name} value={name} onChange={setName} required maxLength={200} />
        <ErrorMessage message={rename.error} />
        <div className="flex gap-2">
          <Button type="submit" isDisabled={rename.pending}>
            {labels.save}
          </Button>
          <Button variant="secondary" onPress={onClose}>
            {labels.cancel}
          </Button>
        </div>
      </form>
    </SmallDialog>
  );
}

function RemoveDialog({
  item,
  onScreen,
  onClose,
}: {
  item: Entry;
  onScreen: boolean;
  onClose: () => void;
}) {
  const api = useApiClient();
  const remove = useAction(() => api.admin.library.remove.mutate({ itemId: item.id }));
  return (
    <SmallDialog title={labels.remove} onClose={onClose}>
      {onScreen ? (
        <>
          <p>{labels.cannotRemove}</p>
          <div>
            <Button variant="secondary" onPress={onClose}>
              {labels.close}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>{labels.confirmRemove(item.name)}</p>
          <ErrorMessage message={remove.error} />
          <div className="flex gap-2">
            <Button
              variant="danger"
              isDisabled={remove.pending}
              onPress={() => {
                void remove.run().then((removed) => {
                  if (removed) {
                    onClose();
                  }
                });
              }}
            >
              {labels.remove}
            </Button>
            <Button variant="secondary" onPress={onClose}>
              {labels.cancel}
            </Button>
          </div>
        </>
      )}
    </SmallDialog>
  );
}

/** One line of the library: its picture, name, kind and size, and a menu of actions. */
function LibraryRow({
  item,
  shownIn,
  onEdit,
}: {
  item: Entry;
  /** The slots showing this item, for information: slots are chosen in the pictures page. */
  shownIn: readonly number[];
  onEdit: (editing: Editing) => void;
}) {
  const api = useApiClient();
  const [dialog, setDialog] = useState<RowDialog>();
  const duplicate = useAction(() => api.admin.library.duplicate.mutate({ itemId: item.id }));

  function act(key: string) {
    switch (key) {
      case 'edit':
        if (item.kind === 'template') {
          onEdit({ mode: 'edit', item });
        }
        break;
      case 'from':
        onEdit({ mode: 'from', item });
        break;
      case 'duplicate':
        void duplicate.run();
        break;
      case 'rename':
      case 'remove':
        setDialog(key);
        break;
    }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="w-24 shrink-0 sm:w-32">
        <LibraryThumbnail item={item} />
      </div>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-medium" title={item.name}>
          <bdi>{item.name}</bdi>
        </span>
        <span className="text-sm text-text-muted">
          {labels.kinds[item.kind]} · <span dir="ltr">{formatSize(item.sizeBytes)}</span>
        </span>
        {shownIn.length > 0 && (
          <span className="text-sm text-accent">{labels.shownIn(shownIn.join(', '))}</span>
        )}
        <ErrorMessage message={duplicate.error} />
      </div>
      <MenuTrigger>
        <AriaButton
          aria-label={labels.actions(item.name)}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-border bg-surface text-text data-focus-visible:outline-3 data-focus-visible:outline-focus data-hovered:bg-background"
        >
          <Ellipsis aria-hidden className="size-5" />
        </AriaButton>
        <Popover
          placement="bottom end"
          className="min-w-48 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          <Menu
            className="outline-none"
            onAction={(key) => {
              act(String(key));
            }}
          >
            {item.kind === 'template' ? (
              <MenuItem id="edit" className={menuItemClass}>
                <MenuEntry icon={<Pencil aria-hidden className="size-4" />}>
                  {labels.edit}
                </MenuEntry>
              </MenuItem>
            ) : (
              <MenuItem id="from" className={menuItemClass}>
                <MenuEntry icon={<Palette aria-hidden className="size-4" />}>
                  {labels.makeTemplate}
                </MenuEntry>
              </MenuItem>
            )}
            {item.kind === 'template' && (
              <MenuItem id="duplicate" className={menuItemClass}>
                <MenuEntry icon={<Copy aria-hidden className="size-4" />}>
                  {labels.duplicate}
                </MenuEntry>
              </MenuItem>
            )}
            <MenuItem id="rename" className={menuItemClass}>
              <MenuEntry icon={<Type aria-hidden className="size-4" />}>{labels.rename}</MenuEntry>
            </MenuItem>
            <MenuItem id="remove" className={`${menuItemClass} text-danger`}>
              <MenuEntry icon={<Trash2 aria-hidden className="size-4" />}>
                {labels.remove}
              </MenuEntry>
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>

      {dialog === 'rename' && (
        <RenameDialog
          item={item}
          onClose={() => {
            setDialog(undefined);
          }}
        />
      )}
      {dialog === 'remove' && (
        <RemoveDialog
          item={item}
          onScreen={shownIn.length > 0}
          onClose={() => {
            setDialog(undefined);
          }}
        />
      )}
    </li>
  );
}

/**
 * Every file ever sent and every template, as a list. It manages them only; what the screen
 * shows is chosen in the pictures page.
 */
export function LibraryCard({
  library,
  slots,
}: {
  library: readonly Entry[];
  slots: readonly Slot[];
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Editing>();
  const { upload, busy, error } = useFileUpload();
  const total = library.reduce((sum, item) => sum + item.sizeBytes, 0);
  const shown = library.filter((item) => filter === 'all' || item.kind === filter);

  return (
    <Card title={labels.title}>
      <p className="-mt-2 text-sm text-text-muted">{labels.totalSize(formatSize(total))}</p>
      <div className="flex flex-wrap items-center gap-2">
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
        <ul className="divide-y divide-border/70">
          {shown.map((item) => (
            <LibraryRow
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
