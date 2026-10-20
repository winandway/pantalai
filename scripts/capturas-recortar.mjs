// Capturas ORIGINALES del recortador de puntas (inglés y español) para Docs.
// Uso: con el sitio local corriendo, `node scripts/capturas-recortar.mjs`.
/* global navigator, setInterval -- el guion de adentro corre en la página */
// Se graba una pestaña de ejemplo («Demo board») para que no salga Pantalay dentro de Pantalay.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const navegador = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--auto-accept-this-tab-capture',
    '--auto-select-tab-capture-source-by-title=Demo board',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const ctx = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['camera', 'microphone'],
});
// La «pantalla» que se comparte es un tablero de ejemplo dibujado en un lienzo (datos neutros).
await ctx.addInitScript(() => {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    const g = c.getContext('2d');
    const pintar = () => {
      g.fillStyle = '#f6f7f9';
      g.fillRect(0, 0, 1920, 1080);
      g.fillStyle = '#16181d';
      g.font = 'bold 76px system-ui';
      g.fillText('Launch plan · Q3', 120, 190);
      g.fillStyle = '#4a4f5a';
      g.font = '38px system-ui';
      g.fillText('Three steps to ship the new onboarding', 120, 260);
      ['Research', 'Design', 'Ship'].forEach((t, i) => {
        const x = 120 + i * 570;
        g.fillStyle = '#fff';
        g.beginPath();
        g.roundRect(x, 400, 520, 420, 28);
        g.fill();
        g.fillStyle = '#6b7280';
        g.font = '32px system-ui';
        g.fillText(`Step ${i + 1}`, x + 44, 480);
        g.fillStyle = '#16181d';
        g.font = 'bold 60px system-ui';
        g.fillText(t, x + 44, 570);
        g.fillStyle = '#e2e4e9';
        g.beginPath();
        g.roundRect(x + 44, 660, 432, 26, 13);
        g.fill();
        g.fillStyle = '#1f9d55';
        g.beginPath();
        g.roundRect(x + 44, 660, 432 * [1, 0.6, 0.2][i], 26, 13);
        g.fill();
      });
    };
    pintar();
    setInterval(pintar, 200);
    const s = c.captureStream(30);
    const v = s.getVideoTracks()[0];
    const original = v.getSettings.bind(v);
    v.getSettings = () => ({ ...original(), width: 1920, height: 1080, displaySurface: 'monitor' });
    return s;
  };
});

const p = await ctx.newPage();
await p.goto(`${BASE}/signup`);
await p.getByLabel('Your name').fill('Soporte capturas');
await p.getByLabel('Email').fill(`capturas.${Date.now()}@example.com`);
await p.getByLabel('Password', { exact: true }).fill(`Capturas-${Date.now()}`);
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/library/);

// Una grabación corta de ejemplo (12 s) para recortar.
await p.goto(`${BASE}/record`);
await p.locator('.selector-modo label').nth(1).click();
const vivo = p.getByLabel(/Live transcription/);
if ((await vivo.count()) && (await vivo.isEnabled())) await vivo.uncheck();
await p.locator('button.boton.grande').click();
await p.locator('.barra-grabacion .indicador.vivo').waitFor({ timeout: 15_000 });
await p.waitForTimeout(12_000);
await p.getByRole('button', { name: /Finish/ }).click();
await p.waitForURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
const id = p.url().split('/v/')[1];

for (const idioma of ['en', 'es']) {
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/v/${id}/edit`);
  const tira = p.locator('.recortador-tira');
  await tira.waitFor();
  await p.waitForFunction(() => document.querySelectorAll('.recortador-fotos span[style*="background-image"]').length > 10, null, { timeout: 30_000 });
  const c = await tira.boundingBox();
  const y = c.y + c.height / 2;
  const mover = async (n, a) => {
    const h = await p.locator('.recortador-agarradera').nth(n).boundingBox();
    await p.mouse.move(h.x + h.width / 2, y);
    await p.mouse.down();
    await p.mouse.move(c.x + c.width * a, y, { steps: 8 });
    await p.mouse.up();
  };
  await mover(0, 0.12);
  await mover(1, 0.86);
  await p.locator('.tarjeta-recortar').scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollTo(0, Math.max(0, document.querySelector('.tarjeta-recortar').getBoundingClientRect().top + window.scrollY - 520)));
  await p.waitForTimeout(800);
  const png = `docs/capturas/recortar-${idioma}.png`;
  await p.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/recortar-${idioma}.webp`]);
  console.log('captura', png);
}
await navegador.close();
