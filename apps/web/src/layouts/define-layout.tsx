import type { ComponentType, ReactElement } from 'react';
import type { z } from 'zod';

import type { DisplayState } from '@menouchat/shared';

export interface LayoutProps<Options> {
  state: DisplayState;
  options: Options;
}

/** A layout as the registry stores it: its options type is erased behind `render`. */
export interface Layout {
  id: string;
  /** Every option has a default, so `{}` is always valid (plan §4.5). */
  optionsSchema: z.ZodType;
  render(state: DisplayState): ReactElement;
}

export function defineLayout<Options>(definition: {
  id: string;
  optionsSchema: z.ZodType<Options>;
  Component: ComponentType<LayoutProps<Options>>;
}): Layout {
  const { Component, optionsSchema } = definition;
  return {
    id: definition.id,
    optionsSchema,
    render(state) {
      // Options saved by an older version may no longer validate: fall back to defaults
      // rather than leaving the synagogue screen blank.
      const parsed = optionsSchema.safeParse(state.layoutOptions);
      const options = parsed.success ? parsed.data : optionsSchema.parse({});
      return <Component state={state} options={options} />;
    },
  };
}
