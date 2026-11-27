import { strings, type Prayer, type ZmanSnapshot } from '@menouchat/shared';

import logo from '../../assets/logo-full.png';
import { DayEventsLine } from '../../display/DayEventsLine.tsx';
import { Slideshow } from '../../display/Slideshow.tsx';
import { useFitFontSize } from '../../display/use-fit-font-size.ts';
import { useFitScale } from '../../display/use-fit-scale.ts';
import { AnalogClock } from '../classic-portrait/AnalogClock.tsx';
import {
  eventsLine,
  leftPanel,
  rightPanel,
  slideshow,
  SURFACE,
  type Placement,
} from '../classic-portrait/placements.ts';
import type { LayoutProps } from '../define-layout.tsx';
import background from './assets/background.jpg';
import parchment from './assets/parchment.jpg';
import type { ClassicNewOptions } from './options.ts';
import { FrameOrnaments } from './FrameOrnaments.tsx';
import './classic-new.css';

const labels = strings.display;

function timeOf(zman: ZmanSnapshot | null): string {
  return zman?.time ?? labels.missingTime;
}

/**
 * The new classic look: v1's wood, clock and slide frame, with the new logo engraved at the
 * top and both prayer lists in one gold frame, with scrollwork in its corners, where v1 had two
 * ornate ones. Same 720 × 1280
 * surface as the classic theme, whose panel and clock positions it keeps.
 */
const LOGO = { top: 12, height: 152 } as const;
/** Where v1's two frames stood, side by side. */
const FRAME = { left: 26, top: 184, width: 668, height: 368 } as const;
/** The gold moulding around the parchment. */
const MOULDING = 12;
/** Room inside the parchment, kept clear of the corner scrollwork. */
const FRAME_PADDING = { x: 46, top: 20, bottom: 26 } as const;
const TITLE_HEIGHT = 50;
const MAX_ROW_STEP = 54;
const MAX_FONT_SIZE = 34;
/** Text this much smaller than the gap between rows, when rows crowd the frame. */
const FONT_TO_STEP = 0.66;
/** A time is about this many font sizes wide; names get the rest of their column. */
const TIME_WIDTH_IN_FONT_SIZES = 2.9;
const DIVIDER_WIDTH = 28;
/** The least space between a name and its time. */
const NAME_GAP = 26;

interface Row {
  key: string;
  name: string;
  time: string;
}

function Name({ text, size, maxWidth }: { text: string; size: number; maxWidth: number }) {
  const { ref, fontSize } = useFitFontSize<HTMLSpanElement>(text, size, maxWidth);
  return (
    <span ref={ref} className="whitespace-nowrap" style={{ fontSize }}>
      {text}
    </span>
  );
}

/** One column of the frame: its title, then a name and a time per row, on a shared grid. */
function Column({
  title,
  rows,
  step,
  fontSize,
  width,
}: {
  title: string;
  rows: Row[];
  step: number;
  fontSize: number;
  width: number;
}) {
  const nameMaxWidth = width - fontSize * TIME_WIDTH_IN_FONT_SIZES - NAME_GAP;
  return (
    <div className="flex flex-col" style={{ width }}>
      <h2
        className="classic-new-title flex items-end justify-center text-[34px]"
        style={{ height: TITLE_HEIGHT }}
      >
        {title}
      </h2>
      {rows.map((row) => (
        <div
          key={row.key}
          className="classic-new-frame-text flex items-center justify-between"
          style={{ height: step, fontSize }}
        >
          <Name text={row.name} size={fontSize} maxWidth={nameMaxWidth} />
          <span dir="ltr">{row.time}</span>
        </div>
      ))}
    </div>
  );
}

const toRow = (prayer: Prayer): Row => ({ key: prayer.id, name: prayer.name, time: prayer.time });

function PanelEntry({
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
        className="classic-new-panel classic-new-panel-label absolute text-[20px] whitespace-nowrap"
        style={{ top: placement.top, right: SURFACE.width - placement.labelRight }}
      >
        {label}
      </div>
      <div
        dir="ltr"
        className="classic-new-panel absolute text-[21px] whitespace-nowrap"
        style={{ top: placement.top, left: placement.valueLeft }}
      >
        {value}
      </div>
    </>
  );
}

