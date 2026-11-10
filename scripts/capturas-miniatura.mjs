// Capturas ORIGINALES de la miniatura para YouTube (C-MINIATURA), en inglés y español.
// Uso: con el sitio local corriendo, `URL_BASE=http://127.0.0.1:8787 node scripts/capturas-miniatura.mjs <video.mp4>`.
// El video es una escena neutra (un degradado de colores, sin personas ni marcas); el texto es de ejemplo.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const VIDEO = process.argv[2];
if (!VIDEO) throw new Error('Falta el video de ejemplo');
const TEXTOS = { en: '3 trail tips', es: '3 trucos de ruta' };
const webp = (png, nombre) =>
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/${nombre}.webp`]);

const navegador = await chromium.launch({ channel: 'chrome' });
const nuevoContexto = () =>
  navegador.newContext({
  viewport: { width: 1280, height: 1400 },
  deviceScaleFactor: 2,
  extraHTTPHeaders: /127\.0\.0\.1|localhost/.test(BASE)
    ? { 'cf-connecting-ip': `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
    : {},
  });
for (const idioma of ['en', 'es']) {
  // Un contexto por idioma: cada uno con su propia cuenta (sin la sesión del anterior).
  const ctx = await nuevoContexto();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/signup`);
  await p.evaluate(() => localStorage.setItem('pantalai:idioma', 'en'));
  await p.goto(`${BASE}/signup`);
  await p.getByLabel('Your name').fill('Soporte');
  await p.getByLabel('Email').fill(`capturas.miniatura.${idioma}.${Date.now()}@example.com`);
  await p.getByLabel('Password', { exact: true }).fill(`Capturas-${Date.now()}`);
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/\/library/);
  await p.getByLabel('Upload a video').setInputFiles(VIDEO);
  await p.waitForURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.reload();
  const seccion = p.locator('[data-miniatura]');
  await seccion.waitFor();
  await seccion.getByRole('slider').fill('3');
  await seccion.locator('input[type=text]').fill(TEXTOS[idioma]);
  await seccion.locator('[data-miniatura-lienzo][data-modo="webcodecs"]').waitFor({ timeout: 30_000 });
  await p.waitForTimeout(800);
  await seccion.scrollIntoViewIfNeeded();
  const png = `docs/capturas/miniatura-${idioma}.png`;
  await seccion.screenshot({ path: png });
  webp(png, `miniatura-${idioma}`);
  console.log('captura', idioma);
  await ctx.close();
}
await navegador.close();
