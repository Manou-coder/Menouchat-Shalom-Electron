import { defineLayout } from '../define-layout.tsx';
import { BlueGold } from './BlueGold.tsx';
import { blueGoldOptionsSchema } from './options.ts';

export const blueGoldLayout = defineLayout({
  id: 'blue-gold',
  optionsSchema: blueGoldOptionsSchema,
  Component: BlueGold,
});
