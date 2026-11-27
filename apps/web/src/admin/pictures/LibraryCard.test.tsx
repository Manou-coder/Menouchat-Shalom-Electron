// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { strings, type LibraryItem, type Slot } from '@menouchat/shared';

import { ApiClientContext, type ApiClient } from '../../api/api-client.ts';
import { LibraryCard } from './LibraryCard.tsx';

const labels = strings.admin.library;
const remove = vi.fn(() => Promise.resolve());
// Only the procedures the card calls are needed.
const api = {
  admin: {
    library: { remove: { mutate: remove } },
  },
} as unknown as ApiClient;

const file: LibraryItem & { sizeBytes: number } = {
  kind: 'file',
  id: '00000000-0000-4000-8000-000000000001',
  name: 'הלכה יומית',
  folder: 'library/00000000-0000-4000-8000-000000000001',
  original: 'original.pdf',
  image: 'page-1.jpg',
  sizeBytes: 2 * 1024 * 1024,
};

const template: LibraryItem & { sizeBytes: number } = {
  kind: 'template',
  id: '00000000-0000-4000-8000-000000000002',
  name: 'מזל טוב',
  folder: 'library/00000000-0000-4000-8000-000000000002/rev',
  background: 'background.png',
  image: 'page-1.jpg',
  design: { texts: [] },
  sizeBytes: 1024 * 1024,
};

const slots: Slot[] = [{ slot: 2, itemId: template.id, enabled: true }];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard() {
  return render(
    <ApiClientContext value={api}>
      <LibraryCard library={[template, file]} slots={slots} />
    </ApiClientContext>,
  );
}

describe('LibraryCard', () => {
  it('lists files and templates, with their size and the room taken in all', () => {
    renderCard();
    expect(screen.getByText('הלכה יומית')).toBeTruthy();
    expect(screen.getByText('מזל טוב')).toBeTruthy();
    expect(screen.getByText(labels.totalSize('3.0 מ״ב'))).toBeTruthy();
    expect(screen.getByText(labels.shownIn('2'))).toBeTruthy();
  });

  it('filters by kind', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.filters.template }));
    expect(screen.queryByText('הלכה יומית')).toBeNull();
    expect(screen.getByText('מזל טוב')).toBeTruthy();
  });

  it('has no slot buttons: what the screen shows is chosen in the pictures page', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /משבצת/ })).toBeNull();
  });

  it('opens a menu of actions for each item', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.actions('מזל טוב') }));
    expect(screen.getByRole('menuitem', { name: labels.edit })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: labels.duplicate })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: labels.remove })).toBeTruthy();
  });

  it('refuses to delete what the screen shows, and asks before deleting the rest', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.actions('מזל טוב') }));
    fireEvent.click(screen.getByRole('menuitem', { name: labels.remove }));
    expect(screen.getByText(labels.cannotRemove)).toBeTruthy();
    cleanup();
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.actions('הלכה יומית') }));
    fireEvent.click(screen.getByRole('menuitem', { name: labels.remove }));
    expect(screen.getByText(labels.confirmRemove('הלכה יומית'))).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();
  });
});
