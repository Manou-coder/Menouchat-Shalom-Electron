import type { CivilDate } from './civil-date.ts';
import type { Location } from './location.ts';
import { toZman, type Zman } from './zman.ts';
import { createZmanimCalendar } from './zmanim-calendar.ts';

/** The day's zmanim shown on the display. `null` when the sun never reaches the angle. */
export interface DailyZmanim {
  /** Dawn, sun 16.1° below the horizon. */
  alosHashachar: Zman | null;
  seaLevelSunrise: Zman | null;
  sofZmanShmaMGA: Zman | null;
  sofZmanShmaGRA: Zman | null;
  chatzos: Zman | null;
  /** Elevation-adjusted sunset. */
  sunset: Zman | null;
  /** Nightfall, sun 8.5° below the horizon. */
  tzais: Zman | null;
}

export function computeDailyZmanim(date: CivilDate, location: Location): DailyZmanim {
  const calendar = createZmanimCalendar(date, location);
  return {
    alosHashachar: toZman(calendar.getAlosHashachar(), location),
    seaLevelSunrise: toZman(calendar.getSeaLevelSunrise(), location),
    sofZmanShmaMGA: toZman(calendar.getSofZmanShmaMGA(), location),
    sofZmanShmaGRA: toZman(calendar.getSofZmanShmaGRA(), location),
    chatzos: toZman(calendar.getChatzos(), location),
    sunset: toZman(calendar.getSunset(), location),
    tzais: toZman(calendar.getTzais(), location),
  };
}
