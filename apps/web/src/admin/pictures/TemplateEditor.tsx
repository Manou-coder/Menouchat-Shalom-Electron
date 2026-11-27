import { lazy, Suspense } from 'react';

import type { LibraryItem } from '@menouchat/shared';

import type { TemplateItem } from './library.ts';

// Konva is heavy and only needed here: the screens and the rest of the admin load without it.
const TemplateEditorDialog = lazy(async () => {
  const module = await import('../slide-editor/SlideEditor.tsx');
  return { default: module.TemplateEditorDialog };
});

/** The template editor, loaded when first opened. */
export function TemplateEditor({
  template,
  startFrom,
  library,
  onClose,
  onSaved,
}: {
  /** The template to edit; a new one is made without it. */
  template?: TemplateItem;
  /** For a new template: the library item whose picture it starts on. */
  startFrom?: LibraryItem;
  library: readonly LibraryItem[];
  onClose: () => void;
  onSaved: (template: LibraryItem) => void;
}) {
  return (
    <Suspense>
      <TemplateEditorDialog
        template={template}
        startFrom={startFrom}
        library={library}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
      />
    </Suspense>
  );
}
