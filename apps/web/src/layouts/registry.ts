import { blueGoldLayout } from './blue-gold/blue-gold-layout.tsx';
import { classicPortraitLayout } from './classic-portrait/classic-portrait-layout.tsx';
import type { Layout } from './define-layout.tsx';

/** Every layout a display can use, by id. Adding one needs no other change (plan §4.5). */
const layouts: ReadonlyMap<string, Layout> = new Map(
  [classicPortraitLayout, blueGoldLayout].map((layout) => [layout.id, layout]),
);

export function findLayout(layoutId: string): Layout | undefined {
  return layouts.get(layoutId);
}
