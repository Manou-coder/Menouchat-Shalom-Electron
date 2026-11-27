import { strings, type DayEventSnapshot } from '@menouchat/shared';

import { useFitFontSize } from './use-fit-font-size.ts';

export function dayEventText(event: DayEventSnapshot): string {
  return event.kind === 'omer' ? strings.display.events.omerTonight(event.dayText) : event.text;
}

/**
 * The day's events on one line, separated by dots, shrunk to `maxWidth` when there are many.
 * Renders nothing on a day without events.
 */
export function DayEventsLine({
  events,
  size,
  maxWidth,
  className,
}: {
  events: readonly DayEventSnapshot[];
  size: number;
  maxWidth: number;
  className: string;
}) {
  const text = events.map(dayEventText).join(' · ');
  const { ref, fontSize } = useFitFontSize<HTMLSpanElement>(text, size, maxWidth);
  if (text === '') {
    return null;
  }
  return (
    <span ref={ref} role="status" className={`whitespace-nowrap ${className}`} style={{ fontSize }}>
      {text}
    </span>
  );
}
