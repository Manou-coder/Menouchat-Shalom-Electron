import type { ReactNode, SubmitEvent } from 'react';

import { strings } from '@menouchat/shared';

import { Button } from '../../components/Button.tsx';

interface CardProps {
  title: string;
  children: ReactNode;
}

/** One card per topic (plan §9). */
export function Card({ title, children }: CardProps) {
  return (
    <section
      aria-label={title}
      className="grid content-start gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

interface FormCardProps extends CardProps {
  /** Something differs from the saved data: enables Save. */
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
}

/** A card with one Save button, disabled until something changes (plan §9). */
export function FormCard({ title, children, dirty, pending, onSave }: FormCardProps) {
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) {
      onSave();
    }
  }
  return (
    <Card title={title}>
      <form onSubmit={submit} className="grid gap-4" noValidate={false}>
        {children}
        <div>
          <Button type="submit" isDisabled={!dirty || pending}>
            {pending ? strings.admin.saving : strings.admin.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}
