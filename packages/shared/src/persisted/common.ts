import { z } from 'zod';

/** A time entered in the admin, `"HH:MM"` on a 24-hour clock. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

/**
 * A file name inside a slide's folder. Plain names only, so that no stored value can
 * point outside `userData/slides/<id>/`.
 */
export const storedFileNameSchema = z
  .string()
  .regex(/^[\w-][\w .-]{0,199}$/, 'Expected a plain file name')
  .refine((name) => !name.includes('..'), 'Expected a plain file name');
