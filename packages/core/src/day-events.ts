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

/**
 * Minor days Hebcal lists that the synagogue does not mark (owner's choice), by Hebcal's
 * English name; Yom Kippur Katan carries the month after it.
 */
const LEFT_OUT = [
  'Chag HaBanot',
  'Yom Kippur Katan',
  'Rosh Hashana LaBehemot',
  'Leil Selichot',
  'Purim Katan',
  'Shushan Purim Katan',
];

const isLeftOut = (event: Event) => {
  const name = event.getDesc();
  return LEFT_OUT.some((left) => name === left || name.startsWith(`${left} `));
};

/** Display order: the month first, then the day's holidays, Chanukah, and the Omer. */
const ORDER: Record<DayEvent['kind'], number> = {
  roshChodesh: 0,
  holiday: 1,
  chanukah: 2,
  omer: 3,
};

function classify(event: Event): NamedEventKind | undefined {
  if (isLeftOut(event)) {
    return undefined;
  }
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

/** The events of `date`, Rosh Chodesh first and tonight's Omer count last. */
export function computeDayEvents(date: CivilDate, location: Location): DayEvent[] {
  const hebrewDate = toHebrewDate(date);
  const events = // Typed as an array by Hebcal, but undefined on a day without any holiday.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (HebrewCalendar.getHolidaysOnDate(hebrewDate, location.inIsrael) ?? []).flatMap(
      (event): DayEvent[] => {
        const kind = classify(event);
        // Hebcal writes Rosh Hashana's first day with the year in digits ("ראש השנה 5787").
        const text = event.render(HEBREW_WITHOUT_NIKUD).replace(/ \d+$/, '');
        return kind === undefined ? [] : [{ kind, text }];
      },
    );
  const omer = omerTonight(hebrewDate);
  const all: DayEvent[] =
    omer === undefined
      ? events
      : [...events, { kind: 'omer', day: omer, dayText: gematriya(omer) }];
  // A stable sort: events of one kind keep Hebcal's order.
  return all.toSorted((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}
