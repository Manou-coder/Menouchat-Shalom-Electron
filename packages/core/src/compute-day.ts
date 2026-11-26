import type { CivilDate } from './civil-date.ts';
import { computeDailyZmanim, type DailyZmanim } from './daily-zmanim.ts';
import { computeHebrewCalendarInfo, type HebrewCalendarInfo } from './hebrew-calendar.ts';
import type { Location } from './location.ts';
import {
  computeShabbatTimes,
  type ShabbatTimes,
  type ShabbatTimesOptions,
} from './shabbat-times.ts';

/** Everything the display shows for one day, apart from the times the user enters. */
export interface DayZmanim {
  date: CivilDate;
  dailyZmanim: DailyZmanim;
  shabbat: ShabbatTimes;
  calendar: HebrewCalendarInfo;
}

export function computeDay(
  date: CivilDate,
  location: Location,
  options: ShabbatTimesOptions,
): DayZmanim {
  return {
    date,
    dailyZmanim: computeDailyZmanim(date, location),
    shabbat: computeShabbatTimes(date, location, options),
    calendar: computeHebrewCalendarInfo(date, location),
  };
}
