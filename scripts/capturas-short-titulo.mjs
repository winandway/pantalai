// Capturas ORIGINALES del «Short con título» (inglés y español) para Docs.
// Uso: con el sitio local corriendo, `node scripts/capturas-short-titulo.mjs`.
// La cámara y el video compartido son ilustraciones neutras: no sale contenido de nadie.
/* global navigator, document, setInterval, localStorage -- el guion de adentro corre en la página */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const navegador = await chromium.launch({
  channel: 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await navegador.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  permissions: ['camera', 'microphone'],
  extraHTTPHeaders: /127\.0\.0\.1|localhost/.test(BASE)
    ? { 'cf-connecting-ip': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
    : {},
});
await ctx.addInitScript(() => {
  const escena = (ancho, alto, colores, emoji, tam, y) => {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const g = lienzo.getContext('2d');
    const pintar = () => {
      const f = g.createLinearGradient(0, 0, ancho, alto);
      colores.forEach((c, i) => f.addColorStop(i / (colores.length - 1), c));
      g.fillStyle = f;
      g.fillRect(0, 0, ancho, alto);
      g.font = `${tam}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(emoji, ancho / 2, y);
    };
    pintar();
    setInterval(pintar, 200);
    return lienzo.captureStream(30);
  };
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) =>
    c?.video ? escena(1280, 720, ['#f9a8d4', '#7c3aed', '#1e1b4b'], '🧑‍💻', 330, 400) : original(c);
  navigator.mediaDevices.getDisplayMedia = async () => {
    const s = escena(720, 1280, ['#38bdf8', '#0ea5e9', '#f59e0b'], '🛣️', 420, 700);
    const pista = s.getVideoTracks()[0];
    const o = pista.getSettings.bind(pista);
    pista.getSettings = () => ({ ...o(), width: 720, height: 1280, displaySurface: 'browser' });
    return s;
  };
});
const p = await ctx.newPage();
await p.goto(`${BASE}/signup`);
await p.getByLabel('Your name').fill('Soporte');
await p.getByLabel('Email').fill(`capturas.short.${Date.now()}@example.com`);
await p.getByLabel('Password', { exact: true }).fill(`Capturas-${Date.now()}`);
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/library/);

for (const idioma of ['en', 'es']) {
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/record`);
  await p.getByText(idioma === 'es' ? 'Pantalla + cámara' : 'Screen + Cam').click();
  await p.locator('.selector-formato label').nth(2).click();
  await p.locator('#titulo-short').fill(idioma === 'es' ? 'El viaje que me alegró el día' : 'The trip that made my day');
  await p.locator('.encabezado .grabar-boton').click();
  await p.locator('.elegir-area .boton, [role=dialog] .boton').last().waitFor();
  await p.getByRole('button', { name: idioma === 'es' ? 'Usar este encuadre' : 'Use this frame' }).click();
  await p.locator('.short-preparar').waitFor();
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('.grabar-en-curso')?.scrollIntoView({ block: 'start' }));
  const png = `docs/capturas/short-titulo-${idioma}.png`;
  await p.locator('.grabar-en-curso').screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/short-titulo-${idioma}.webp`]);
  console.log('captura', idioma);
  await p.reload();
}
await navegador.close();
