import { describe, expect, it } from 'vitest';

import { formatTimeOfDay, InvalidTimeOfDayError, parseTimeOfDay } from './time-of-day.ts';

describe('parseTimeOfDay', () => {
  it.each([
    ['00:00', 0],
    ['06:45', 405],
    ['23:59', 1439],
  ])('parses %s as %i minutes', (text, minutes) => {
    expect(parseTimeOfDay(text)).toBe(minutes);
  });

  it.each(['', '7:30', '24:00', '12:60', '12:3', ' 12:30', '12:30:00'])('rejects %j', (text) => {
    expect(() => parseTimeOfDay(text)).toThrow(InvalidTimeOfDayError);
  });
});

describe('formatTimeOfDay', () => {
  it.each([
    [0, '00:00'],
    [405, '06:45'],
    [1439, '23:59'],
    [1440, '00:00'],
    [1441, '00:01'],
    [-1, '23:59'],
  ])('formats %i as %s', (minutes, text) => {
    expect(formatTimeOfDay(minutes)).toBe(text);
  });

  it('rejects fractional minutes', () => {
    expect(() => formatTimeOfDay(1.5)).toThrow(RangeError);
  });

  it('round-trips with parseTimeOfDay', () => {
    expect(formatTimeOfDay(parseTimeOfDay('18:07'))).toBe('18:07');
  });
});
