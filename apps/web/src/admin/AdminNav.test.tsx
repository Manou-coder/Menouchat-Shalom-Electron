// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { strings } from '@menouchat/shared';

import { AdminNav } from './AdminNav.tsx';
import { parseSection } from './sections.ts';

const labels = strings.admin.menu;

afterEach(cleanup);

function renderNav(path: string, updatePending = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminNav updatePending={updatePending} />
    </MemoryRouter>,
  );
}

describe('AdminNav', () => {
  it('links every section and marks the current one', () => {
    renderNav('/admin/slides');
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/times',
      '/admin/slides',
      '/admin/templates',
      '/admin/layout',
      '/admin/settings',
    ]);
    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe(labels.slides);
  });

  it('flags the settings section while an update waits', () => {
    renderNav('/admin/times', true);
    expect(screen.getByRole('link', { name: new RegExp(labels.updatePending) })).toBeTruthy();
  });
});

describe('parseSection', () => {
  it('accepts only known sections', () => {
    expect(parseSection('layout')).toBe('layout');
    expect(parseSection('unknown')).toBeUndefined();
    expect(parseSection(undefined)).toBeUndefined();
  });
});
