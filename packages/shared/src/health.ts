import { z } from 'zod';

export const clientKindSchema = z.enum(['local', 'remote']);

export type ClientKind = z.infer<typeof clientKindSchema>;

export const healthSchema = z.object({
  status: z.literal('ok'),
  version: z.string().min(1),
  /** Whether the caller presented this launch's token, i.e. is a window of this desktop app. */
  client: clientKindSchema,
});

export type Health = z.infer<typeof healthSchema>;
