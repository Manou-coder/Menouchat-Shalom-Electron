import { Plus } from 'lucide-react';

import { strings, type LibraryItem } from '@menouchat/shared';

import { Button } from '../../components/Button.tsx';
import { LibraryThumbnail } from './LibraryThumbnail.tsx';

const labels = strings.admin.library;

/** The library as a grid to pick from, optionally with a button to start a new template. */
export function LibraryPicker({
  library,
  onPick,
  onNewTemplate,
}: {
  library: readonly LibraryItem[];
  onPick: (item: LibraryItem) => void;
  onNewTemplate?: () => void;
}) {
  return (
    <div className="grid gap-4">
      {onNewTemplate !== undefined && (
        <div>
          <Button variant="secondary" onPress={onNewTemplate}>
            <span className="flex items-center gap-2">
              <Plus aria-hidden className="size-5" />
              {labels.newTemplate}
            </span>
          </Button>
        </div>
      )}
      {library.length === 0 ? (
        <p className="text-text-muted">{labels.empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {library.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(item);
                }}
                className="grid w-full gap-1 rounded-xl border border-border/70 bg-surface p-2 text-start hover:border-accent focus-visible:outline-3 focus-visible:outline-focus"
              >
                <LibraryThumbnail item={item} />
                <span className="truncate text-sm font-medium" dir="auto">
                  {item.name}
                </span>
                <span className="text-xs text-text-muted">{labels.kinds[item.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
