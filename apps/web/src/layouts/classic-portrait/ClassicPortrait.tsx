import { strings, type ZmanSnapshot } from '@menouchat/shared';

import { Slideshow } from '../../display/Slideshow.tsx';
import { useFitFontSize } from '../../display/use-fit-font-size.ts';
import { useFitScale } from '../../display/use-fit-scale.ts';
import type { LayoutProps } from '../define-layout.tsx';
import { AnalogClock } from './AnalogClock.tsx';
import background from './assets/background.jpg';
import type { ClassicPortraitOptions } from './options.ts';
import {
  frameRows,
  leftPanel,
  rightPanel,
  shabbatFrame,
  slideshow,
  SURFACE,
  weekdayFrame,
  type FrameRow,
  type Placement,
} from './placements.ts';
import './classic-portrait.css';

const labels = strings.display;

function timeOf(zman: ZmanSnapshot | null): string {
  return zman?.time ?? labels.missingTime;
}

/** Light text on the wood panels, as in v1. */
const panelLabelClass = 'classic-portrait-panel classic-portrait-decor text-[21.6px]';
const panelValueClass = 'classic-portrait-panel classic-portrait-mantova text-[21.6px]';

function Entry({
  placement,
  label,
  value,
}: {
  placement: Placement;
  label: string;
  value: string;
}) {
  return (
    <>
      <div
        className={`absolute whitespace-nowrap ${panelLabelClass}`}
        style={{ top: placement.top, right: SURFACE.width - placement.labelRight }}
      >
        {label}
      </div>
      <div
        dir="ltr"
        className={`absolute whitespace-nowrap ${panelValueClass}`}
        style={{ top: placement.top, left: placement.valueLeft }}
      >
        {value}
      </div>
    </>
  );
}

/** A row of a parchment frame: dark bold text, the label shrunk if it is too long. */
function FrameEntry({ row, label, value }: { row: FrameRow; label: string; value: string }) {
  const { ref, fontSize } = useFitFontSize<HTMLDivElement>(label, row.fontSize, row.labelMaxWidth);
  return (
    <>
      <div
        ref={ref}
        className="classic-portrait-frame absolute whitespace-nowrap"
        style={{
          top: row.top,
          right: SURFACE.width - row.labelRight,
          fontSize,
          // A shrunk label stays centred on its row.
          lineHeight: `${String(row.fontSize * 1.5)}px`,
        }}
      >
        {label}
      </div>
      <div
        dir="ltr"
        className="classic-portrait-frame absolute whitespace-nowrap"
        style={{
          top: row.top,
          left: row.valueLeft,
          fontSize: row.fontSize,
          lineHeight: `${String(row.fontSize * 1.5)}px`,
        }}
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
  const weekdayRows = frameRows(weekdayFrame, schedule.weekday.length);
  // The entered Shabbat prayers, then Arvit at the end of Shabbat.
  const shabbatRows = frameRows(shabbatFrame, schedule.shabbat.length + 1);

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
        {weekdayRows.map((row, index) => {
          const prayer = schedule.weekday[index];
          return (
            prayer !== undefined && (
              <FrameEntry key={prayer.id} row={row} label={prayer.name} value={prayer.time} />
            )
          );
        })}

        {shabbatRows.map((row, index) => {
          const prayer = schedule.shabbat[index];
          return prayer === undefined ? (
            <FrameEntry
              key="arvit"
              row={row}
              label={labels.shabbat.arvit}
              value={timeOf(shabbat.motzeiShabbatArvit)}
            />
          ) : (
            <FrameEntry key={prayer.id} row={row} label={prayer.name} value={prayer.time} />
          );
        })}

        {options.showDafYomi && (
          <Entry placement={leftPanel.dafYomi} label={labels.dafYomi} value={calendar.dafYomi} />
        )}
        <Entry placement={leftPanel.parasha} label={labels.parasha} value={calendar.parasha} />
        <Entry
          placement={leftPanel.candleLighting}
          label={labels.candleLighting}
          value={timeOf(shabbat.candleLighting)}
        />
        <Entry
          placement={leftPanel.rabbeinuTam}
          label={labels.rabbeinuTam}
          value={timeOf(shabbat.rabbeinuTam)}
        />

        <div
          className={`absolute whitespace-nowrap ${panelLabelClass}`}
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
