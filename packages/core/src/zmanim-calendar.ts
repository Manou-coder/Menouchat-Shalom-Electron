import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';

import type { CivilDate } from './civil-date.ts';
import type { Location } from './location.ts';
import { startOfCivilDate } from './zman.ts';

export function createZmanimCalendar(date: CivilDate, location: Location): ComplexZmanimCalendar {
  const calendar = new ComplexZmanimCalendar(
    new GeoLocation(
      null,
      location.latitude,
      location.longitude,
      location.elevation,
      location.timeZoneId,
    ),
  );
  calendar.setDate(startOfCivilDate(date, location));
  return calendar;
}
