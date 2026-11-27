// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { strings, type Slide, type Template } from '@menouchat/shared';

import { ApiClientContext, type ApiClient } from '../../api/api-client.ts';
import { TemplatesCard } from './TemplatesCard.tsx';

const labels = strings.admin.templates;
const useTemplate = vi.fn(() => Promise.resolve());
const remove = vi.fn(() => Promise.resolve());
const duplicate = vi.fn(() => Promise.resolve());
// Only the procedures the card calls are needed.
const api = {
  admin: {
    slides: { useTemplate: { mutate: useTemplate } },
    templates: { remove: { mutate: remove }, duplicate: { mutate: duplicate } },
  },
} as unknown as ApiClient;

const template: Template = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'מזל טוב',
  revision: '00000000-0000-4000-8000-000000000002',
  background: 'background.png',
  image: 'page-1.jpg',
  design: { texts: [] },
};

const shownInTwo: Slide = {
  id: '00000000-0000-4000-8000-000000000003',
  slot: 2,
  title: 'מזל טוב',
  originalFile: 'original.png',
  image: 'page-1.jpg',
  enabled: true,
  templateId: template.id,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard(templates: Template[] = [template], slides: Slide[] = [shownInTwo]) {
  return render(
    <ApiClientContext value={api}>
      <TemplatesCard templates={templates} slides={slides} />
    </ApiClientContext>,
  );
}

describe('TemplatesCard', () => {
  it('lists the templates and where each is shown', () => {
    renderCard();
    expect(screen.getByText('מזל טוב')).toBeTruthy();
    expect(screen.getByText(labels.shownIn('2'))).toBeTruthy();
  });

  it('says when there is no template yet', () => {
    renderCard([], []);
    expect(screen.getByText(labels.empty)).toBeTruthy();
  });

  it('shows a template in the slot picked', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.showInSlot(3) }));
    expect(useTemplate).toHaveBeenCalledWith({ slot: 3, templateId: template.id });
  });

  it('duplicates a template', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.duplicate }));
    expect(duplicate).toHaveBeenCalledWith({ templateId: template.id });
  });

  it('asks before deleting a template', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: labels.remove }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText(labels.confirmRemove)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: labels.remove }));
    expect(remove).toHaveBeenCalledWith({ templateId: template.id });
  });
});
