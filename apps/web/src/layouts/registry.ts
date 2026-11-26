import { classicPortraitLayout } from './classic-portrait/classic-portrait-layout.tsx';
import type { Layout } from './define-layout.tsx';

/** Every layout a display can use. Adding one needs no other change (plan §4.5). */
export const layouts: readonly Layout[] = [classicPortraitLayout];

const byId: ReadonlyMap<string, Layout> = new Map(layouts.map((layout) => [layout.id, layout]));

export function findLayout(layoutId: string): Layout | undefined {
  return byId.get(layoutId);
}
