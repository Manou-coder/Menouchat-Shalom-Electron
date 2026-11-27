// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { strings, type LibraryItem } from '@menouchat/shared';

import { ApiClientContext, type ApiClient } from '../../api/api-client.ts';
import { SlidesCard } from './SlidesCard.tsx';

const labels = strings.admin.slides;
const api = {} as unknown as ApiClient;

const picture: LibraryItem = {
  kind: 'file',
  id: '00000000-0000-4000-8000-000000000001',
  name: 'הלכה יומית',
  folder: 'library/00000000-0000-4000-8000-000000000001',
  original: null,
  image: 'page-1.jpg',
};

afterEach(cleanup);

describe('SlidesCard', () => {
  it('shows each slot with one switch, dimmed when hidden, and invites to fill empty ones', () => {
    render(
      <ApiClientContext value={api}>
        <SlidesCard
          slots={[{ slot: 1, itemId: picture.id, enabled: false }]}
          library={[picture]}
          slideIntervalSec={8}
        />
      </ApiClientContext>,
    );
    expect(screen.getByText('הלכה יומית')).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(4);
    expect(document.querySelector('img')?.className).toContain('grayscale');
    expect(screen.getAllByText(labels.add)).toHaveLength(3);
    expect(screen.getByRole('spinbutton')).toHaveProperty('value', '8');
  });
});
