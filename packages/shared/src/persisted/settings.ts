import { z } from 'zod';

import { DEFAULT_HTTP_PORT } from '../network.ts';
import { strings } from '../strings.ts';

export const SETTINGS_SCHEMA_VERSION = 1;

export const locationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().min(-500).max(9000),
  timeZoneId: z.string().refine(isKnownTimeZone, 'Unknown time zone'),
  inIsrael: z.boolean(),
});

export type LocationSettings = z.infer<typeof locationSchema>;

export const settingsSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  location: locationSchema,
  candleLightingMinutes: z.number().int().min(0).max(120),
  motzashArvitOffsetMinutes: z.number().int().min(0).max(120),
  lan: z.object({
    enabled: z.boolean(),
    port: z.number().int().min(1024).max(65535),
    /** scrypt hash of the admin PIN; `null` until the owner sets one. */
    pinHash: z.string().min(1).nullable(),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;

function isKnownTimeZone(timeZoneId: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timeZoneId });
    return true;
  } catch {
    return false;
  }
}

/** Jerusalem with v1's coordinates, as on the synagogue PC (plan §5). */
export function createDefaultSettings(): Settings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    location: {
      name: strings.defaults.locationName,
      latitude: 31.770707215675863,
      longitude: 35.18218638465854,
      elevation: 800,
      timeZoneId: 'Asia/Jerusalem',
      inIsrael: true,
    },
    candleLightingMinutes: 40,
    motzashArvitOffsetMinutes: 1,
    lan: { enabled: false, port: DEFAULT_HTTP_PORT, pinHash: null },
  };
}
