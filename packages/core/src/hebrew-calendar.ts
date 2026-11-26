import { DafYomi, gematriya, Locale, Sedra } from '@hebcal/core';

import { amudYomi } from './amud-yomi.ts';
import { toHebrewDate, type CivilDate } from './civil-date.ts';
import type { Location } from './location.ts';

const HEBREW_WITHOUT_NIKUD = 'he-x-NoNikud';

export interface HebrewCalendarInfo {
  /** e.g. `י״ז כסלו תשפ״ז`. */
  hebrewDate: string;
  /** Reading of the coming Shabbat, e.g. `חיי שרה`, `ויקהל-פקודי`, or the holiday read instead. */
  parasha: string;
  /** Tractate and page, e.g. `ערכין י׳`. */
  dafYomi: string;
  /** Dirshu's Amud HaYomi, e.g. `סוכה כא:`; `null` before the program began (2023). */
  amudYomi: string | null;
}

export function computeHebrewCalendarInfo(date: CivilDate, location: Location): HebrewCalendarInfo {
  const hebrewDate = toHebrewDate(date);
  const [first, second] = new Sedra(hebrewDate.getFullYear(), location.inIsrael).get(hebrewDate);
  if (first === undefined) {
    throw new Error(`No Torah reading found for ${hebrewDate.renderGematriya(true)}`);
  }
  // Same separator as @hebcal/core's Sedra.getString for this locale.
  const parasha = [first, second]
    .filter((name) => name !== undefined)
    .map((name) => Locale.gettext(name, HEBREW_WITHOUT_NIKUD))
    .join('-');
  const daf = new DafYomi(hebrewDate);
  return {
    hebrewDate: hebrewDate.renderGematriya(true),
    parasha,
    dafYomi: `${Locale.gettext(daf.getName(), HEBREW_WITHOUT_NIKUD)} ${gematriya(daf.getBlatt())}`,
    amudYomi: amudYomi(hebrewDate) ?? null,
  };
}
