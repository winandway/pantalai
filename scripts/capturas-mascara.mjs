// Capturas ORIGINALES de las máscaras del Estudio (fase 3) y del cartel «Hablando» (fase 4), en inglés y español.
// Uso: con el sitio local corriendo, `URL_BASE=http://127.0.0.1:8787 node scripts/capturas-mascara.mjs`.
// El video de YouTube se reemplaza por una escena de ejemplo servida en la dirección del reproductor oficial
// (datos neutros: no se llama a YouTube ni sale contenido de nadie).
/* global navigator, setInterval, Buffer -- el guion de adentro corre en la página */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const ESCENA = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;height:100vh;display:grid;place-items:center;
background:linear-gradient(135deg,#1e3a8a,#0ea5e9 55%,#22c55e);font-family:system-ui;color:#fff">
<div style="text-align:center"><div style="font-size:12vw">🌄</div><div style="font-size:5vw;font-weight:800">Morning hike · 4K</div></div>
<script>addEventListener('message',(e)=>{const m=JSON.parse(e.data);if(m.event==='listening')parent.postMessage(JSON.stringify({event:'onReady'}),'*')})</script>
</body></html>`;
const navegador = await chromium.launch({
  channel: 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await navegador.newContext({
  viewport: { width: 1440, height: 1500 },
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

const TEXTOS = {
  en: { tema: 'Morning hike in 4K', mascara: 'Weekend show', programa: 'Trail Talk', rol: 'Host' },
  es: {
    tema: 'Caminata al amanecer en 4K',
    mascara: 'Programa del fin de semana',
    programa: 'Charla de Ruta',
    rol: 'Anfitrión',
  },
};
const webp = (png, nombre) =>
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/${nombre}.webp`]);

for (const idioma of ['en', 'es']) {
  const tx = TEXTOS[idioma];
  const p = await ctx.newPage();
  await ctx.clearCookies();
  await p.goto(`${BASE}/signup`);
  await p.evaluate(() => localStorage.setItem('pantalai:idioma', 'en'));
  await p.goto(`${BASE}/signup`);
  await p.getByLabel('Your name').fill('Alex');
  await p.getByLabel('Email').fill(`capturas.mascara.${idioma}.${Date.now()}@example.com`);
  await p.getByLabel('Password', { exact: true }).fill(`Capturas-${Date.now()}`);
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/library/);
  await p.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await p.goto(`${BASE}/studio`);
  await p.locator('#estudio-enlace').fill('https://www.youtube.com/watch?v=aaaaaaaaaaa');
  const oembed = p.waitForResponse((r) => r.url().includes('/datos/oembed'));
  await p.locator('.estudio-enlace button[type=submit]').click();
  await oembed;
  await p.frameLocator('.escenario iframe').locator('body div').first().waitFor();
  await p.waitForTimeout(1500);
  await p.locator('#estudio-tema').fill(tx.tema);
  // Un logo de ejemplo dibujado aquí (montañas sobre un círculo): nada de marcas de nadie.
  const logo = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#fbbf24';
    g.beginPath();
    g.arc(128, 128, 120, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.moveTo(40, 190);
    g.lineTo(105, 90);
    g.lineTo(140, 140);
    g.lineTo(165, 110);
    g.lineTo(216, 190);
    g.closePath();
    g.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  await p.locator('.estudio-mascaras .mascaras-lista > button').click();
  await p.locator('#mascara-estilo').selectOption('noticiero');
  await p.locator('#mascara-nombre').fill(tx.mascara);
  await p.locator('#mascara-programa').fill(tx.programa);
  await p.locator('#mascara-rol').fill(tx.rol);
  await p.locator('[data-color=principal]').fill('#e11d48');
  await p.locator('[data-color=secundario]').fill('#0ea5e9');
  await p.locator('[data-color=fondo]').fill('#0f172a');
  await p
    .locator('[data-archivo-imagen="logo-mascara"]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(logo, 'base64') });
  await p.locator('.mascara-logo-vista').waitFor();
  await p.waitForTimeout(800);
  // 1) El editor con la vista previa del escenario.
  const editor = `docs/capturas/mascara-editor-${idioma}.png`;
  await p.locator('.estudio-mascaras').screenshot({ path: editor });
  webp(editor, `mascara-editor-${idioma}`);
  // 2) Guardada: el escenario horizontal tal como se graba.
  await p.locator('[data-editor-mascara] button[type=submit]').click();
  await p.locator('[data-editor-mascara]').waitFor({ state: 'detached' });
  // Se espera a que se vaya el aviso «Máscara guardada» (no sale en la grabación, pero sí en la captura).
  await p.waitForTimeout(6000);
  const estudio = `docs/capturas/mascara-estudio-${idioma}.png`;
  await p.locator('.escenario').screenshot({ path: estudio });
  webp(estudio, `mascara-estudio-${idioma}`);
  // 3) La misma máscara en vertical 9:16 (cámara grande arriba).
  await p.locator('.estudio-formatos label').nth(1).click();
  await p.locator('.estudio-posiciones-v label').nth(1).click();
  await p.waitForTimeout(800);
  const vertical = `docs/capturas/mascara-vertical-${idioma}.png`;
  await p.locator('.escenario').screenshot({ path: vertical });
  webp(vertical, `mascara-vertical-${idioma}`);
  await p.locator('.estudio-formatos label').nth(0).click();
  if (process.env.HABLANDO) {
    // Fase 4: el cartel «Hablando» encendido con la voz (micrófono de prueba que suena).
    await p.locator('.cartel-voz.hablando').first().waitFor({ timeout: 15000 });
    const voz = `docs/capturas/hablando-${idioma}.png`;
    await p.locator('.escenario').screenshot({ path: voz });
    webp(voz, `hablando-${idioma}`);
  }
  console.log('capturas', idioma);
  await p.close();
}
await navegador.close();
