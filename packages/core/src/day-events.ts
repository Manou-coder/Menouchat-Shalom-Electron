import { gematriya, HDate, HebrewCalendar, type Event } from '@hebcal/core';

import { toHebrewDate, type CivilDate } from './civil-date.ts';
import type { Location } from './location.ts';

const HEBREW_WITHOUT_NIKUD = 'he-x-NoNikud';

/**
 * What the display announces on a day. Hebcal's own Hebrew wording is kept for named
 * events, as for the parasha; the Omer count is a number the display words itself.
 */
export type DayEvent =
  /** Rosh Chodesh, and the Shabbat that blesses the coming month. */
  | { kind: 'roshChodesh'; text: string }
  /** Yamim tovim, chol hamoed, erev chag, minor holidays and fasts. */
  | { kind: 'holiday'; text: string }
  /** A day of Chanukah, with the candles lit that evening. */
  | { kind: 'chanukah'; text: string }
  /** The count said tonight, after nightfall: 1 to 49. */
  | { kind: 'omer'; day: number; dayText: string };

/**
 * Hebcal's event flags (`flags` in @hebcal/core 3.50.4). They are a const enum there, which
 * `verbatimModuleSyntax` cannot import, so the values are copied.
 */
const FLAGS = {
  CHAG: 1,
  ROSH_CHODESH: 128,
  MINOR_FAST: 256,
  MAJOR_FAST: 16384,
  SHABBAT_MEVARCHIM: 32768,
  MINOR_HOLIDAY: 524288,
  EREV: 1048576,
  CHOL_HAMOED: 2097152,
} as const;

/** Nisan in Hebcal's month numbering, a const enum too. */
const NISAN = 1;

const HOLIDAY_FLAGS =
  FLAGS.CHAG |
  FLAGS.CHOL_HAMOED |
  FLAGS.EREV |
  FLAGS.MINOR_HOLIDAY |
  FLAGS.MAJOR_FAST |
  FLAGS.MINOR_FAST;

type NamedEventKind = Exclude<DayEvent['kind'], 'omer'>;

function classify(event: Event): NamedEventKind | undefined {
  const mask = event.getFlags();
  if (event.getDesc().startsWith('Chanukah')) {
    return 'chanukah';
  }
  if ((mask & (FLAGS.ROSH_CHODESH | FLAGS.SHABBAT_MEVARCHIM)) !== 0) {
    return 'roshChodesh';
  }
  if ((mask & HOLIDAY_FLAGS) !== 0) {
    return 'holiday';
  }
  return undefined;
}

/** The Omer day counted on the night that ends `date`'s Hebrew day, if any. */
function omerTonight(date: HDate): number | undefined {
  const tonight = date.next();
  const first = new HDate(16, NISAN, tonight.getFullYear());
  const day = tonight.deltaDays(first) + 1;
  return day >= 1 && day <= 49 ? day : undefined;
}

/** The events of `date`, in Hebcal's order, then tonight's Omer count. */
export function computeDayEvents(date: CivilDate, location: Location): DayEvent[] {
  const hebrewDate = toHebrewDate(date);
  const events = // Typed as an array by Hebcal, but undefined on a day without any holiday.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (HebrewCalendar.getHolidaysOnDate(hebrewDate, location.inIsrael) ?? []).flatMap(
      (event): DayEvent[] => {
        const kind = classify(event);
        return kind === undefined ? [] : [{ kind, text: event.render(HEBREW_WITHOUT_NIKUD) }];
      },
    );
  const omer = omerTonight(hebrewDate);
  return omer === undefined
    ? events
    : [...events, { kind: 'omer', day: omer, dayText: gematriya(omer) }];
}
