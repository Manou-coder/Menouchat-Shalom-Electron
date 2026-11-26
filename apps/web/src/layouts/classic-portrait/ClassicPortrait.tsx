import { strings, type ZmanSnapshot } from '@menouchat/shared';

import { Slideshow } from '../../display/Slideshow.tsx';
import { useFitScale } from '../../display/use-fit-scale.ts';
import type { LayoutProps } from '../define-layout.tsx';
import { AnalogClock } from './AnalogClock.tsx';
import background from './assets/background.jpg';
import type { ClassicPortraitOptions } from './options.ts';
import {
  leftPanel,
  rightPanel,
  shabbat as shabbatPlacements,
  slideshow,
  SURFACE,
  weekday as weekdayPlacements,
  type Placement,
} from './placements.ts';
import './classic-portrait.css';

const labels = strings.display;

function timeOf(zman: ZmanSnapshot | null): string {
  return zman?.time ?? labels.missingTime;
}

/** The two styles of v1: dark bold text on the parchment frames, light text on the wood. */
type Style = 'frame' | 'frame-small' | 'frame-large' | 'panel';

const labelClasses: Record<Style, string> = {
  'frame-large': 'classic-portrait-frame text-[32px]',
  frame: 'classic-portrait-frame text-[28.8px]',
  'frame-small': 'classic-portrait-frame text-[22.464px]',
  panel: 'classic-portrait-panel classic-portrait-decor text-[21.6px]',
};

const valueClasses: Record<Style, string> = {
  ...labelClasses,
  panel: 'classic-portrait-panel classic-portrait-mantova text-[21.6px]',
};

function Entry({
  placement,
  label,
  value,
  style,
}: {
  placement: Placement;
  label: string;
  value: string;
  style: Style;
}) {
  return (
    <>
      <div
        className={`absolute whitespace-nowrap ${labelClasses[style]}`}
        style={{ top: placement.top, right: SURFACE.width - placement.labelRight }}
      >
        {label}
      </div>
      <div
        dir="ltr"
        className={`absolute whitespace-nowrap ${valueClasses[style]}`}
        style={{ top: placement.top, left: placement.valueLeft }}
      >
        {value}
      </div>
    </>
  );
}

/**
 * The v1 look, placed exactly where v1 put everything on the synagogue screen (see
 * placements.ts), and scaled to whatever screen it runs on.
 */
export function ClassicPortrait({ state, options }: LayoutProps<ClassicPortraitOptions>) {
  const scale = useFitScale(SURFACE.width, SURFACE.height);
  const { schedule, dailyZmanim, shabbat, calendar } = state;

  return (
    <div className="flex h-dvh w-dvw items-center justify-center overflow-hidden bg-black">
      <div
        className="relative shrink-0 leading-normal"
        style={{
          width: SURFACE.width,
          height: SURFACE.height,
          scale: String(scale),
          backgroundImage: `url(${background})`,
          backgroundSize: '100% 100%',
        }}
      >
        {(['shacharit', 'mincha', 'arvit'] as const).map((key) => (
          <Entry
            key={key}
            placement={weekdayPlacements[key]}
            label={labels.weekday[key]}
            value={schedule.weekday[key]}
            style="frame-large"
          />
        ))}

        <Entry
          placement={shabbatPlacements.shirHashirim}
          label={labels.shabbat.shirHashirim}
          value={schedule.shabbat.shirHashirim}
          style="frame-small"
        />
        {(['minchaErev', 'shacharit', 'mincha'] as const).map((key) => (
          <Entry
            key={key}
            placement={shabbatPlacements[key]}
            label={labels.shabbat[key]}
            value={schedule.shabbat[key]}
            style="frame"
          />
        ))}
        <Entry
          placement={shabbatPlacements.arvit}
          label={labels.shabbat.arvit}
          value={timeOf(shabbat.motzeiShabbatArvit)}
          style="frame"
        />

        {options.showDafYomi && (
          <Entry
            placement={leftPanel.dafYomi}
            label={labels.dafYomi}
            value={calendar.dafYomi}
            style="panel"
          />
        )}
        <Entry
          placement={leftPanel.parasha}
          label={labels.parasha}
          value={calendar.parasha}
          style="panel"
        />
        <Entry
          placement={leftPanel.candleLighting}
          label={labels.candleLighting}
          value={timeOf(shabbat.candleLighting)}
          style="panel"
        />
        <Entry
          placement={leftPanel.rabbeinuTam}
          label={labels.rabbeinuTam}
          value={timeOf(shabbat.rabbeinuTam)}
          style="panel"
        />

        <div
          className={`absolute whitespace-nowrap ${labelClasses.panel}`}
          style={{
            top: rightPanel.hebrewDate.top,
            right: SURFACE.width - rightPanel.hebrewDate.labelRight,
          }}
        >
          {calendar.hebrewDate}
        </div>
        {(Object.keys(labels.dailyZmanim) as (keyof typeof labels.dailyZmanim)[]).map((key) => (
          <Entry
            key={key}
            placement={rightPanel[key]}
            label={labels.dailyZmanim[key]}
            value={timeOf(dailyZmanim[key])}
            style="panel"
          />
        ))}

        {options.showClock && <AnalogClock timeZoneId={state.timeZoneId} />}

        {options.showSlideshow && (
          <div className="absolute" style={slideshow}>
            <Slideshow pages={state.slideshow.pages} intervalSec={state.slideshow.intervalSec} />
          </div>
        )}
      </div>
    </div>
  );
}
