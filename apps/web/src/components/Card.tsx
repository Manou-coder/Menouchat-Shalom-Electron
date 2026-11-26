import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="grid justify-items-start gap-4 rounded-xl border border-border bg-surface p-5">
      {children}
    </section>
  );
}
