import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-ESTUDIO-RECORTE: el Estudio de reacciones graba SOLO el escenario (la máscara), nunca la pestaña entera.
// Se graba de verdad con la propia pestaña (Region Capture) y un reproductor de YouTube de prueba (verde) servido en
// la dirección del reproductor oficial: no se llama a YouTube. Se comprueba que el archivo mide lo del escenario,
// que el video de prueba sale en su tarjeta y que la esquina es la máscara oscura, no la página blanca.
const REPRODUCTOR_FALSO = `<!doctype html><html><body style="margin:0;background:#00c853">
<script>
let t = 0, estado = 5;
const decir = (m) => parent.postMessage(JSON.stringify(m), '*');
addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.event === 'listening') { decir({ event: 'onReady' }); decir({ event: 'infoDelivery', info: { currentTime: t, playerState: estado, duration: 60 } }); }
  if (m.func === 'playVideo') estado = 1;
  if (m.func === 'pauseVideo') estado = 2;
  if (m.func === 'seekTo') t = m.args[0];
  decir({ event: 'infoDelivery', info: { currentTime: t, playerState: estado } });
});
</script></body></html>`;

test('el estudio graba solo el escenario con el video y la cámara', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/embed/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: REPRODUCTOR_FALSO }),
  );
  await page.route('**/datos/oembed?**', (r) =>
    r.fulfill({
      json: {
        id: 'dQw4w9WgXcQ',
        insertable: true,
        titulo: 'Video de prueba',
        autor: 'Canal de prueba',
        creador: '@canalprueba',
      },
    }),
  );
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Reaction Studio' })).toBeVisible();
  await page.getByLabel('YouTube link').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Load video' }).click();
  // Nombre del creador y título automáticos (oEmbed).
  await expect(page.locator('.cartel-video')).toContainText('@canalprueba');
  await expect(page.locator('.escenario-tema')).toHaveText('Video de prueba');
  await expect(page.locator('.cartel').first()).toContainText('Soporte');
  // Botones de Pantalay (fuera del escenario) y atajos: el reproductor responde.
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();
  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();

  const escenario = await page.locator('[data-escenario]').boundingBox();
  const dpr = await page.evaluate(() => devicePixelRatio);
  expect(escenario).not.toBeNull();

  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

  // El archivo grabado: sus medidas y sus colores.
  await page.locator('.reproductor video').waitFor();
  const r = await page.evaluate(async () => {
    const v = document.querySelector('.reproductor video') as HTMLVideoElement;
    v.muted = true;
    if (v.readyState < 1) await new Promise((ok) => v.addEventListener('loadedmetadata', ok, { once: true }));
    v.currentTime = 1.5;
    await new Promise((ok) => v.addEventListener('seeked', ok, { once: true }));
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const x = c.getContext('2d')!;
    x.drawImage(v, 0, 0);
    const px = (fx: number, fy: number) =>
      Array.from(x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data.slice(0, 3));
    return {
      ancho: v.videoWidth,
      alto: v.videoHeight,
      esquina: px(0.01, 0.02),
      arriba: px(0.97, 0.03),
      video: px(0.7, 0.45),
      foto: c.toDataURL('image/jpeg', 0.8),
    };
  });
  writeFileSync(test.info().outputPath('estudio-grabado.jpg'), Buffer.from(r.foto.split(',')[1]!, 'base64'));
  const anchoEsperado = escenario!.width * dpr;
  expect(Math.abs(r.ancho - anchoEsperado)).toBeLessThan(6);
  expect(Math.abs(r.ancho / r.alto - 16 / 9)).toBeLessThan(0.03);
  expect(r.ancho).toBeLessThan(1280 * dpr - 50); // no es la pestaña entera
  // La esquina es la máscara oscura (no la página blanca de Pantalay).
  expect(r.esquina.every((n) => n < 80)).toBe(true);
  // Y arriba a la derecha tampoco sale la barra blanca del sitio (botón Grabar, cuenta).
  expect(r.arriba.every((n) => n < 80)).toBe(true);
  // En la tarjeta del video sale el reproductor (verde).
  const [rojo, verde, azul] = r.video as [number, number, number];
  expect(verde).toBeGreaterThan(140);
  expect(rojo).toBeLessThan(90);
  expect(azul).toBeLessThan(140);
});

test('el estudio pide sesión y no se indexa', async ({ page, request }) => {
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/login/);
  const html = await (await request.get('/studio')).text();
  expect(html).toContain('noindex');
});
