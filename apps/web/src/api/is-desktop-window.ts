import { createContext, useContext } from 'react';

/** True in the app's own Electron windows (the preload gave them the launch token). */
export const IsDesktopWindowContext = createContext(false);

export function useIsDesktopWindow(): boolean {
  return useContext(IsDesktopWindowContext);
}
