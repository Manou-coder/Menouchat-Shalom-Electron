import { lazy, Suspense } from 'react';

import type { Template } from '@menouchat/shared';

// Konva is heavy and only needed here: the screens and the rest of the admin load without it.
const TemplateEditorDialog = lazy(async () => {
  const module = await import('../slide-editor/SlideEditor.tsx');
  return { default: module.TemplateEditorDialog };
});

/** The template editor, loaded when first opened. */
export function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: Template | undefined;
  onClose: () => void;
  onSaved: (template: Template) => void;
}) {
  return (
    <Suspense>
      <TemplateEditorDialog template={template} isOpen onClose={onClose} onSaved={onSaved} />
    </Suspense>
  );
}
