// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDefaultSchedule, strings, type ScheduleInput } from '@menouchat/shared';

import { ApiClientContext, type ApiClient } from '../../api/api-client.ts';
import { ShabbatTimesCard, WeekdayTimesCard } from './ScheduleCards.tsx';

const labels = strings.admin.prayers;
const updateSchedule = vi.fn<(input: ScheduleInput) => Promise<void>>(() => Promise.resolve());
// Only the procedure the cards call is needed.
const api = { admin: { updateSchedule: { mutate: updateSchedule } } } as unknown as ApiClient;

const { weekday, shabbat } = createDefaultSchedule();
const schedule: ScheduleInput = { weekday, shabbat };

afterEach(() => {
  cleanup();
  updateSchedule.mockClear();
});

function renderWeekday() {
  return render(
    <ApiClientContext value={api}>
      <WeekdayTimesCard schedule={schedule} />
    </ApiClientContext>,
  );
}

function last<T>(items: T[]): T {
  const item = items.at(-1);
  if (item === undefined) throw new Error('Expected at least one item');
  return item;
}

const save = () => {
  const form = screen.getByRole('button', { name: strings.admin.save }).closest('form');
  if (form === null) throw new Error('Expected the card form');
  fireEvent.submit(form);
};

describe('prayer list cards', () => {
  it('lists the saved prayers with their names and times', () => {
    renderWeekday();
    const names = screen.getAllByRole('textbox', { name: labels.name });
    expect(names.map((input) => (input as HTMLInputElement).value)).toEqual([
      'שחרית',
      'מנחה',
      'ערבית',
    ]);
  });

  it('adds a prayer and saves only its own group', async () => {
    renderWeekday();
    fireEvent.click(screen.getByRole('button', { name: labels.add }));
    const names = screen.getAllByRole('textbox', { name: labels.name });
    fireEvent.change(last(names), { target: { value: 'ערבית ב׳' } });
    const times = screen.getAllByLabelText(new RegExp(`^${labels.time}`));
    fireEvent.change(last(times), { target: { value: '21:30' } });
    save();
    await waitFor(() => {
      expect(updateSchedule).toHaveBeenCalledOnce();
    });
    const sent = updateSchedule.mock.calls[0]?.[0];
    expect(sent?.shabbat).toEqual(shabbat);
    expect(sent?.weekday.at(-1)).toMatchObject({ name: 'ערבית ב׳', time: '21:30' });
  });

  it('removes a prayer', async () => {
    renderWeekday();
    fireEvent.click(screen.getByRole('button', { name: labels.remove('מנחה') }));
    save();
    await waitFor(() => {
      expect(updateSchedule).toHaveBeenCalledOnce();
    });
    expect(updateSchedule.mock.calls[0]?.[0].weekday.map((prayer) => prayer.name)).toEqual([
      'שחרית',
      'ערבית',
    ]);
  });

  it('offers a drag handle for each prayer', () => {
    renderWeekday();
    expect(screen.getByRole('button', { name: labels.move('ערבית') })).toBeTruthy();
  });

  it('stops adding at the limit', () => {
    renderWeekday();
    const add = screen.getByRole('button', { name: labels.add });
    for (let count = 0; count < 3; count++) {
      fireEvent.click(add);
    }
    expect(add.hasAttribute('disabled')).toBe(true);
  });

  it('explains that Arvit after Shabbat is computed', () => {
    render(
      <ApiClientContext value={api}>
        <ShabbatTimesCard schedule={schedule} />
      </ApiClientContext>,
    );
    expect(screen.getByText(strings.admin.shabbat.hint)).toBeTruthy();
  });
});
