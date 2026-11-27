import { strings } from '@menouchat/shared';

/** The admin's menu entries, in menu order; each has its own address under /admin. */
export const ADMIN_SECTIONS = ['times', 'slides', 'library', 'layout', 'settings'] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const DEFAULT_SECTION: AdminSection = 'times';

export function sectionPath(section: AdminSection): string {
  return `/admin/${section}`;
}

export function sectionLabel(section: AdminSection): string {
  return strings.admin.menu[section];
}

export function parseSection(value: string | undefined): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => section === value);
}
