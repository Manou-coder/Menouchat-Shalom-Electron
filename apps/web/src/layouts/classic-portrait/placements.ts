/**
 * Where every text of the classic-portrait layout goes, on a 720 × 1280 surface: what v1
 * rendered on the synagogue's 1080 × 1920 portrait screen with Windows scaling at 150 %.
 * Measured on v1's own page in that configuration (text boxes of each element), so v2
 * lands exactly where v1 did, including the half-moon indent of the times around the clock.
 *
 * Labels are anchored by their right edge (Hebrew), times by their left edge.
 */
export const SURFACE = { width: 720, height: 1280 } as const;

export interface Placement {
  top: number;
  /** Right edge of a label, from the left of the surface. */
  labelRight: number;
  /** Left edge of a time or value. */
  valueLeft: number;
}

/**
 * A parchment frame holding a list of times. Rows are spread evenly and centred between
 * `top` and `bottom` (the tops of the first and last possible rows), at most `maxStep` apart;
 * text shrinks when many rows share the frame.
 */
export interface Frame {
  top: number;
  bottom: number;
  maxStep: number;
  labelRight: number;
  valueLeft: number;
  /** v1's size, used while the rows are far enough apart. */
  fontSize: number;
}

/** Weekday frame ("זמני חול"): v1's three rows, 32 px bold, 56 px apart, fall at 322, 378, 434. */
export const weekdayFrame: Frame = {
  top: 294,
  bottom: 462,
  maxStep: 56,
  labelRight: 641.7,
  valueLeft: 455,
  fontSize: 32,
};

/** Shabbat frame ("זמני שבת"), 28.8 px bold; its last row is the computed Arvit. */
export const shabbatFrame: Frame = {
  top: 300,
  bottom: 462,
  maxStep: 42.6,
  labelRight: 274.8,
  valueLeft: 70,
  fontSize: 28.8,
};

/** Rows this close together get text this much smaller than the gap between them. */
const MAX_FONT_TO_STEP = 0.72;
/** A time at the frame's size is about this many font sizes wide, plus a gap. */
const TIME_WIDTH_IN_FONT_SIZES = 2.8;
const LABEL_GAP = 10;

export interface FrameRow extends Placement {
  fontSize: number;
  /** The widest a label may be before it is shrunk to fit beside its time. */
  labelMaxWidth: number;
}

export function frameRows(frame: Frame, count: number): FrameRow[] {
  const span = frame.bottom - frame.top;
  const step = count < 2 ? 0 : Math.min(frame.maxStep, span / (count - 1));
  const first = frame.top + (span - step * (count - 1)) / 2;
  const fontSize = count < 2 ? frame.fontSize : Math.min(frame.fontSize, step * MAX_FONT_TO_STEP);
  const labelMaxWidth =
    frame.labelRight - frame.valueLeft - fontSize * TIME_WIDTH_IN_FONT_SIZES - LABEL_GAP;
  return Array.from({ length: count }, (_, index) => ({
    top: first + step * index,
    labelRight: frame.labelRight,
    valueLeft: frame.valueLeft,
    fontSize,
    labelMaxWidth,
  }));
}

/** The strip of wood between the frames and the panels, where the day's events go. */
export const eventsLine = { top: 556, height: 38, maxWidth: 660 } as const;

/** Left wooden panel, 21.6 px. */
export const leftPanel = {
  dafYomi: { top: 594.6, labelRight: 255.5, valueLeft: 25 },
  parasha: { top: 639.1, labelRight: 216.8, valueLeft: 25 },
  candleLighting: { top: 683.7, labelRight: 203, valueLeft: 25 },
  rabbeinuTam: { top: 728.2, labelRight: 200, valueLeft: 25 },
} satisfies Record<string, Placement>;

/** Right wooden panel, 21.6 px; times step left and right to clear the clock. */
export const rightPanel = {
  hebrewDate: { top: 594.6, labelRight: 702, valueLeft: 0 },
  alosHashachar: { top: 629.1, labelRight: 699.7, valueLeft: 487 },
  seaLevelSunrise: { top: 663.7, labelRight: 699.7, valueLeft: 502 },
  sofZmanShmaMGA: { top: 698.2, labelRight: 699.7, valueLeft: 512 },
  sofZmanShmaGRA: { top: 732.7, labelRight: 699.7, valueLeft: 512 },
  chatzos: { top: 767.3, labelRight: 699.7, valueLeft: 507 },
  sunset: { top: 801.8, labelRight: 699.7, valueLeft: 492 },
  tzais: { top: 836.3, labelRight: 699.7, valueLeft: 467 },
} satisfies Record<string, Placement>;

/**
 * v1's clock hands, from its stylesheet: each image is a square of `size` pixels centred
 * on (x, y), the pivot drawn in the artwork. (Their on-screen boxes look larger only
 * because the images are rotated.)
 */
export const clock = {
  hour: { x: 357.5, y: 725.5, size: 105 },
  minute: { x: 355, y: 725, size: 140 },
  pin: { x: 357.5, y: 725.5, size: 15 },
} as const;

/** v1's slide box: 280 px high from (63, 934), within the bottom frame. */
export const slideshow = { left: 63, top: 934, width: 594, height: 280 } as const;
