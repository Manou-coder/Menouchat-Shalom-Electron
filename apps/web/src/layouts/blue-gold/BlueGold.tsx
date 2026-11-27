import { useEffect, useState, type CSSProperties } from 'react';

import { strings, type Prayer, type ZmanSnapshot } from '@menouchat/shared';

import logo from '../../assets/logo.png';
import { Slideshow } from '../../display/Slideshow.tsx';
import { useClock } from '../../display/use-clock.ts';
import { useFitFontSize } from '../../display/use-fit-font-size.ts';
import { useFitScale } from '../../display/use-fit-scale.ts';
import type { LayoutProps } from '../define-layout.tsx';
import background from './assets/background.jpg';
import type { BlueGoldOptions } from './options.ts';
import {
  clock,
  dafYomiTile,
  date,
  footer,
  frame,
  shabbat as shabbatBox,
  slideshow,
  SURFACE,
  weekday as weekdayBox,
  zmanTiles,
  type Box,
} from './placements.ts';
import './blue-gold.css';

const labels = strings.display;

function timeOf(zman: ZmanSnapshot | null): string {
  return zman?.time ?? labels.missingTime;
}

const pad = (value: number) => String(value).padStart(2, '0');

function DigitalClock({ timeZoneId }: { timeZoneId: string }) {
  const { hours, minutes, seconds } = useClock(timeZoneId);
  return (
    <div dir="ltr" className="blue-gold-clock">
      {pad(hours)}:{pad(minutes)}
      <small>:{pad(seconds)}</small>
    </div>
  );
}

interface Item {
  key: string;
  label: string;
  value: string;
  /** Candle lighting and Rabbeinu Tam stand out in red, as on the synagogue's posters. */
  highlight?: boolean;
}

/** The most times side by side in a panel; more go on a second row. */
const MAX_PER_ROW = 4;
/** The panels' inner width (the frame less 26 px of padding each side). */
const PANEL_TEXT_WIDTH = 590;
const LABEL_SIZE = 24;
const COMPACT_LABEL_SIZE = 19;

/** Splits a panel's items into rows of at most MAX_PER_ROW, as even as possible. */
function splitRows(items: Item[]): Item[][] {
  const rowCount = Math.ceil(items.length / MAX_PER_ROW);
  const perRow = Math.ceil(items.length / Math.max(rowCount, 1));
  return Array.from({ length: rowCount }, (_, row) =>
    items.slice(row * perRow, (row + 1) * perRow),
  );
}

function Label({ text, size, maxWidth }: { text: string; size: number; maxWidth: number }) {
  const { ref, fontSize } = useFitFontSize<HTMLDivElement>(text, size, maxWidth);
  return (
    <div ref={ref} className="blue-gold-label whitespace-nowrap" style={{ fontSize }}>
      {text}
    </div>
  );
}

