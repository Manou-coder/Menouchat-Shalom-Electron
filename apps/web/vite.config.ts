import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { DEFAULT_HTTP_PORT, TRPC_PATH, WEB_DEV_SERVER_PORT } from '@menouchat/shared';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: WEB_DEV_SERVER_PORT,
    strictPort: true,
    // Same-origin API in development too, exactly as when the desktop app serves the build.
    proxy: {
      [TRPC_PATH]: `http://127.0.0.1:${String(DEFAULT_HTTP_PORT)}`,
    },
  },
});
