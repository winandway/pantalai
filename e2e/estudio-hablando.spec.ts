import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-HABLANDO (fase 4): el cartel «Hablando / Escuchando» con sus barras va DENTRO del escenario, se enciende
// con el micrófono (el de prueba de Chrome suena a pitidos) y sale verde en el MP4 grabado.
test('el cartel «Hablando» se enciende con el micrófono y sale en la grabación', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.hablando.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await page.locator('#estudio-creador').fill('@creadora.prueba');
  const cartel = page.locator('[data-escenario] [data-voz=anfitrion]');
  await expect(cartel).toBeVisible();
  await page.mouse.click(5, 5); // despierta el sonido de la página, como el primer toque de una persona
  // El micrófono de prueba suena: el cartel se enciende (que se apague en el silencio lo cubre pruebas/voz.test.ts:
  // el sonido de prueba de Chrome no hace pausas largas).
  await expect(cartel).toHaveAttribute('data-hablando', '1', { timeout: 15_000 });
  await expect(cartel).toHaveText('Speaking');
  // Apagado con su casilla, el cartel no sale; encendido, vuelve.
  await page.getByLabel(/Speaking \/ Listening/).uncheck();
  await expect(cartel).toHaveCount(0);
  await page.getByLabel(/Speaking \/ Listening/).check();
  await expect(cartel).toHaveAttribute('data-hablando', '1', { timeout: 15_000 });

  const total = (await page.locator('[data-escenario]').boundingBox())!;
  const caja = (await cartel.boundingBox())!;
  const puntos = Array.from({ length: 7 }, (_, i) => ({
    x: (caja.x + caja.width * (0.2 + i * 0.1) - total.x) / total.width,
    y: (caja.y + caja.height / 2 - total.y) / total.height,
  }));
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split('/')[2]!;
  const examen = await examinarVideo(await (await page.request.get(`/media/${id}/video?descargar=1`)).body());
  let verdes = 0;
  for (const s of [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2]) {
    const cuadro = examen.cuadro(s);
    if (
      puntos.some((p) => {
        const [r, g, b] = cuadro(p.x, p.y) as [number, number, number];
        if (process.env.DEPURAR) console.log(s, p.x.toFixed(3), p.y.toFixed(3), r, g, b);
        // El verde del cartel (#16a34a) lleva azul; el de la cámara de prueba, no: así no se confunden.
        return g > 150 && r < 90 && b > 45 && b < 130 && g > b + 50;
      })
    )
      verdes++;
  }
  expect(verdes, 'cuadros con el cartel «Hablando» en verde').toBeGreaterThan(0);

  // «Para YouTube» trae el crédito del video original ya puesto (C-CREDITO).
  await expect(page.locator('[data-credito]')).toContainText('Original video by @creadora.prueba');
});
