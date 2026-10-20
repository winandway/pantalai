// Capturas ORIGINALES para Docs y la portada, tomadas del sitio publicado con la IA real.
// Uso: node scripts/capturas-vivo.mjs <correo> <clave> <video-en.webm> <video-es.webm>
// Crea la cuenta de demostración si no existe, sube un video por idioma, espera a la IA y toma las fotos.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const [correo, clave, videoEn, videoEs] = process.argv.slice(2);
const BASE = process.env.URL_BASE ?? 'https://pantalai.sitios.dev';
mkdirSync('web/public/capturas', { recursive: true });
mkdirSync('docs/capturas', { recursive: true });

const navegador = await chromium.launch({ channel: 'chrome' });
const p = await (await navegador.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

async function foto(nombre) {
  await p.waitForTimeout(900);
  const png = `docs/capturas/${nombre}.png`;
  await p.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/${nombre}.webp`]);
  console.log('captura', nombre);
}

async function irA(segundo) {
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

// Fotos sin sesión: crear cuenta.
for (const idioma of ['en', 'es']) {
  await p.goto(`${BASE}/`);
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/signup`);
  await foto(`crear-cuenta-${idioma}`);
}

// Entrar o crear la cuenta de demostración.
await p.evaluate(() => localStorage.setItem('pantalai:idioma', 'en'));
await p.goto(`${BASE}/login`);
await p.getByLabel('Email').fill(correo);
await p.getByLabel('Password', { exact: true }).fill(clave);
await p.getByRole('button', { name: 'Log in' }).click();
await p.waitForTimeout(2000);
if (!p.url().includes('/library')) {
  await p.goto(`${BASE}/signup`);
  await p.getByLabel('Your name').fill('Soporte Pantalay');
  await p.getByLabel('Email').fill(correo);
  await p.getByLabel('Password', { exact: true }).fill(clave);
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/library/);
}

// Empieza limpia: borra los videos anteriores de la cuenta de demostración.
await p.evaluate(async () => {
  const H = { 'x-pantalai': '1' };
  for (const archivo of ['0', '1']) {
    const { videos } = await (await fetch(`/datos/videos?archivo=${archivo}`)).json();
    for (const v of videos) await fetch(`/datos/videos/${v.id}`, { method: 'DELETE', headers: H });
  }
});

for (const [idioma, archivo] of [
  ['en', videoEn],
  ['es', videoEs],
]) {
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  const b64 = readFileSync(archivo).toString('base64');
  const duracion = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]).toString());
  const id = await p.evaluate(
    async ({ b64, idioma, duracion }) => {
      const H = { 'x-pantalai': '1' };
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const n = await (await fetch('/datos/videos', { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ idioma }) })).json();
      const partes = [];
      for (let i = 0, k = 1; i < bytes.length; i += n.parte_minima, k++) {
        const fin = bytes.length - (i + n.parte_minima) < n.parte_minima ? bytes.length : i + n.parte_minima;
        partes.push((await (await fetch(`/datos/videos/${n.id}/partes/${k}`, { method: 'PUT', headers: H, body: bytes.slice(i, fin) })).json()).parte);
        if (fin === bytes.length) break;
      }
      await fetch(`/datos/videos/${n.id}/completar`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ partes, duracion }) });
      // Miniatura del segundo 9.
      const v = document.createElement('video');
      v.muted = true;
      v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
      await new Promise((ok) => (v.onloadeddata = ok));
      v.currentTime = 9;
      await new Promise((ok) => (v.onseeked = ok));
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 360;
      c.getContext('2d').drawImage(v, 0, 0, 640, 360);
      const jpg = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
      await fetch(`/datos/videos/${n.id}/miniatura`, { method: 'PUT', headers: { ...H, 'content-type': 'image/jpeg' }, body: jpg });
      return n.id;
    },
    { b64, idioma, duracion },
  );
  await p.goto(`${BASE}/v/${id}`);
  await p.locator('.aviso-ia.exito').waitFor({ timeout: 180_000 });
  // Un comentario y reacciones de ejemplo, para que se vea la actividad.
  await p.evaluate(async ({ id, idioma }) => {
    const H = { 'x-pantalai': '1', 'content-type': 'application/json' };
    await fetch(`/datos/videos/${id}/comentarios`, {
      method: 'POST',
      credentials: 'omit',
      headers: H,
      body: JSON.stringify({ nombre: idioma === 'es' ? 'Visitante' : 'Viewer', texto: idioma === 'es' ? '¡Muy claro, gracias!' : 'Super clear, thanks!', segundo: 20 }),
    });
    for (const [e, s] of [['👏', 12], ['🔥', 30]])
      await fetch(`/datos/videos/${id}/reacciones`, { method: 'POST', credentials: 'omit', headers: H, body: JSON.stringify({ emoji: e, segundo: s }) });
  }, { id, idioma });
  await p.reload();
  await p.getByText(idioma === 'es' ? 'Resumen' : 'Summary').waitFor();
  await irA(20);
  await foto(`video-${idioma}`);
  await p.getByRole('button', { name: idioma === 'es' ? 'Compartir' : 'Share', exact: true }).click();
  await foto(`compartir-${idioma}`);
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: idioma === 'es' ? '✨ Generar' : '✨ Generate' }).click();
  await p.getByRole('dialog').getByRole('button', { name: /Generar|Generate/ }).click();
  await p.locator('.documento img').first().waitFor({ timeout: 90_000 });
  await p.waitForTimeout(1500);
  await foto(`generar-${idioma}`);
  await p.keyboard.press('Escape');
  await p.goto(`${BASE}/v/${id}/edit`);
  await irA(20);
  await p.getByText(idioma === 'es' ? 'Quitar muletillas' : 'Remove filler words').first().scrollIntoViewIfNeeded();
  await foto(`editar-${idioma}`);
  await p.goto(`${BASE}/library`);
  await foto(`biblioteca-${idioma}`);
  await p.goto(`${BASE}/record`);
  await foto(`grabar-${idioma}`);
  console.log('video', idioma, id);
}
await navegador.close();
