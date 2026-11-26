import { gematriya, HDate, Locale } from '@hebcal/core';

const HEBREW_WITHOUT_NIKUD = 'he-x-NoNikud';

/** A side of a daf: `a` (ע״א) or `b` (ע״ב). */
type Side = 'a' | 'b';

interface Tractate {
  /** @hebcal/core's name, so the Hebrew matches the daf yomi's. */
  name: string;
  first: readonly [daf: number, side: Side];
  last: readonly [daf: number, side: Side];
}

const t = (name: string, last: number, lastSide: Side, first = 2, firstSide: Side = 'a') =>
  ({ name, first: [first, firstSide], last: [last, lastSide] }) as const satisfies Tractate;

/**
 * Dirshu's Amud HaYomi: one amud a day, every day, through the Vilna Shas in the daf yomi's
 * order (with Shekalim). Last amudim are Sefaria's Vilna lengths (api/shape/Bavli); Shekalim,
 * Kinnim, Tamid and Middot follow the Vilna volume, as Sefaria has no Bavli text for them.
 * The cycle's dates check out against Dirshu's siyum on Yoma on 17 October 2026.
 */
const SHAS: readonly Tractate[] = [
  t('Berachot', 64, 'a'),
  t('Shabbat', 157, 'b'),
  t('Eruvin', 105, 'a'),
  t('Pesachim', 121, 'b'),
  t('Shekalim', 22, 'b'),
  t('Yoma', 88, 'a'),
  t('Sukkah', 56, 'b'),
  t('Beitzah', 40, 'b'),
  t('Rosh Hashana', 35, 'a'),
  t('Taanit', 31, 'a'),
  t('Megillah', 32, 'a'),
  t('Moed Katan', 29, 'a'),
  t('Chagigah', 27, 'a'),
  t('Yevamot', 122, 'b'),
  t('Ketubot', 112, 'b'),
  t('Nedarim', 91, 'b'),
  t('Nazir', 66, 'b'),
  t('Sotah', 49, 'b'),
  t('Gitin', 90, 'b'),
  t('Kiddushin', 82, 'b'),
  t('Baba Kamma', 119, 'b'),
  t('Baba Metzia', 119, 'a'),
  t('Baba Batra', 176, 'b'),
  t('Sanhedrin', 113, 'b'),
  t('Makkot', 24, 'b'),
  t('Shevuot', 49, 'b'),
  t('Avodah Zarah', 76, 'b'),
  t('Horayot', 14, 'a'),
  t('Zevachim', 120, 'b'),
  t('Menachot', 110, 'a'),
  t('Chullin', 142, 'a'),
  t('Bechorot', 61, 'a'),
  t('Arachin', 34, 'a'),
  t('Temurah', 34, 'a'),
  t('Keritot', 28, 'b'),
  t('Meilah', 22, 'a'),
  t('Kinnim', 25, 'a', 22, 'b'),
  t('Tamid', 33, 'b', 25, 'b'),
  t('Midot', 37, 'b', 34, 'a'),
  t('Niddah', 73, 'a'),
];

/** Amud index from 2a = 0, so a range's length is `index(last) - index(first) + 1`. */
const amudIndex = ([daf, side]: readonly [number, Side]) => (daf - 2) * 2 + (side === 'b' ? 1 : 0);

const lengths = SHAS.map((tractate) => amudIndex(tractate.last) - amudIndex(tractate.first) + 1);
/** Days in one cycle of the Shas. */
export const AMUD_YOMI_CYCLE_DAYS = lengths.reduce((sum, length) => sum + length, 0);

/** Berachot 2a was learnt on Rosh Chodesh Cheshvan 5784 (30 Tishrei, 15 October 2023). */
const CYCLE_START = new HDate(30, 'Tishrei', 5784).abs();

/**
 * In the usual notation, a point for side a and a colon for side b: e.g. `סוכה כא:`, or
 * `undefined` before the program began.
 */
export function amudYomi(date: HDate): string | undefined {
  const day = date.abs() - CYCLE_START;
  if (day < 0) {
    return undefined;
  }
  let position = day % AMUD_YOMI_CYCLE_DAYS;
  for (const [index, tractate] of SHAS.entries()) {
    const length = lengths[index] ?? 0;
    if (position < length) {
      const amud = amudIndex(tractate.first) + position;
      const daf = 2 + Math.floor(amud / 2);
      const side = amud % 2 === 0 ? '.' : ':';
      const number = gematriya(daf).replace(/[׳״]/g, '');
      return `${Locale.gettext(tractate.name, HEBREW_WITHOUT_NIKUD)} ${number}${side}`;
    }
    position -= length;
  }
  throw new Error(`Amud yomi position ${String(day)} is outside the Shas`);
}
