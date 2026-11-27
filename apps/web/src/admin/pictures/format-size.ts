import { strings } from '@menouchat/shared';

const units = strings.admin.library.sizes;

/** A size on disk for people: "820 ק״ב", "3.4 מ״ב". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} ${units.bytes}`;
  }
  if (bytes < 1024 * 1024) {
    return `${String(Math.round(bytes / 1024))} ${units.kilobytes}`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${units.megabytes}`;
}
