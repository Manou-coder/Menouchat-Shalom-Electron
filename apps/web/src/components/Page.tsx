import type { ReactNode } from 'react';

export function Page({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
