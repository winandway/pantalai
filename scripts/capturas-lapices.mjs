// Capturas ORIGINALES de los lápices (inglés y español) para Docs.
// Uso: con el sitio local corriendo, `node scripts/capturas-lapices.mjs`.
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

async function dibujar() {
  const c = await p.getByTestId('capa-dibujo').boundingBox();
  const at = (x, y) => [c.x + c.width * x, c.y + c.height * y];
  const trazo = async (herr, color, puntos) => {
    await p.locator('.barra-lapices button').nth(herr).click();
    await p.locator('.barra-lapices .color-boton').nth(color).click();
    await p.mouse.move(...at(...puntos[0]));
    await p.mouse.down();
    for (const q of puntos.slice(1)) await p.mouse.move(...at(...q), { steps: 6 });
    await p.mouse.up();
  };
  await trazo(1, 1, [[0.06, 0.2], [0.42, 0.2]]); // resaltador amarillo bajo el título
  await trazo(3, 3, [[0.37, 0.4], [0.64, 0.82]]); // cuadro azul en «Design»
  await trazo(2, 0, [[0.85, 0.95], [0.7, 0.72]]); // flecha roja
  await trazo(0, 0, [[0.73, 0.88], [0.78, 0.92], [0.84, 0.88], [0.9, 0.92]]); // lápiz rojo
}

for (const idioma of ['en', 'es']) {
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/record`);
  await p.locator('.selector-modo label').first().click();
  const flotar = p.getByLabel(/Floating bubble|Burbuja flotante/);
  if (await flotar.count()) await flotar.uncheck();
  const vivo = p.getByLabel(/Live transcription|Transcripción en vivo/);
  if ((await vivo.count()) && (await vivo.isEnabled())) await vivo.uncheck();
  await p.locator('button.boton.grande').click();
  await p.locator('.barra-grabacion .indicador.vivo').waitFor({ timeout: 15_000 });
  await p.getByRole('button', { name: /Draw|Dibujar/ }).click();
  await p.locator('.barra-lapices button').nth(7).waitFor();
  await dibujar();
  await p.waitForTimeout(800);
  const png = `docs/capturas/lapices-${idioma}.png`;
  await p.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/lapices-${idioma}.webp`]);
  console.log('captura', png);
  await p.getByRole('button', { name: /Discard|Descartar/ }).click();
  await p.getByRole('dialog').getByRole('button', { name: /Discard|Descartar/ }).click();
}
await navegador.close();
