import { z } from 'zod';

/** No options yet: the theme shows everything, as the mockup the owner approved. */
export const blueGoldOptionsSchema = z.object({});

export type BlueGoldOptions = z.infer<typeof blueGoldOptionsSchema>;
