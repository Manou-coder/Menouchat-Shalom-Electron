// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DayEventsLine, dayEventText } from './DayEventsLine.tsx';

beforeAll(() => {
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
});

afterEach(cleanup);

describe('DayEventsLine', () => {
  it("joins the day's events on one line, the Omer worded for tonight", () => {
    render(
      <DayEventsLine
        events={[
          { kind: 'holiday', text: 'פסח ד׳ (חוה״מ)' },
          { kind: 'omer', day: 4, dayText: 'ד׳' },
        ]}
        size={24}
        maxWidth={600}
        className=""
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(
      'פסח ד׳ (חוה״מ) · ספירת העומר הלילה: ד׳ לעומר',
    );
  });

  it('renders nothing on a day without events', () => {
    const { container } = render(
      <DayEventsLine events={[]} size={24} maxWidth={600} className="" />,
    );
    expect(container.textContent).toBe('');
  });

  it('keeps named events as Hebcal words them', () => {
    expect(dayEventText({ kind: 'roshChodesh', text: 'ראש חודש טבת' })).toBe('ראש חודש טבת');
  });
});