export function ClassicNew({ state, options }: LayoutProps<ClassicNewOptions>) {
  const scale = useFitScale(SURFACE.width, SURFACE.height);
  const { schedule, dailyZmanim, shabbat, calendar } = state;

  const weekday = schedule.weekday.map(toRow);
  // The entered Shabbat prayers, then Arvit at the end of Shabbat.
  const shabbatRows = [
    ...schedule.shabbat.map(toRow),
    { key: 'arvit', name: labels.shabbat.arvit, time: timeOf(shabbat.motzeiShabbatArvit) },
  ];
  const rowCount = Math.max(weekday.length, shabbatRows.length, 1);
  const rowsHeight =
    FRAME.height - 2 * MOULDING - FRAME_PADDING.top - FRAME_PADDING.bottom - TITLE_HEIGHT;
  const step = Math.min(MAX_ROW_STEP, rowsHeight / rowCount);
  const fontSize = Math.min(MAX_FONT_SIZE, step * FONT_TO_STEP);
  const columnWidth = (FRAME.width - 2 * MOULDING - 2 * FRAME_PADDING.x - DIVIDER_WIDTH) / 2;

  return (
    <div className="flex h-dvh w-dvw items-center justify-center overflow-hidden bg-black">
      <div
        className="classic-new relative shrink-0"
        style={{
          width: SURFACE.width,
          height: SURFACE.height,
          scale: String(scale),
          backgroundImage: `url(${background})`,
          backgroundSize: '100% 100%',
        }}
      >
        <div
          className="classic-new-engraved absolute inset-x-0"
          style={{ top: LOGO.top, height: LOGO.height }}
        >
          <div
            role="img"
            aria-label={strings.appName}
            className="classic-new-logo size-full"
            style={{ maskImage: `url(${logo})` }}
          />
        </div>

        <div className="classic-new-frame absolute" style={{ ...FRAME, padding: MOULDING }}>
          <div
            className="classic-new-parchment flex size-full items-start justify-between"
            style={{
              backgroundImage: `url(${parchment})`,
              padding: `${String(FRAME_PADDING.top)}px ${String(FRAME_PADDING.x)}px ${String(FRAME_PADDING.bottom)}px`,
            }}
          >
            <Column
              title={labels.weekdayTitle}
              rows={weekday}
              step={step}
              fontSize={fontSize}
              width={columnWidth}
            />
            <div
              aria-hidden
              className="self-stretch"
              style={{
                width: 2,
                marginTop: TITLE_HEIGHT * 0.3,
                background:
                  'linear-gradient(180deg, transparent, #b8892f 15%, #b8892f 85%, transparent)',
              }}
            />
            <Column
              title={labels.shabbatTitle}
              rows={shabbatRows}
              step={step}
              fontSize={fontSize}
              width={columnWidth}
            />
          </div>
          <FrameOrnaments inset={MOULDING} />
        </div>

        {options.showDafYomi && (
          <PanelEntry
            placement={leftPanel.dafYomi}
            label={labels.dafYomi}
            value={calendar.dafYomi}
          />
        )}
        <PanelEntry placement={leftPanel.parasha} label={labels.parasha} value={calendar.parasha} />
        <PanelEntry
          placement={leftPanel.candleLighting}
          label={labels.candleLighting}
          value={timeOf(shabbat.candleLighting)}
        />
        <PanelEntry
          placement={leftPanel.rabbeinuTam}
          label={labels.rabbeinuTam}
          value={timeOf(shabbat.rabbeinuTam)}
        />

        <div
          className="classic-new-panel classic-new-panel-label absolute text-[20px] whitespace-nowrap"
          style={{
            top: rightPanel.hebrewDate.top,
            right: SURFACE.width - rightPanel.hebrewDate.labelRight,
          }}
        >
          {calendar.hebrewDate}
        </div>
        {(Object.keys(labels.dailyZmanim) as (keyof typeof labels.dailyZmanim)[]).map((key) => (
          <PanelEntry
            key={key}
            placement={rightPanel[key]}
            label={labels.dailyZmanim[key]}
            value={timeOf(dailyZmanim[key])}
          />
        ))}

        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: eventsLine.top, height: eventsLine.height }}
        >
          <DayEventsLine
            events={state.events}
            size={24}
            maxWidth={eventsLine.maxWidth}
            className="classic-new-events"
          />
        </div>

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
