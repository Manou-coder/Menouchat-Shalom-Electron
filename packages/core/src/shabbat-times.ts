import { fromHebrewDate, toHebrewDate, type CivilDate } from './civil-date.ts';
import type { Location } from './location.ts';
import { toZman, type Zman } from './zman.ts';
import { createZmanimCalendar } from './zmanim-calendar.ts';

const SATURDAY = 6;

export interface ShabbatTimesOptions {
  /** Minutes before Friday's sunset (40 in Jerusalem). */
  candleLightingMinutes: number;
  /** Minutes after Saturday's tzais for the Motzei Shabbat arvit (1 in v1). */
  motzeiShabbatArvitOffsetMinutes: number;
}

/** Times of the coming Shabbat: today's when today is Saturday. */
export interface ShabbatTimes {
  /** The Saturday these times belong to. */
  date: CivilDate;
  /** Friday's sunset minus `candleLightingMinutes` (v1 wrongly used Saturday's sunset). */
  candleLighting: Zman | null;
  motzeiShabbatArvit: Zman | null;
  /** Saturday's tzais at 16.1°. */
  rabbeinuTam: Zman | null;
}

export function computeShabbatTimes(
  date: CivilDate,
  location: Location,
  options: ShabbatTimesOptions,
): ShabbatTimes {
  const saturday = toHebrewDate(date).onOrAfter(SATURDAY);
  const saturdayDate = fromHebrewDate(saturday);
  const fridayCalendar = createZmanimCalendar(fromHebrewDate(saturday.prev()), location);
  const saturdayCalendar = createZmanimCalendar(saturdayDate, location);
  return {
    date: saturdayDate,
    candleLighting: toZman(fridayCalendar.getSunset(), location, -options.candleLightingMinutes),
    motzeiShabbatArvit: toZman(
      saturdayCalendar.getTzais(),
      location,
      options.motzeiShabbatArvitOffsetMinutes,
    ),
    rabbeinuTam: toZman(saturdayCalendar.getTzais16Point1Degrees(), location),
  };
}
