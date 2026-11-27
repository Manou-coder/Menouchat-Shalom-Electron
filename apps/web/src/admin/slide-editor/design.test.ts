import { describe, expect, it } from 'vitest';

import { SLIDE_DESIGN_SIZE, slideTextSchema, strings } from '@menouchat/shared';

import { coverCrop, createText, designTitle } from './design.ts';

describe('slide design helpers', () => {
  it('creates a valid text inside the slide, each with its own id', () => {
    const first = createText([], '#12306a');
    const second = createText([first], '#12306a');
    expect(slideTextSchema.parse(first)).toEqual(first);
    expect(second.id).not.toBe(first.id);
    expect(second.y).toBeGreaterThan(first.y);
    expect(first.x + first.width).toBeLessThanOrEqual(SLIDE_DESIGN_SIZE.width);
  });

  it('names a design after its first line of text', () => {
    const text = createText([], '#000000');
    expect(designTitle({ texts: [{ ...text, text: '\n  מזל טוב  \nלמשפחה' }] })).toBe('מזל טוב');
    expect(designTitle({ texts: [{ ...text, text: '   ' }] })).toBe(
      strings.admin.editor.defaultTitle,
    );
  });

  it('crops a picture to cover the slide, centred', () => {
    // Taller than the slide: full width, cropped top and bottom.
    const tall = coverCrop({ width: 1000, height: 1000 });
    expect(tall.width).toBe(1000);
    expect(tall.height).toBeCloseTo(1000 / (SLIDE_DESIGN_SIZE.width / SLIDE_DESIGN_SIZE.height));
    expect(tall.y).toBeCloseTo((1000 - tall.height) / 2);
    // Wider than the slide: full height, cropped at the sides.
    const wide = coverCrop({ width: 4000, height: 840 });
    expect(wide).toEqual({ x: (4000 - 1782) / 2, y: 0, width: 1782, height: 840 });
  });
});
