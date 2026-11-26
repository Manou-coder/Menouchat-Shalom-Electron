import type { ReactNode } from 'react';

import { strings, type ZmanSnapshot } from '@menouchat/shared';

import { Slideshow } from '../../display/Slideshow.tsx';
import { useFitScale } from '../../display/use-fit-scale.ts';
import type { LayoutProps } from '../define-layout.tsx';
import { AnalogClock } from './AnalogClock.tsx';
import background from './assets/background.jpg';
import type { ClassicPortraitOptions } from './options.ts';
import './classic-portrait.css';

/** The v1 design surface; positions below are in its pixels, measured on the background. */
const WIDTH = 540;
const HEIGHT = 960;

const labels = strings.display;

function timeOf(zman: ZmanSnapshot | null): string {
  return zman?.time ?? labels.missingTime;
}

/** A label and its value on one line: label at the start (right), value at the end. */
function Row({
  label,
  value,
  labelClassName = '',
}: {
  label: string;
  value: string;
  labelClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={labelClassName}>{label}</span>
      <bdi className="classic-portrait-mantova tabular-nums">{value}</bdi>
    </div>
  );
}

/** A label above its value, for values too long to share a line. */
function Stacked({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center leading-tight">
      <div className="classic-portrait-decor text-[15px]">{label}</div>
      <div className="classic-portrait-mantova text-[19px]">{value}</div>
    </div>
  );
}

function Area({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`absolute flex flex-col ${className}`}>{children}</div>;
}

/** The v1 look: two prayer-time frames, side panels around a clock, a slideshow below. */
export function ClassicPortrait({ state, options }: LayoutProps<ClassicPortraitOptions>) {
  const scale = useFitScale(WIDTH, HEIGHT);
  const { schedule, dailyZmanim, shabbat, calendar } = state;

  return (
    <div className="flex h-dvh w-dvw items-center justify-center overflow-hidden bg-black">
      <div
        className="relative shrink-0 origin-center"
        style={{
          width: WIDTH,
          height: HEIGHT,
          scale: String(scale),
          backgroundImage: `url(${background})`,
          backgroundSize: '100% 100%',
        }}
      >
        <Area className="classic-portrait-mantova classic-portrait-on-parchment top-[222px] left-[56px] h-[160px] w-[148px] justify-around text-[19px]">
          <Row label={labels.shabbat.shirHashirim} value={schedule.shabbat.shirHashirim} />
          <Row label={labels.shabbat.minchaErev} value={schedule.shabbat.minchaErev} />
          <Row label={labels.shabbat.shacharit} value={schedule.shabbat.shacharit} />
          <Row label={labels.shabbat.mincha} value={schedule.shabbat.mincha} />
          <Row label={labels.shabbat.arvit} value={timeOf(shabbat.motzeiShabbatArvit)} />
        </Area>

        <Area className="classic-portrait-mantova classic-portrait-on-parchment top-[228px] left-[340px] h-[148px] w-[144px] justify-around text-[27px]">
          <Row label={labels.weekday.shacharit} value={schedule.weekday.shacharit} />
          <Row label={labels.weekday.mincha} value={schedule.weekday.mincha} />
          <Row label={labels.weekday.arvit} value={schedule.weekday.arvit} />
        </Area>

        <Area className="classic-portrait-on-wood top-[458px] left-[24px] h-[182px] w-[136px] justify-around">
          {options.showDafYomi && <Stacked label={labels.dafYomi} value={calendar.dafYomi} />}
          <Stacked label={labels.parasha} value={calendar.parasha} />
          <Stacked label={labels.candleLighting} value={timeOf(shabbat.candleLighting)} />
          <Stacked label={labels.rabbeinuTam} value={timeOf(shabbat.rabbeinuTam)} />
        </Area>

        <Area className="classic-portrait-on-wood top-[458px] left-[372px] h-[182px] w-[146px] justify-around text-[15px]">
          <div className="classic-portrait-mantova text-center text-[17px]">
            {calendar.hebrewDate}
          </div>
          {(Object.keys(labels.dailyZmanim) as (keyof typeof labels.dailyZmanim)[]).map((key) => (
            <Row
              key={key}
              label={labels.dailyZmanim[key]}
              value={timeOf(dailyZmanim[key])}
              labelClassName="classic-portrait-decor"
            />
          ))}
        </Area>

        {options.showClock && <AnalogClock timeZoneId={state.timeZoneId} />}

        {options.showSlideshow && (
          <div className="absolute top-[694px] left-[44px] h-[222px] w-[452px]">
            <Slideshow pages={state.slideshow.pages} intervalSec={state.slideshow.intervalSec} />
          </div>
        )}
      </div>
    </div>
  );
}
