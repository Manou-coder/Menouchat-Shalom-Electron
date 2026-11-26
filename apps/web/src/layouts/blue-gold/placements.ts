/**
 * Where everything goes on the blue-gold background, on the same 720 × 1280 surface as the
 * classic layout. The background was drawn at 941 × 1672 (the mockups' size), so boxes are
 * written in those pixels, where they were measured, and converted once here.
 */
export const SURFACE = { width: 720, height: 1280 } as const;

const ARTWORK = { width: 941, height: 1672 } as const;
const sx = SURFACE.width / ARTWORK.width;
const sy = SURFACE.height / ARTWORK.height;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A box given by its corners in artwork pixels, in surface pixels. */
function box(x1: number, y1: number, x2: number, y2: number): Box {
  return { left: x1 * sx, top: y1 * sy, width: (x2 - x1) * sx, height: (y2 - y1) * sy };
}

/** The navy banner, inside its gold border. */
export const clock = box(110, 60, 830, 228);
export const date = box(52, 252, 888, 338);
export const weekday = box(50, 357, 890, 560);
export const shabbat = box(50, 582, 890, 873);

const tileColumns = [683.5, 474, 264, 50.9] as const;
const tileWidth = 205;
const tileRows = [893, 1011] as const;
const tileHeight = 107;
const tile = (row: 0 | 1, column: 0 | 1 | 2 | 3) => {
  const x = tileColumns[column];
  const y = tileRows[row];
  return box(x, y, x + tileWidth, y + tileHeight);
};

/** The eight tiles, read right to left then top to bottom: the zmanim, then the daf yomi. */
export const zmanTiles = {
  alosHashachar: tile(0, 0),
  seaLevelSunrise: tile(0, 1),
  sofZmanShmaMGA: tile(0, 2),
  sofZmanShmaGRA: tile(0, 3),
  chatzos: tile(1, 0),
  sunset: tile(1, 1),
  tzais: tile(1, 2),
} as const;
export const dafYomiTile = tile(1, 3);

/** v1's slide size (594 × 280), centred in the picture frame's opening. */
export const slideshow = { left: 63, top: 892, width: 594, height: 280 } as const;

/**
 * The picture frame, redrawn from the background over the slide so the slide's edges sit
 * under its inner gold line: the area copied, the frame's outline and its opening.
 */
export const frame = {
  area: box(40, 1130, 900, 1565),
  outline: box(51.5, 1136, 889.5, 1561),
  outlineCornerRadius: 16 * sx,
  opening: box(82.5, 1166, 858.5, 1531),
  openingCornerRadius: 22 * sx,
} as const;

/** The free strip under the picture frame, between the page's corner ornaments. */
export const footer = box(115, 1565, 826, 1624);
