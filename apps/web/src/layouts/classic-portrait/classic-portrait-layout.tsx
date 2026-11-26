import { defineLayout } from '../define-layout.tsx';
import { ClassicPortrait } from './ClassicPortrait.tsx';
import { classicPortraitOptionsSchema } from './options.ts';

export const classicPortraitLayout = defineLayout({
  id: 'classic-portrait',
  optionsSchema: classicPortraitOptionsSchema,
  Component: ClassicPortrait,
});
