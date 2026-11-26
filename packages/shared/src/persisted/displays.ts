import { z } from 'zod';

import { strings } from '../strings.ts';

export const DISPLAYS_SCHEMA_VERSION = 1;

/** The display shown full screen on the synagogue PC. */
export const MAIN_DISPLAY_ID = 'main';

/** The v1 look, the only layout in v2.0. */
export const DEFAULT_LAYOUT_ID = 'classic-portrait';

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,49}$/, 'Expected a lowercase slug');

export const displaySchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1).max(100),
  layoutId: slugSchema,
  /** Validated against the layout's own options schema when the display is rendered. */
  layoutOptions: z.record(z.string(), z.unknown()),
  slideIntervalSec: z.number().int().min(3).max(300),
});

export type Display = z.infer<typeof displaySchema>;

export const displaysSchema = z.object({
  schemaVersion: z.literal(DISPLAYS_SCHEMA_VERSION),
  displays: z
    .array(displaySchema)
    .refine((displays) => displays.some((display) => display.id === MAIN_DISPLAY_ID), {
      error: `The "${MAIN_DISPLAY_ID}" display is required`,
    })
    .refine((displays) => new Set(displays.map((d) => d.id)).size === displays.length, {
      error: 'Display ids must be unique',
    }),
});

export type Displays = z.infer<typeof displaysSchema>;

export function createDefaultDisplays(): Displays {
  return {
    schemaVersion: DISPLAYS_SCHEMA_VERSION,
    displays: [
      {
        id: MAIN_DISPLAY_ID,
        name: strings.defaults.mainDisplayName,
        layoutId: DEFAULT_LAYOUT_ID,
        layoutOptions: {},
        slideIntervalSec: 10,
      },
    ],
  };
}
