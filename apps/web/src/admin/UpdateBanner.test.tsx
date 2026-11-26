// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { strings } from '@menouchat/shared';

import { ApiClientContext, type ApiClient } from '../api/api-client.ts';
import { UpdateBanner } from './UpdateBanner.tsx';

const installUpdate = vi.fn(() => Promise.resolve());
// Only the procedure the banner calls is needed.
const api = { admin: { installUpdate: { mutate: installUpdate } } } as unknown as ApiClient;

afterEach(cleanup);

function renderBanner(update: Parameters<typeof UpdateBanner>[0]['update']) {
  return render(
    <ApiClientContext value={api}>
      <UpdateBanner update={update} />
    </ApiClientContext>,
  );
}

describe('UpdateBanner', () => {
  it('stays hidden when there is no new version', () => {
    const { container } = renderBanner({ status: 'none' });
    expect(container.textContent).toBe('');
  });

  it('says a version is downloading, without an install button', () => {
    renderBanner({ status: 'downloading', version: '2.0.1' });
    expect(screen.getByRole('status').textContent).toContain('2.0.1');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers to install a ready version at once', () => {
    renderBanner({ status: 'ready', version: '2.0.1' });
    fireEvent.click(screen.getByRole('button', { name: strings.admin.update.installNow }));
    expect(installUpdate).toHaveBeenCalledOnce();
  });
});
