import { z } from 'zod';

export const classicPortraitOptionsSchema = z.object({
  showClock: z.boolean().default(true),
  showDafYomi: z.boolean().default(true),
  showSlideshow: z.boolean().default(true),
});

export type ClassicPortraitOptions = z.infer<typeof classicPortraitOptionsSchema>;
