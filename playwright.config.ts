import { defineConfig } from '@playwright/test';

// Prueba de punta a punta con Chrome real y cámara, micrófono y pantalla simulados.
// Corre contra el sitio local (wrangler dev) o contra URL_BASE.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: {
    baseURL: process.env.URL_BASE ?? 'http://127.0.0.1:8787',
    channel: 'chrome',
    headless: true,
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--auto-accept-this-tab-capture',
        '--auto-select-tab-capture-source-by-title=PANTALAI',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
    permissions: ['camera', 'microphone', 'clipboard-read', 'clipboard-write'],
  },
});
