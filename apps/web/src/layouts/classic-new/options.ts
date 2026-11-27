import { z } from 'zod';

export const classicNewOptionsSchema = z.object({
  showClock: z.boolean().default(true),
  showDafYomi: z.boolean().default(true),
  showSlideshow: z.boolean().default(true),
});

export type ClassicNewOptions = z.infer<typeof classicNewOptionsSchema>;
