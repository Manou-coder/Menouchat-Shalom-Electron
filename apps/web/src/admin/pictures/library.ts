import { libraryFileUrl, type LibraryItem } from '@menouchat/shared';

export type TemplateItem = Extract<LibraryItem, { kind: 'template' }>;

/** What the screens show for an item. */
export function itemImageUrl(item: LibraryItem): string {
  return libraryFileUrl(item, item.image);
}

/** The picture a new template made from `item` starts on: a template's background, a file's page. */
export function itemBackgroundUrl(item: LibraryItem): string {
  return libraryFileUrl(item, item.kind === 'template' ? item.background : item.image);
}
