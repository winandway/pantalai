import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-KARAOKE: el botón Karaoke del Estudio enciende la cadena de voz (EQ, compresor, reverb, eco) con el efecto
// en 50 por defecto; se graba de verdad, con sonido y sin saturar.
test('grabar con Karaoke en el Estudio', async ({ page }) => {
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.karaoke.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();

  const karaoke = page.getByRole('button', { name: /Karaoke/ });
  await expect(karaoke).toHaveAttribute('aria-pressed', 'false');
  await karaoke.click();
  await expect(karaoke).toHaveAttribute('aria-pressed', 'true');
  const efecto = page.getByRole('slider', { name: 'Effect' });
  await expect(efecto).toHaveValue('50');
  await expect(page.getByLabel(/I’m using headphones/)).toBeChecked();
  // Queda guardado: al volver al Estudio sigue encendido.
  await page.waitForTimeout(1200); // el borrador se guarda medio segundo después de tocar
  await page.reload();
  await expect(page.getByRole('button', { name: /Karaoke/ })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();

  await page.getByRole('button', { name: /Play/ }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page
    .getByRole('dialog', { name: 'Check before recording' })
    .getByRole('button', { name: 'All good, record' })
    .click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  // Mientras se graba, el botón no se puede cambiar, pero el efecto sí.
  await expect(page.getByRole('button', { name: /Karaoke/ })).toBeDisabled();
  await page.getByRole('slider', { name: 'Effect' }).fill('80');
  // La barra de abajo no tapa el escenario (lo tapado no sale en el video), también con Karaoke encendido.
  const fijo = (await page.locator('[data-escenario]').boundingBox())!;
  const barra = (await page.locator('.estudio-controles').boundingBox())!;
  expect(fijo.y + fijo.height).toBeLessThanOrEqual(barra.y + 1);
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split('/')[2]!;
  const archivo = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  const examen = await examinarVideo(archivo);
  const pico = examen.picoDb();
  expect(pico).toBeGreaterThan(-60); // hay sonido
  // Y no satura: el mezclador corta en −3 dB y el codificador del archivo sube un poco los picos (C-MEZCLA-SIN-SATURAR).
  expect(pico).toBeLessThanOrEqual(-1);
});
