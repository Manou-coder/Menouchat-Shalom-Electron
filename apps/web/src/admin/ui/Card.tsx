import type { ReactNode, SubmitEvent } from 'react';

import { strings } from '@menouchat/shared';

import { useUnsavedWarning } from '../use-unsaved-warning.ts';
import { SaveButton } from './SaveButton.tsx';

interface CardProps {
  title: string;
  children: ReactNode;
}

/** One card per topic (plan §9). */
export function Card({ title, children }: CardProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm sm:gap-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** A failed request, shown in the card until the next attempt. */
export function ErrorMessage({ message }: { message: string | undefined }) {
  return message === undefined ? null : (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

interface FormCardProps extends CardProps {
  /** Something differs from the saved data: enables Save. */
  dirty: boolean;
  pending: boolean;
  done: boolean;
  error: string | undefined;
  onSave: () => void;
}

/** A card with one Save button, disabled until something changes (plan §9). */
export function FormCard({
  dirty,
  pending,
  done,
  error,
  onSave,
  children,
  ...card
}: FormCardProps) {
  useUnsavedWarning(dirty);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) {
      onSave();
    }
  }

  return (
    <Card {...card}>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 sm:gap-5">
        {children}
        <ErrorMessage message={error} />
        {/* Pinned to the bottom, so side-by-side cards line their Save buttons up. */}
        <div className="mt-auto flex flex-wrap items-center gap-3">
          <SaveButton dirty={dirty} pending={pending} done={done} />
          {dirty && !pending && (
            <span className="flex items-center gap-2 text-sm text-text-muted">
              <span aria-hidden className="size-2 rounded-full bg-focus" />
              {strings.admin.unsaved}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
