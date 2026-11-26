import { Check, LoaderCircle } from 'lucide-react';

import { strings } from '@menouchat/shared';

import { Button } from '../../components/Button.tsx';

/**
 * The Save button reports the save itself: a spinner while it runs, then "✓ saved" for a
 * moment (rather than a toast far from where the user looked).
 */
export function SaveButton({
  dirty,
  pending,
  done,
}: {
  dirty: boolean;
  pending: boolean;
  done: boolean;
}) {
  return (
    <Button type="submit" isDisabled={!dirty || pending} isPending={pending}>
      <span className="flex items-center gap-2" aria-live="polite">
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
        {!pending && done && <Check aria-hidden className="size-5" />}
        {pending ? strings.admin.saving : done ? strings.admin.saved : strings.admin.save}
      </span>
    </Button>
  );
}