/** A row of times, each name above its time; `compact` when a panel needs several rows. */
function Row({ items, compact = false }: { items: Item[]; compact?: boolean }) {
  const cellWidth = PANEL_TEXT_WIDTH / Math.max(items.length, MAX_PER_ROW - 1) - 8;
  return (
    <div className={`flex w-full justify-around ${compact ? 'blue-gold-compact' : ''}`}>
      {items.map((item) => (
        <div
          key={item.key}
          className={`flex-1 text-center ${item.highlight === true ? 'blue-gold-red' : ''}`}
        >
          <Label
            text={item.label}
            size={compact ? COMPACT_LABEL_SIZE : LABEL_SIZE}
            maxWidth={cellWidth}
          />
          <div dir="ltr" className="blue-gold-time">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A panel's entered prayers, on one row or, when there are many, on two smaller ones. */
function PrayerRows({ prayers }: { prayers: readonly Prayer[] }) {
  const rows = splitRows(
    prayers.map((prayer) => ({ key: prayer.id, label: prayer.name, value: prayer.time })),
  );
  return rows.map((items, index) => <Row key={index} items={items} compact={rows.length > 1} />);
}

/** How long each of the daf yomi and the amud yomi stays in their shared tile. */
const ALTERNATE_MS = 5_000;

/** The tile's width inside its gold line (146 px), less 4 px of margin on each side. */
const TILE_TEXT_MAX_WIDTH = 138;
const TILE_TEXT_SIZE = 24;

/**
 * The daf or amud in a tile, at the usual size unless it is wider than the tile: only the
 * longest names (בבא מציעא, בבא בתרא, עבודה זרה, בבא קמא, ראש השנה) get a smaller size.
 */
function TileText({ text }: { text: string }) {
  const { ref, fontSize } = useFitFontSize<HTMLSpanElement>(
    text,
    TILE_TEXT_SIZE,
    TILE_TEXT_MAX_WIDTH,
  );
  return (
    <span ref={ref} className="blue-gold-tile-text blue-gold-red" style={{ fontSize }}>
      {text}
    </span>
  );
}

/** Shows each item in turn in the same place, cross-fading between them. */
function Alternating({ items }: { items: { label: string; value: string }[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) {
      return undefined;
    }
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % items.length);
    }, ALTERNATE_MS);
    return () => {
      clearInterval(timer);
    };
  }, [items.length]);

  return (
    <div className="relative size-full">
      {items.map((item, position) => (
        <div
          key={item.label}
          aria-hidden={position !== index % items.length}
          className="blue-gold-tile absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: position === index % items.length ? 1 : 0 }}
        >
          <div className="blue-gold-tile-label">{item.label}</div>
          <TileText text={item.value} />
        </div>
      ))}
    </div>
  );
}

const at = (place: Box): CSSProperties => ({ position: 'absolute', ...place });

/** An SVG path for a rectangle whose corners are cut by quarter circles, like the frame's. */
function cutCornerRect({ left, top, width, height }: Box, r: number): string {
  const right = left + width;
  const bottom = top + height;
  return [
    `M${String(left + r)} ${String(top)}H${String(right - r)}`,
    `A${String(r)} ${String(r)} 0 0 0 ${String(right)} ${String(top + r)}V${String(bottom - r)}`,
    `A${String(r)} ${String(r)} 0 0 0 ${String(right - r)} ${String(bottom)}H${String(left + r)}`,
    `A${String(r)} ${String(r)} 0 0 0 ${String(left)} ${String(bottom - r)}V${String(top + r)}`,
    `A${String(r)} ${String(r)} 0 0 0 ${String(left + r)} ${String(top)}Z`,
  ].join('');
}

/** The frame's outline minus its opening, in the coordinates of `frame.area`. */
const frameMask = (() => {
  const { area } = frame;
  const local = (place: Box): Box => ({
    ...place,
    left: place.left - area.left,
    top: place.top - area.top,
  });
  const path = `${cutCornerRect(local(frame.outline), frame.outlineCornerRadius)} ${cutCornerRect(
    local(frame.opening),
    frame.openingCornerRadius,
  )}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(area.width)} ${String(
    area.height,
  )}"><path fill-rule="evenodd" d="${path}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

/**
 * The picture frame again, cut out of the background and laid over the slide, so a picture
 * looks set in the frame instead of pasted on it. It hides about one pixel of the picture.
 */
function PictureFrame() {
  const { area } = frame;
  return (
    <div
      aria-hidden
      style={{
        ...at(area),
        backgroundImage: `url(${background})`,
        backgroundSize: `${String(SURFACE.width)}px ${String(SURFACE.height)}px`,
        backgroundPosition: `${String(-area.left)}px ${String(-area.top)}px`,
        maskImage: frameMask,
        maskSize: '100% 100%',
      }}
    />
  );
}

/** The blue and gold theme: the times in framed boxes on parchment, as on the shul's posters. */
export function BlueGold({ state }: LayoutProps<BlueGoldOptions>) {
  const scale = useFitScale(SURFACE.width, SURFACE.height);
  const { schedule, dailyZmanim, shabbat, calendar } = state;

  return (
    <div className="flex h-dvh w-dvw items-center justify-center overflow-hidden bg-black">
      <div
        className="blue-gold relative shrink-0"
        style={{
          width: SURFACE.width,
          height: SURFACE.height,
          scale: String(scale),
          backgroundImage: `url(${background})`,
          backgroundSize: '100% 100%',
        }}
      >
        <div className="flex items-center justify-center" style={at(clock)}>
          <DigitalClock timeZoneId={state.timeZoneId} />
        </div>

        <div className="blue-gold-date flex items-center justify-center" style={at(date)}>
          {calendar.hebrewDate} ·{' '}
          <span className="blue-gold-red">{labels.parashaOf(calendar.parasha)}</span>
        </div>

        <section className="blue-gold-panel" style={at(weekdayBox)}>
          <h2>{labels.weekdayTitle}</h2>
          <PrayerRows prayers={schedule.weekday} />
        </section>

        <section className="blue-gold-panel" style={at(shabbatBox)}>
          <h2>{labels.shabbatTitle}</h2>
          <PrayerRows prayers={schedule.shabbat} />
          <div className="h-2" />
          <Row
            compact={schedule.shabbat.length > MAX_PER_ROW}
            items={[
              {
                key: 'arvit',
                label: labels.shabbat.arvit,
                value: timeOf(shabbat.motzeiShabbatArvit),
              },
              {
                key: 'candleLighting',
                label: labels.candleLighting,
                value: timeOf(shabbat.candleLighting),
                highlight: true,
              },
              {
                key: 'rabbeinuTam',
                label: labels.rabbeinuTam,
                value: timeOf(shabbat.rabbeinuTam),
                highlight: true,
              },
            ]}
          />
        </section>

        {(Object.keys(zmanTiles) as (keyof typeof zmanTiles)[]).map((key) => (
          <div key={key} className="blue-gold-tile" style={at(zmanTiles[key])}>
            <div className="blue-gold-tile-label">{labels.dailyZmanim[key]}</div>
            <div dir="ltr" className="blue-gold-tile-time">
              {timeOf(dailyZmanim[key])}
            </div>
          </div>
        ))}
        <div className="blue-gold-tile" style={at(dafYomiTile)}>
          <Alternating
            items={[
              { label: labels.dafYomi, value: calendar.dafYomi },
              ...(calendar.amudYomi === null
                ? []
                : [{ label: labels.amudYomi, value: calendar.amudYomi }]),
            ]}
          />
        </div>

        <div className="absolute" style={slideshow}>
          <Slideshow pages={state.slideshow.pages} intervalSec={state.slideshow.intervalSec} />
        </div>
        <PictureFrame />

        <div className="blue-gold-footer flex items-center justify-center gap-3" style={at(footer)}>
          <img src={logo} alt="" className="h-10" />
          <span>{labels.association}</span>
        </div>
      </div>
    </div>
  );
}
