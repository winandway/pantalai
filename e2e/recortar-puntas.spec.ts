import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, versionDelSitio } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-RECORTE-ACELERADO: con el MP4 «en pedacitos» que graba el navegador (sin índice), al arrastrar una
// agarradera el cuadro de esa punta aparece AL INSTANTE encima del video, y la tira de fotos se llena.
// Antes: el video no alcanzaba a pintar nada mientras se arrastraba y la tira quedaba negra.
test('al arrastrar las puntas el cuadro se ve al instante', async ({ page, request }) => {
  const H = { 'x-pantalai': '1' };
  const correo = `e2e.puntas.${Date.now()}@example.com`;
  const clave = `Prueba-${Date.now()}`;
  expect(
    (
      await request.post('/datos/registro', { headers: H, data: { nombre: 'Soporte E2E', correo, clave } })
    ).status(),
  ).toBe(201);
  const { id } = await (
    await request.post('/datos/videos', {
      headers: H,
      data: { version: await versionDelSitio(request), tipo: 'video/mp4', ancho: 640, alto: 360 },
    })
  ).json();
  const archivo = readFileSync(new URL('./datos/fragmentado.mp4', import.meta.url));
  const parte = (
    await (await request.put(`/datos/videos/${id}/partes/1`, { headers: H, data: archivo })).json()
  ).parte;
  expect(
    (
      await request.post(`/datos/videos/${id}/completar`, {
        headers: H,
        data: { partes: [parte], duracion: 50 },
      })
    ).status(),
  ).toBe(200);

  await page.goto('/login');
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto(`/v/${id}/edit`);

  const decodifica = await page.evaluate(
    async () =>
      'VideoDecoder' in window &&
      Boolean((await VideoDecoder.isConfigSupported({ codec: 'avc1.64001e' })).supported),
  );
  test.skip(!decodifica, 'Este navegador no decodifica H.264 con WebCodecs: el recortador usa el plan B.');

  await expect(page.locator('.recortador-acelerador')).toContainText('Ends ready', { timeout: 30_000 });
  await expect
    .poll(() => page.locator('.recortador-fotos span[style*="background-image"]').count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(8);

  const tira = (await page.locator('.recortador-tira').boundingBox())!;
  const y = tira.y + tira.height / 2;
  const x = (s: number) => tira.x + (s / 50) * tira.width;

  // Punta del final: se arrastra hacia atrás y, sin soltar, el cuadro ya está encima del video con su minuto.
  const fin = (await page.getByRole('slider', { name: 'End' }).boundingBox())!;
  await page.mouse.move(fin.x + fin.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(x(42), y, { steps: 6 });
  const previo = page.locator('.cuadro-previo');
  await expect(previo).toBeVisible({ timeout: 1000 });
  await expect(previo.locator('span')).toHaveText(/0:4[12]/);
  // El cuadro tiene imagen de verdad (no negro).
  const pinto = await previo.locator('canvas').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let suma = 0;
    for (let i = 0; i < d.length; i += 400) suma += d[i]! + d[i + 1]! + d[i + 2]!;
    return c.width > 0 && suma > 0;
  });
  expect(pinto).toBe(true);
  await page.screenshot({ path: test.info().outputPath('arrastrando-final.png') });
  await page.mouse.up();
  // Al soltar se quita el cuadro y el video queda en ese punto.
  await expect(previo).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'End' })).toHaveAttribute('aria-valuenow', /^4[12]/);

  // Punta del principio, igual.
  const ini = (await page.getByRole('slider', { name: 'Start' }).boundingBox())!;
  await page.mouse.move(ini.x + ini.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(x(6), y, { steps: 6 });
  await expect(previo).toBeVisible({ timeout: 1000 });
  await expect(previo.locator('span')).toHaveText(/0:0[56]/);
  await page.mouse.up();
  await expect(previo).toHaveCount(0);
});
