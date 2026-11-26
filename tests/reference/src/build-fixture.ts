import { createRequire } from 'node:module';

import { DafYomi, gematriya, HDate, Locale, Sedra } from '@hebcal/core';
import { z } from 'zod';

import type { DayRecord, DisplayedTime, ReferenceFixture } from './fixture-schema.ts';
import { V1_TIME_ZONE } from './set-time-zone.ts';
import { createV1Runner, type V1Info, type V1Zmanim } from './v1-runner.ts';

const require = createRequire(import.meta.url);

/** Commit of `main` the files in `v1/` were copied from. */
const V1_COMMIT = '31850dda17cde18b4fc1aa9bf93fea1e5ca0e7d5';

/** Hard-coded in v1's `cities/zmanim.js`. */
const V1_LOCATION = {
  timeZoneId: V1_TIME_ZONE,
  latitude: 31.770707215675863,
  longitude: 35.18218638465854,
  elevation: 800,
};

/**
 * A leap year then a common year, each with both DST transitions and every holiday. 5787
 * alone would not exercise the parasha defect: it has the same structure as 5782.
 */
export const HEBREW_YEARS = [5787, 5788] as const;

/** The display re-read every value each second; noon is far from any date boundary. */
const CAPTURE_HOUR = 12;

const CANDLE_LIGHTING_OFFSET_MS = 40 * 60_000;
const ONE_MINUTE_MS = 60_000;

const kosherZmanimSchema = z.object({
  getZmanimJson: z.custom<(options: object) => unknown>((value) => typeof value === 'function'),
});
const complexZmanimSchema = z.object({ Zmanim: z.object({ Sunset: z.string() }) });

/** v1's `modifierHeure`: `toLocaleTimeString().substring(0, 5)` in the French UI locale. */
function displayed(instant: string | number): DisplayedTime {
  const date = new Date(instant);
  return {
    iso: typeof instant === 'string' ? instant : date.toISOString(),
    display: date.toLocaleTimeString('fr-FR', { timeZone: V1_TIME_ZONE }).substring(0, 5),
  };
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** v1's parasha with its display defect fixed: words joined with spaces, not commas. */
function correctedParasha(hebrewDate: HDate): string {
  // Same lookup as v1, whose hard-coded 5782 is harmless (plan §3.4).
  const words = new Sedra(5782, true).getString(hebrewDate, 'he-x-NoNikud').split(' ');
  words.shift();
  return words.join(' ');
}

/** v1's daf yomi with its display defect fixed: the tractate name in Hebrew, one space. */
function correctedDafYomi(day: Date): string {
  const daf = new DafYomi(day);
  return `${Locale.gettext(daf.getName(), 'he-x-NoNikud')} ${gematriya(daf.getBlatt())}`;
}

/** v1's candle lighting with the defect fixed: Friday's sunset instead of Saturday's. */
function correctedCandleLighting(day: Date): DisplayedTime {
  const kosherZmanim = kosherZmanimSchema.parse(require('kosher-zmanim'));
  const saturday = new HDate(day).onOrAfter(6).greg();
  const friday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() - 1);
  const zmanim = complexZmanimSchema.parse(
    kosherZmanim.getZmanimJson({ date: friday, ...V1_LOCATION, complexZmanim: true }),
  );
  return displayed(new Date(zmanim.Zmanim.Sunset).getTime() - CANDLE_LIGHTING_OFFSET_MS);
}

function toDayRecord(day: Date, zmanim: V1Zmanim, info: V1Info): DayRecord {
  const basic = zmanim.BasicZmanim;
  const shabbat = zmanim.HadlakAndTzais;
  return {
    date: isoDate(day),
    dailyZmanim: {
      alosHashachar: displayed(basic.AlosHashachar),
      seaLevelSunrise: displayed(basic.SeaLevelSunrise),
      sofZmanShmaMGA: displayed(basic.SofZmanShmaMGA),
      sofZmanShmaGRA: displayed(basic.SofZmanShmaGRA),
      chatzos: displayed(basic.Chatzos),
      sunset: displayed(basic.Sunset),
      tzais: displayed(basic.Tzais),
    },
    shabbat: {
      candleLighting: displayed(shabbat.hadlaka),
      motzeiShabbatArvit: displayed(new Date(shabbat.Tzais).getTime() + ONE_MINUTE_MS),
      rabbeinuTam: displayed(shabbat.Tzais16Point1Degrees),
    },
    calendar: {
      parasha: info.ParashatAshavua,
      dafYomi: info.DafYomiEvent.render,
      hebrewDate: info.HebrewDateEvent.render2,
    },
    correctedV1Bugs: {
      candleLighting: correctedCandleLighting(day),
      parasha: correctedParasha(new HDate(day)),
      dafYomi: correctedDafYomi(day),
    },
  };
}

/** Every civil day of the given consecutive Hebrew years, at noon Israel time. */
export function captureDays(firstYear: number, lastYear: number): Date[] {
  const first = new HDate(1, 'Tishrei', firstYear).greg();
  const next = new HDate(1, 'Tishrei', lastYear + 1).greg();
  const days: Date[] = [];
  for (
    let day = new Date(first.getFullYear(), first.getMonth(), first.getDate(), CAPTURE_HOUR);
    day < next;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, CAPTURE_HOUR)
  ) {
    days.push(day);
  }
  return days;
}

/** Builds the fixture for `days` (every captured day by default). */
export function buildFixture(
  days: readonly Date[] = captureDays(HEBREW_YEARS[0], HEBREW_YEARS[1]),
): ReferenceFixture {
  const [firstDay] = days;
  if (firstDay === undefined) {
    throw new Error('No days to capture');
  }
  // v1's outputs are captured first and everything else computed once the fake clock is
  // gone: @hebcal/core rejects dates created by a different Date constructor.
  const runner = createV1Runner(firstDay);
  let captures: { zmanim: V1Zmanim; info: V1Info }[];
  try {
    captures = days.map((day) => runner.capture(day));
  } finally {
    runner.dispose();
  }
  return {
    description:
      'Outputs of Menouchat Chalom v1, generated by tests/reference. Never edit by hand: run `pnpm --filter @menouchat/reference-tests generate`.',
    source: { v1Commit: V1_COMMIT, kosherZmanim: '0.8.2', hebcalCore: '3.50.4' },
    location: V1_LOCATION,
    hebrewYears: [...HEBREW_YEARS],
    days: days.map((day, index) => {
      const capture = captures[index];
      if (capture === undefined) {
        throw new Error(`Missing v1 capture for ${isoDate(day)}`);
      }
      return toDayRecord(day, capture.zmanim, capture.info);
    }),
  };
}
