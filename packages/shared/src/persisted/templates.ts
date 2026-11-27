import { z } from 'zod';

import { storedFileNameSchema } from './common.ts';
import { slideDesignSchema } from './slides.ts';

export const TEMPLATES_SCHEMA_VERSION = 1;

export const templateIdSchema = z.uuid();

/**
 * A picture made in the admin's template editor: a background, texts laid over it, and the
 * JPEG rendered from them. Slots can show it, and follow it when it is edited.
 */
export const templateSchema = z.object({
  id: templateIdSchema,
  name: z.string().trim().min(1).max(100),
  /** New for every save, so a changed template is never served from a cache. */
  revision: z.uuid(),
  /** In `slides/templates/<id>/<revision>/`. */
  background: storedFileNameSchema,
  image: storedFileNameSchema,
  design: slideDesignSchema,
});

export type Template = z.infer<typeof templateSchema>;

export const templatesSchema = z.object({
  schemaVersion: z.literal(TEMPLATES_SCHEMA_VERSION),
  templates: z.array(templateSchema),
});

export type Templates = z.infer<typeof templatesSchema>;

export function createDefaultTemplates(): Templates {
  return { schemaVersion: TEMPLATES_SCHEMA_VERSION, templates: [] };
}
