import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DESKTOP_BRIDGE_GLOBAL } from '@menouchat/shared';

import { ApiClientContext, createApiClient } from './api/api-client.ts';
import { resolveApiConfig } from './api/api-config.ts';
import { IsDesktopWindowContext } from './api/is-desktop-window.ts';
import { App } from './App.tsx';
import './styles/global.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Missing #root element');
}

const bridge: unknown = Reflect.get(window, DESKTOP_BRIDGE_GLOBAL);
const apiConfig = resolveApiConfig(bridge, window.location.origin);
const apiClient = createApiClient(apiConfig);

createRoot(root).render(
  <StrictMode>
    <ApiClientContext value={apiClient}>
      <IsDesktopWindowContext value={apiConfig.token !== undefined}>
        <App />
      </IsDesktopWindowContext>
    </ApiClientContext>
  </StrictMode>,
);
