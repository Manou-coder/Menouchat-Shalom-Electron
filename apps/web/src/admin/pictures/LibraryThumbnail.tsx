import type { LibraryItem } from '@menouchat/shared';

import { itemImageUrl } from './library.ts';

/** An item's picture, at the slide box's proportions. */
export function LibraryThumbnail({
  item,
  dimmed = false,
}: {
  item: LibraryItem;
  dimmed?: boolean;
}) {
  return (
    <img
      src={itemImageUrl(item)}
      alt=""
      className={`aspect-[594/280] w-full rounded-lg bg-background object-contain transition ${dimmed ? 'opacity-40 grayscale' : ''}`}
    />
  );
}
