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

/** Weekday frame ("זמני חול"), 32 px bold. */
export const weekday = {
  shacharit: { top: 322, labelRight: 641.7, valueLeft: 455 },
  mincha: { top: 378, labelRight: 641.7, valueLeft: 455 },
  arvit: { top: 434, labelRight: 641.7, valueLeft: 455 },
} satisfies Record<string, Placement>;

/** Shabbat frame ("זמני שבת"), 28.8 px bold; Shir Hashirim smaller. */
export const shabbat = {
  shirHashirim: { top: 304.5, labelRight: 264.8, valueLeft: 80 },
  minchaErev: { top: 332.1, labelRight: 274.8, valueLeft: 70 },
  shacharit: { top: 374.7, labelRight: 274.8, valueLeft: 70 },
  mincha: { top: 417.2, labelRight: 274.8, valueLeft: 70 },
  arvit: { top: 459.8, labelRight: 259.8, valueLeft: 93 },
} satisfies Record<string, Placement>;

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
