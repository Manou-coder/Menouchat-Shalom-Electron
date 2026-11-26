import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DESKTOP_BRIDGE_GLOBAL } from '@menouchat/shared';

import { ApiClientContext, createApiClient } from './api/api-client.ts';
import { resolveApiConfig } from './api/api-config.ts';
import { App } from './App.tsx';
import './styles/global.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Missing #root element');
}

const bridge: unknown = Reflect.get(window, DESKTOP_BRIDGE_GLOBAL);
const apiClient = createApiClient(resolveApiConfig(bridge, window.location.origin));

createRoot(root).render(
  <StrictMode>
    <ApiClientContext value={apiClient}>
      <App />
    </ApiClientContext>
  </StrictMode>,
);
