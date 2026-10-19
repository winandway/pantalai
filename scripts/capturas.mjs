// Toma las capturas ORIGINALES de la app (inglés y español) para la portada y Docs.
// Uso: con el sitio local corriendo, `node scripts/capturas.mjs <correo> <clave> <idVideo>`.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const [correo, clave, id] = process.argv.slice(2);
const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const SALIDA = 'web/public/capturas';
const ORIGINALES = 'docs/capturas';
mkdirSync(SALIDA, { recursive: true });
mkdirSync(ORIGINALES, { recursive: true });

const navegador = await chromium.launch({ channel: 'chrome' });
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(`${BASE}/login`);
await p.getByLabel('Email').fill(correo);
await p.getByLabel('Password', { exact: true }).fill(clave);
await p.getByRole('button', { name: 'Log in' }).click();
await p.waitForURL(/library/);

async function irA(segundo) {
  // Lleva el video a un segundo y espera a que se vea el fotograma.
  await p.locator('.reproductor video').evaluate(
    (v, s) =>
      new Promise((ok) => {
        const ir = () => {
          v.addEventListener('seeked', () => ok(0), { once: true });
          v.currentTime = s;
        };
        if (v.readyState >= 1) ir();
        else v.addEventListener('loadedmetadata', ir, { once: true });
        setTimeout(() => ok(0), 8000);
      }),
    segundo,
  );
}

async function foto(nombre) {
  await p.waitForTimeout(900);
  const png = `${ORIGINALES}/${nombre}.png`;
  await p.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `${SALIDA}/${nombre}.webp`]);
  console.log('captura', nombre);
}

for (const idioma of ['en', 'es']) {
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/v/${id}?t=3`);
  await irA(3);
  await foto(`video-${idioma}`);
  await p.getByRole('button', { name: idioma === 'es' ? 'Compartir' : 'Share', exact: true }).click();
  await foto(`compartir-${idioma}`);
  await p.keyboard.press('Escape');
  await p.goto(`${BASE}/library`);
  await foto(`biblioteca-${idioma}`);
  await p.goto(`${BASE}/record`);
  await foto(`grabar-${idioma}`);
  await p.goto(`${BASE}/v/${id}/edit`);
  await irA(26);
  await foto(`editar-${idioma}`);
}
await navegador.close();
