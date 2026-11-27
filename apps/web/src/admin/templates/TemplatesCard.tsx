import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { SLIDE_SLOTS, strings, type Slide, type Template } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { useAction } from '../use-action.ts';
import { TemplateEditor } from './TemplateEditor.tsx';
import { TemplateThumbnail } from './TemplateThumbnail.tsx';

const labels = strings.admin.templates;

function TemplateItem({
  template,
  shownIn,
  onEdit,
}: {
  template: Template;
  /** The slots showing this template. */
  shownIn: readonly number[];
  onEdit: () => void;
}) {
  const api = useApiClient();
  const [confirming, setConfirming] = useState(false);
  const duplicate = useAction(() =>
    api.admin.templates.duplicate.mutate({ templateId: template.id }),
  );
  const remove = useAction(() => api.admin.templates.remove.mutate({ templateId: template.id }));
  const show = useAction((slot: Slide['slot']) =>
    api.admin.slides.useTemplate.mutate({ slot, templateId: template.id }),
  );
  const busy = duplicate.pending || remove.pending || show.pending;

  return (
    <li className="grid content-start gap-3 rounded-xl border border-border/70 p-3">
      <TemplateThumbnail template={template} />
      <div className="grid gap-0.5">
        <span className="truncate font-semibold" dir="auto" title={template.name}>
          {template.name}
        </span>
        {shownIn.length > 0 && (
          <span className="text-sm text-accent">{labels.shownIn(shownIn.join(', '))}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">{labels.showIn}</span>
        {SLIDE_SLOTS.map((slot) => (
          <Button
            key={slot}
            variant="icon"
            aria-label={labels.showInSlot(slot)}
            isDisabled={busy}
            onPress={() => void show.run(slot)}
          >
            <span className={shownIn.includes(slot) ? 'font-bold text-accent' : ''}>{slot}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {confirming ? (
          <>
            <span className="self-center text-sm">{labels.confirmRemove}</span>
            <Button variant="danger" isDisabled={busy} onPress={() => void remove.run()}>
              {labels.remove}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setConfirming(false);
              }}
            >
              {labels.cancel}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" isDisabled={busy} onPress={onEdit}>
              <span className="flex items-center gap-2">
                <Pencil aria-hidden className="size-4" />
                {labels.edit}
              </span>
            </Button>
            <Button variant="secondary" isDisabled={busy} onPress={() => void duplicate.run()}>
              <span className="flex items-center gap-2">
                <Copy aria-hidden className="size-4" />
                {labels.duplicate}
              </span>
            </Button>
            <Button
              variant="danger"
              isDisabled={busy}
              onPress={() => {
                setConfirming(true);
              }}
            >
              <span className="flex items-center gap-2">
                <Trash2 aria-hidden className="size-4" />
                {labels.remove}
              </span>
            </Button>
          </>
        )}
      </div>
      <ErrorMessage message={duplicate.error ?? remove.error ?? show.error} />
    </li>
  );
}

/** Every template: create, edit, duplicate, delete, and show one in a slot. */
export function TemplatesCard({
  templates,
  slides,
}: {
  templates: readonly Template[];
  slides: readonly Slide[];
}) {
  // `null` while closed; `undefined` for a new template.
  const [editing, setEditing] = useState<Template | undefined | null>(null);

  return (
    <Card title={labels.title}>
      <p className="-mt-2 text-sm text-text-muted">{labels.hint}</p>
      <div>
        <Button
          onPress={() => {
            setEditing(undefined);
          }}
        >
          <span className="flex items-center gap-2">
            <Plus aria-hidden className="size-5" />
            {labels.create}
          </span>
        </Button>
      </div>
      {templates.length === 0 ? (
        <p className="text-text-muted">{labels.empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <TemplateItem
              key={template.id}
              template={template}
              shownIn={slides
                .filter((slide) => slide.templateId === template.id)
                .map((slide) => slide.slot)}
              onEdit={() => {
                setEditing(template);
              }}
            />
          ))}
        </ul>
      )}
      {editing !== null && (
        <TemplateEditor
          template={editing}
          onClose={() => {
            setEditing(null);
          }}
          onSaved={() => {
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}
