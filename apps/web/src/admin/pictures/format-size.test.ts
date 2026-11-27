import { describe, expect, it } from 'vitest';

import { formatSize } from './format-size.ts';

describe('formatSize', () => {
  it('picks bytes, kilobytes or megabytes', () => {
    expect(formatSize(512)).toBe('512 ב׳');
    expect(formatSize(820 * 1024)).toBe('820 ק״ב');
    expect(formatSize(3.44 * 1024 * 1024)).toBe('3.4 מ״ב');
  });
});
