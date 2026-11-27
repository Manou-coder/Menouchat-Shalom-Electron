// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { strings, type UpdateCheckResult, type UpdateStatus } from '@menouchat/shared';

import { ApiClientContext, type ApiClient } from '../../api/api-client.ts';
import { UpdateCard } from './UpdateCard.tsx';

const labels = strings.admin.update;
const installUpdate = vi.fn(() => Promise.resolve());
const checkForUpdate = vi.fn<() => Promise<UpdateCheckResult>>();
// Only the procedures the card calls are needed.
const api = {
  health: { query: () => Promise.resolve({ version: '2.0.4' }) },
  admin: {
    installUpdate: { mutate: installUpdate },
    checkForUpdate: { mutate: checkForUpdate },
  },
} as unknown as ApiClient;

afterEach(cleanup);

function renderCard(update: UpdateStatus) {
  return render(
    <ApiClientContext value={api}>
      <UpdateCard update={update} />
    </ApiClientContext>,
  );
}

describe('UpdateCard', () => {
  it('shows the installed version', async () => {
    renderCard({ status: 'none' });
    expect(await screen.findByText(labels.currentVersion('2.0.4'))).toBeTruthy();
  });

  it('checks on request and says the app is up to date', async () => {
    checkForUpdate.mockResolvedValueOnce({ result: 'upToDate' });
    renderCard({ status: 'none' });
    fireEvent.click(screen.getByRole('button', { name: labels.check }));
    expect(await screen.findByText(labels.upToDate)).toBeTruthy();
  });

  it('says when the check failed', async () => {
    checkForUpdate.mockResolvedValueOnce({ result: 'failed' });
    renderCard({ status: 'none' });
    fireEvent.click(screen.getByRole('button', { name: labels.check }));
    expect(await screen.findByText(labels.failed)).toBeTruthy();
  });

  it('says a version is downloading, without a button', () => {
    renderCard({ status: 'downloading', version: '2.0.5' });
    expect(screen.getByText(labels.downloading('2.0.5'))).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers to install a ready version at once', () => {
    renderCard({ status: 'ready', version: '2.0.5' });
    fireEvent.click(screen.getByRole('button', { name: labels.installNow }));
    expect(installUpdate).toHaveBeenCalledOnce();
  });
});
