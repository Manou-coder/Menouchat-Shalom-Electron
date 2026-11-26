import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { DEFAULT_HTTP_PORT, SLIDES_PATH, TRPC_PATH, WEB_DEV_SERVER_PORT } from '@menouchat/shared';

const serverUrl = `http://127.0.0.1:${String(DEFAULT_HTTP_PORT)}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: WEB_DEV_SERVER_PORT,
    strictPort: true,
    // Same origin in development too, exactly as when the desktop app serves the build.
    proxy: {
      [TRPC_PATH]: serverUrl,
      [SLIDES_PATH]: serverUrl,
    },
  },
});
