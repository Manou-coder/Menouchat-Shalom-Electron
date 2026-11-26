import { useEffect, useMemo, useState } from 'react';

export interface ClockReading {
  hours: number;
  minutes: number;
  seconds: number;
}

const TICK_MS = 1_000;

/** The current time in `timeZoneId`, ticking every second. */
export function useClock(timeZoneId: string): ClockReading {
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZoneId,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23',
      }),
    [timeZoneId],
  );
  const read = () => readClock(format, Date.now());
  const [reading, setReading] = useState(read);

  useEffect(() => {
    const timer = setInterval(() => {
      setReading(readClock(format, Date.now()));
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [format]);

  return reading;
}

export function readClock(format: Intl.DateTimeFormat, instant: number): ClockReading {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(format.formatToParts(instant).find((p) => p.type === type)?.value ?? 0);
  return { hours: part('hour'), minutes: part('minute'), seconds: part('second') };
}

/** Clockwise angles from 12 o'clock, in degrees, for continuously moving hands. */
export function handAngles({ hours, minutes, seconds }: ClockReading): {
  hour: number;
  minute: number;
} {
  const minuteFraction = minutes + seconds / 60;
  return { hour: ((hours % 12) + minuteFraction / 60) * 30, minute: minuteFraction * 6 };
}
