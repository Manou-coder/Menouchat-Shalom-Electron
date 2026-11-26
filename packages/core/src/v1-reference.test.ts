import { describe, expect, it } from 'vitest';

import {
  loadReferenceFixture,
  type DayRecord,
  type DisplayedTime,
} from '@menouchat/reference-tests';

import type { CivilDate } from './civil-date.ts';
import { computeDay, type DayZmanim } from './compute-day.ts';
import type { Zman } from './zman.ts';

const fixture = loadReferenceFixture();

// v1's settings: Jerusalem, Israel reading schedule, 40 minutes, Motzei Shabbat + 1 minute.
const location = { ...fixture.location, inIsrael: true };
const options = { candleLightingMinutes: 40, motzeiShabbatArvitOffsetMinutes: 1 };

function parseCivilDate(isoDate: string): CivilDate {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid date ${isoDate}`);
  }
  return { year, month, day };
}

/** v1's JSON had whole seconds; compare instants at that precision, and the displayed time exactly. */
function describeMismatch(actual: Zman | null, expected: DisplayedTime): string | null {
  if (actual === null) {
    return `null instead of ${expected.display}`;
  }
  const actualSeconds = Math.floor(actual.instant / 1000);
  const expectedSeconds = Math.floor(Date.parse(expected.iso) / 1000);
  if (actual.time !== expected.display || actualSeconds !== expectedSeconds) {
    return `${actual.time} (${new Date(actual.instant).toISOString()}) instead of ${expected.display} (${expected.iso})`;
  }
  return null;
}

const computed: [DayRecord, DayZmanim][] = fixture.days.map((record) => [
  record,
  computeDay(parseCivilDate(record.date), location, options),
]);

type TimeCheck = [
  name: string,
  actual: (day: DayZmanim) => Zman | null,
  expected: (record: DayRecord) => DisplayedTime,
];

const timeChecks: TimeCheck[] = [
  ['alosHashachar', (d) => d.dailyZmanim.alosHashachar, (r) => r.dailyZmanim.alosHashachar],
  ['seaLevelSunrise', (d) => d.dailyZmanim.seaLevelSunrise, (r) => r.dailyZmanim.seaLevelSunrise],
  ['sofZmanShmaMGA', (d) => d.dailyZmanim.sofZmanShmaMGA, (r) => r.dailyZmanim.sofZmanShmaMGA],
  ['sofZmanShmaGRA', (d) => d.dailyZmanim.sofZmanShmaGRA, (r) => r.dailyZmanim.sofZmanShmaGRA],
  ['chatzos', (d) => d.dailyZmanim.chatzos, (r) => r.dailyZmanim.chatzos],
  ['sunset', (d) => d.dailyZmanim.sunset, (r) => r.dailyZmanim.sunset],
  ['tzais', (d) => d.dailyZmanim.tzais, (r) => r.dailyZmanim.tzais],
  ['motzeiShabbatArvit', (d) => d.shabbat.motzeiShabbatArvit, (r) => r.shabbat.motzeiShabbatArvit],
  ['rabbeinuTam', (d) => d.shabbat.rabbeinuTam, (r) => r.shabbat.rabbeinuTam],
  // v1 bug fixed: Friday's sunset, not Saturday's.
  ['candleLighting', (d) => d.shabbat.candleLighting, (r) => r.correctedV1Bugs.candleLighting],
];

type TextCheck = [
  name: string,
  actual: (day: DayZmanim) => string,
  expected: (record: DayRecord) => string,
];

const textChecks: TextCheck[] = [
  ['hebrewDate', (d) => d.calendar.hebrewDate, (r) => r.calendar.hebrewDate],
  // v1 display defects fixed: spaces instead of commas, Hebrew tractate names.
  ['parasha', (d) => d.calendar.parasha, (r) => r.correctedV1Bugs.parasha],
  ['dafYomi', (d) => d.calendar.dafYomi, (r) => r.correctedV1Bugs.dafYomi],
];

describe(`v1 reference outputs (${String(fixture.days.length)} days)`, () => {
  it.each(timeChecks)('%s matches v1', (_name, actual, expected) => {
    const mismatches = computed.flatMap(([record, day]) => {
      const mismatch = describeMismatch(actual(day), expected(record));
      return mismatch === null ? [] : [`${record.date}: ${mismatch}`];
    });
    expect(mismatches).toEqual([]);
  });

  it.each(textChecks)('%s matches v1', (_name, actual, expected) => {
    const mismatches = computed.flatMap(([record, day]) =>
      actual(day) === expected(record)
        ? []
        : [`${record.date}: ${actual(day)} instead of ${expected(record)}`],
    );
    expect(mismatches).toEqual([]);
  });
});
