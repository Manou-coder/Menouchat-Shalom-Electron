import { defineLayout } from '../define-layout.tsx';
import { ClassicNew } from './ClassicNew.tsx';
import { classicNewOptionsSchema } from './options.ts';

export const classicNewLayout = defineLayout({
  id: 'classic-new',
  optionsSchema: classicNewOptionsSchema,
  Component: ClassicNew,
});
