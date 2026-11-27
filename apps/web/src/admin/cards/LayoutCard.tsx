import { Check, LoaderCircle } from 'lucide-react';
import { Label, RadioButton, RadioField, RadioGroup } from 'react-aria-components';

import { LAYOUT_IDS, layoutIdSchema, strings, type LayoutId } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import blueGoldPreview from '../assets/theme-blue-gold.jpg';
import classicNewPreview from '../assets/theme-classic-new.jpg';
import classicPreview from '../assets/theme-classic-portrait.jpg';
import { ErrorMessage } from '../ui/Card.tsx';
import { useAction } from '../use-action.ts';

const labels = strings.admin.layout;

const previews: Record<LayoutId, string> = {
  'classic-portrait': classicPreview,
  'classic-new': classicNewPreview,
  'blue-gold': blueGoldPreview,
};

/**
 * The look of the synagogue screen. Picking a theme saves it at once and the screen
 * follows, like the slide toggles: there is nothing else to fill in.
 */
export function LayoutCard({ layoutId }: { layoutId: string }) {
  const api = useApiClient();
  const save = useAction((next: LayoutId) => api.admin.setLayout.mutate({ layoutId: next }));

  return (
    <section
      aria-labelledby="layout-card-title"
      className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm sm:gap-5 sm:p-6"
    >
      <RadioGroup
        value={layoutId}
        isDisabled={save.pending}
        onChange={(value) => {
          const parsed = layoutIdSchema.safeParse(value);
          if (parsed.success && parsed.data !== layoutId) {
            void save.run(parsed.data);
          }
        }}
        className="grid gap-3 sm:gap-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Label id="layout-card-title" className="text-lg font-semibold">
            {labels.title}
          </Label>
          <span className="flex items-center gap-1 text-sm text-text-muted" aria-live="polite">
            {save.pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
            {save.pending
              ? strings.admin.saving
              : save.done && (
                  <>
                    <Check aria-hidden className="size-4" />
                    {strings.admin.saved}
                  </>
                )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {LAYOUT_IDS.map((id) => (
            <RadioField key={id} value={id}>
              <RadioButton className="group grid cursor-pointer gap-2 rounded-xl border-2 border-border/70 p-2 text-center font-medium transition-colors data-disabled:cursor-wait data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-focus data-hovered:border-accent/60 data-selected:border-accent data-selected:bg-accent-soft">
                <img
                  src={previews[id]}
                  alt=""
                  className="aspect-[9/16] w-full rounded-lg object-cover shadow-sm"
                />
                <span className="flex items-center justify-center gap-1">
                  <Check
                    aria-hidden
                    className="hidden size-4 text-accent group-data-selected:block"
                  />
                  {labels.names[id]}
                </span>
              </RadioButton>
            </RadioField>
          ))}
        </div>
      </RadioGroup>
      <ErrorMessage message={save.error} />
    </section>
  );
}
