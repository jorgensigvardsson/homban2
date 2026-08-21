import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * In development the app is not opened at this dev server directly; the HTTPS
 * reverse proxy in ../proxy serves it at https://localhost and forwards
 * /api/* to the Go backend. That is why:
 *
 *   - there is no `server.proxy` entry here (the reverse proxy owns routing), and
 *   - HMR is told to connect back through the proxy's port over wss.
 */
const proxyPort = Number(process.env.PROXY_HTTPS_PORT ?? 443);

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },

  server: {
    host: '127.0.0.1',
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    // Fail loudly instead of silently moving to another port, which would
    // leave the reverse proxy pointing at nothing.
    strictPort: true,
    hmr: {
      // The browser talks to the proxy, not to this server.
      protocol: 'wss',
      clientPort: proxyPort,
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
