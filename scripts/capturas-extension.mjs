/* global chrome */
// Capturas de verificación de la extensión (dibujo, ventanita, franja del reporte y panel «Consola y red»).
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const RAIZ = process.argv[2] ?? '.';
const DIR = resolve(RAIZ, '.dist-extension-pruebas');
const BASE = 'http://127.0.0.1:8791';
const OUT = resolve(RAIZ, 'docs/capturas');
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cap-')), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 760 },
  permissions: ['camera', 'microphone'],
  args: [
    `--disable-extensions-except=${DIR}`,
    `--load-extension=${DIR}`,
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--auto-accept-this-tab-capture',
    '--auto-select-tab-capture-source-by-title=Pantalay',
  ],
});
const fondo = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
const extId = fondo.url().split('/')[2];
await ctx.route(`${BASE}/demo-tienda`, (r) =>
  r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><meta charset="utf-8"><title>Checkout · Acme Store</title><style>body{font:16px system-ui;margin:0;background:#f6f7f9}
    header{background:#16181d;color:#fff;padding:16px 32px;font-weight:700}main{max-width:720px;margin:40px auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 16px #0001}
    button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:12px 24px;font-size:16px}input{display:block;width:100%;padding:10px;margin:8px 0 16px;border:1px solid #ddd;border-radius:8px}</style>
    <header>Acme Store</header><main><h1>Checkout</h1><label>Full name<input placeholder="Full name"></label><label>Shipping address<input placeholder="Address"></label>
    <p>Total: <strong>$48.00</strong></p><button id="pagar" onclick="console.warn('Coupon field is empty'); fetch('/datos/salud?session=abc'); fetch('/datos/no-existe', {method:'POST'}); console.error('PaymentError: card declined by the processor'); setTimeout(() => { throw new TypeError('Cannot read properties of undefined (reading \\'total\\')'); })">Pay now</button></main>`,
  }),
);
const cuenta = await ctx.newPage();
await cuenta.goto(`${BASE}/signup`);
await cuenta.getByLabel('Your name').fill('Soporte Capturas');
await cuenta.getByLabel('Email').fill(`capturas.${Date.now()}@example.com`);
await cuenta.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
await cuenta.getByRole('button', { name: 'Create account' }).click();
await cuenta.waitForURL(/library/);

// 1. Dibujo encima de una página cualquiera, con el cursor resaltado.
const tienda = await ctx.newPage();
await tienda.goto(`${BASE}/demo-tienda`);
const id = await fondo.evaluate(
  async () => (await chrome.tabs.query({ url: 'http://127.0.0.1/demo-tienda*' }))[0].id,
);
await fondo.evaluate((i) => globalThis.pantalay.capa(i, 'dibujo'), id);
await fondo.evaluate((i) => globalThis.pantalay.capa(i, 'cursor'), id);
const barra = tienda.locator('#pantalay-capa [role="toolbar"]');
await barra.locator('[data-herramienta="cuadro"]').click();
await tienda.mouse.move(520, 470);
await tienda.mouse.down();
await tienda.mouse.move(700, 530, { steps: 8 });
await tienda.mouse.up();
await barra.locator('[data-herramienta="flecha"]').click();
await tienda.mouse.move(900, 620);
await tienda.mouse.down();
await tienda.mouse.move(720, 520, { steps: 8 });
await tienda.mouse.up();
await tienda.mouse.move(610, 500);
await tienda.waitForTimeout(300);
await tienda.screenshot({ path: `${OUT}/extension-dibujo-en.png` });
await tienda.keyboard.press('Escape');

// 2. La ventanita.
const ventanita = await ctx.newPage();
await ventanita.setViewportSize({ width: 320, height: 520 });
await ventanita.goto(`chrome-extension://${extId}/ventanita.html`);
await ventanita.waitForTimeout(400);
await ventanita.screenshot({ path: `${OUT}/extension-ventanita.png`, fullPage: true });
await ventanita.close();

// 3. Reporte de error.
const [grabar] = await Promise.all([
  ctx.waitForEvent('page'),
  fondo.evaluate(([i, o]) => globalThis.pantalay.empezarReporte(i, o), [id, BASE]),
]);
await grabar.setViewportSize({ width: 1280, height: 860 });
await grabar.getByTestId('franja-reporte').waitFor();
await grabar.waitForTimeout(500);
await grabar.screenshot({ path: `${OUT}/reporte-grabar-en.png` });
await grabar.getByText('Screen only').click();
await grabar.getByRole('button', { name: 'Start recording' }).click();
await grabar
  .locator('.barra-grabacion .indicador')
  .filter({ hasText: 'Recording' })
  .waitFor({ timeout: 20000 });
await grabar.waitForTimeout(1500);
await tienda.locator('#pagar').click();
await grabar.waitForTimeout(2500);
await grabar.getByRole('button', { name: /Finish/ }).click();
await grabar.waitForURL(/\/v\//, { timeout: 60000 });
await grabar.getByRole('tab', { name: 'Console & network' }).click();
await grabar.waitForTimeout(800);
await grabar.screenshot({ path: `${OUT}/reporte-video-en.png` });
// Lo mismo en español.
await grabar.evaluate(() => localStorage.setItem('pantalai:idioma', 'es'));
await grabar.reload();
await grabar.getByRole('tab', { name: 'Consola y red' }).click();
await grabar.waitForTimeout(800);
await grabar.screenshot({ path: `${OUT}/reporte-video-es.png` });
// Para Docs: webp de buena calidad (la página de dibujo no tiene texto propio: sirve para los dos idiomas).
for (const idioma of ['en', 'es']) {
  execFileSync('cwebp', [
    '-quiet',
    '-q',
    '82',
    `${OUT}/reporte-video-${idioma}.png`,
    '-o',
    `web/public/capturas/reporte-video-${idioma}.webp`,
  ]);
  execFileSync('cwebp', [
    '-quiet',
    '-q',
    '82',
    `${OUT}/extension-dibujo-en.png`,
    '-o',
    `web/public/capturas/extension-dibujo-${idioma}.webp`,
  ]);
}
console.log('capturas listas', extId);
await ctx.close();
