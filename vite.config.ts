import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El mismo commit que el servidor: así la página sabe si quedó vieja (pestaña abierta desde antes de publicar).
const raw = process.env.VERSION || process.env.GITHUB_SHA || '';
const commit = /^[0-9a-f]{7,40}$/i.test(raw) ? raw.slice(0, 7).toLowerCase() : 'local';

export default defineConfig({
  root: 'web',
  define: { __COMMIT__: JSON.stringify(commit) },
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
  server: {
    port: 5173,
    proxy: { '/datos': 'http://127.0.0.1:8787', '/media': 'http://127.0.0.1:8787' },
  },
});
