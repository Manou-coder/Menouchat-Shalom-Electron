import {
  SLIDE_DESIGN_SIZE,
  strings,
  type SlideDesign,
  type SlideFont,
  type SlideText,
} from '@menouchat/shared';

/** The CSS family of each editor font; the editor's stylesheet loads them all. */
export const FONT_FAMILIES: Record<SlideFont, string> = {
  heebo: 'Heebo Variable',
  'david-libre': 'David Libre',
  'frank-ruhl-libre': 'Frank Ruhl Libre',
  'secular-one': 'Secular One',
};

/** Colours offered beside the free colour picker: the themes' navy, red, gold, and plain ones. */
export const COLOR_SWATCHES = ['#12306a', '#9b1b1b', '#b8892f', '#2b2219', '#ffffff', '#000000'];

/** Font sizes offered, in design pixels (the slide is 840 high). */
export const FONT_SIZE_RANGE = { min: 24, max: 300, step: 4 } as const;

/**
 * Made in the browser, where `crypto.randomUUID` may be missing (a phone on plain http);
 * it only has to differ from the other texts' ids.
 */
function newTextId(): string {
  return `text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A new text, centred and as wide as most of the slide, below the texts already there. */
export function createText(existing: readonly SlideText[], color: string): SlideText {
  const fontSize = 96;
  const width = SLIDE_DESIGN_SIZE.width * 0.8;
  const offset = (existing.length % 5) * fontSize * 1.3;
  return {
    id: newTextId(),
    text: strings.admin.editor.newText,
    x: (SLIDE_DESIGN_SIZE.width - width) / 2,
    y: Math.min(SLIDE_DESIGN_SIZE.height * 0.15 + offset, SLIDE_DESIGN_SIZE.height - fontSize),
    width,
    fontSize,
    font: 'frank-ruhl-libre',
    color,
    bold: true,
    align: 'center',
  };
}

/** The name shown beside the slot: the first line of text, else a generic name. */
export function designTitle(design: SlideDesign): string {
  const line = design.texts
    .flatMap((text) => text.text.split('\n'))
    .map((value) => value.trim())
    .find((value) => value !== '');
  return (line ?? strings.admin.editor.defaultTitle).slice(0, 200);
}

/**
 * Where a picture of `image` size is cropped to cover the slide, like CSS `object-fit:
 * cover`: centred, keeping its proportions.
 */
export function coverCrop(image: { width: number; height: number }) {
  const target = SLIDE_DESIGN_SIZE.width / SLIDE_DESIGN_SIZE.height;
  const ratio = image.width / image.height;
  if (ratio > target) {
    const width = image.height * target;
    return { x: (image.width - width) / 2, y: 0, width, height: image.height };
  }
  const height = image.width / target;
  return { x: 0, y: (image.height - height) / 2, width: image.width, height };
}
