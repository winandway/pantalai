// Capturas ORIGINALES de la máscara «Natural» del Estudio (inglés y español) para Docs.
// Uso: con el sitio local corriendo, `URL_BASE=http://127.0.0.1:8790 node scripts/capturas-natural.mjs`.
// El video de YouTube se reemplaza por una escena de ejemplo servida en la dirección del reproductor oficial
// (datos neutros: no se llama a YouTube ni sale contenido de nadie).
/* global navigator, setInterval -- el guion de adentro corre en la página */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const ESCENA = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;height:100vh;display:grid;place-items:center;
background:linear-gradient(135deg,#1e3a8a,#0ea5e9 55%,#22c55e);font-family:system-ui;color:#fff">
<div style="text-align:center"><div style="font-size:12vw">🌄</div><div style="font-size:5vw;font-weight:800">Morning hike</div></div>
<script>addEventListener('message',(e)=>{const m=JSON.parse(e.data);if(m.event==='listening')parent.postMessage(JSON.stringify({event:'onReady'}),'*')})</script>
</body></html>`;
const navegador = await chromium.launch({
  channel: 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await navegador.newContext({
  viewport: { width: 1440, height: 1800 },
  deviceScaleFactor: 2,
  permissions: ['camera', 'microphone'],
  // Dirección de mentira, solo en local: así las cuentas de las capturas no gastan el límite de registros.
  extraHTTPHeaders: /127\.0\.0\.1|localhost/.test(BASE)
    ? { 'cf-connecting-ip': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
    : {},
});
// La cámara del anfitrión: una ilustración neutra (no el patrón verde de la cámara de prueba).
await ctx.addInitScript(() => {
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => {
    if (!c?.video) return original(c);
    const lienzo = document.createElement('canvas');
    lienzo.width = 1280;
    lienzo.height = 720;
    const g = lienzo.getContext('2d');
    const pintar = () => {
      const f = g.createRadialGradient(640, 300, 60, 640, 360, 760);
      f.addColorStop(0, '#f9a8d4');
      f.addColorStop(0.55, '#7c3aed');
      f.addColorStop(1, '#1e1b4b');
      g.fillStyle = f;
      g.fillRect(0, 0, 1280, 720);
      g.font = '360px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🧑‍💻', 640, 400);
    };
    pintar();
    setInterval(pintar, 200);
    return lienzo.captureStream(30);
  };
});
await ctx.route('https://www.youtube-nocookie.com/embed/**', (r) =>
  r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: ESCENA }),
);
await ctx.route('**/datos/oembed?**', (r) =>
  r.fulfill({
    json: {
      id: 'aaaaaaaaaaa',
      insertable: true,
      titulo: 'Morning hike in 4K',
      autor: 'Creator',
      creador: '@creator',
    },
  }),
);
const p = await ctx.newPage();
await p.goto(`${BASE}/signup`);
await p.getByLabel('Your name').fill('Soporte');
await p.getByLabel('Email').fill(`capturas.natural.${Date.now()}@example.com`);
await p.getByLabel('Password', { exact: true }).fill(`Capturas-${Date.now()}`);
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/library/);

for (const idioma of ['en', 'es']) {
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/studio`);
  const nuevo = p.locator('.recuperado button');
  if (await nuevo.isVisible().catch(() => false)) await nuevo.click();
  await p.locator('#estudio-enlace').fill('https://www.youtube.com/shorts/aaaaaaaaaaa');
  const oembed = p.waitForResponse((r) => r.url().includes('/datos/oembed'));
  await p.locator('.estudio-enlace button[type=submit]').click();
  await oembed;
  await p.frameLocator('.escenario iframe').locator('body div').first().waitFor();
  await p
    .locator('#estudio-tema')
    .fill(idioma === 'es' ? 'El viaje que me alegró el día' : 'The trip that made my day');
  await p.locator('#estudio-tema').blur();
  await p.locator('.mascaras-lista label', { hasText: 'Natural' }).click();
  await p.locator('.estudio-formatos label').nth(1).click();
  await p.waitForTimeout(1200);
  const png = `docs/capturas/estudio-natural-${idioma}.png`;
  await p.locator('[data-escenario]').screenshot({ path: png });
  execFileSync('cwebp', [
    '-quiet',
    '-q',
    '82',
    png,
    '-o',
    `web/public/capturas/estudio-natural-${idioma}.webp`,
  ]);
  console.log('captura', idioma);
}
await navegador.close();
