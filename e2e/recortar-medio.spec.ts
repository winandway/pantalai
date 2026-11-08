import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-RECORTE-MEDIO: los cortes del medio (silencios, cortar por texto) también salen en el MP4 descargado,
// no solo en el reproductor. Se graban 10 s de verdad, se cortan 2 s y 3 s del medio, y se mide el MP4.
test('los cortes del medio no salen en el MP4 descargado', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.medio.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen only').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  await page.waitForTimeout(10_000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;

  const puede = await page.evaluate(async () => {
    try {
      const v = await VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 640, height: 480 });
      const a = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
      });
      return Boolean(v.supported && a.supported);
    } catch {
      return false;
    }
  });
  test.skip(!puede, 'Este navegador no codifica H.264/AAC: se omite la parte MP4.');

  // Espera la primera copia MP4 (entera) y la mide.
  const medir = () =>
    page.evaluate(async (i) => {
      const b = await (await fetch(`/media/${i}/video?descargar=1`)).blob();
      const v = document.createElement('video');
      v.src = URL.createObjectURL(b);
      return new Promise<number>((ok) =>
        v.addEventListener('loadedmetadata', () => ok(v.duration), { once: true }),
      );
    }, id);
  await expect(page.getByRole('link', { name: /Download MP4/ })).toBeVisible({ timeout: 90_000 });
  const entero = await medir();
  expect(entero).toBeGreaterThan(9);

  // Dos cortes del medio, igual que los que deja «Quitar silencios» o «cortar por texto».
  const r = await page.request.patch(`/datos/videos/${id}`, {
    headers: { 'x-pantalai': '1' },
    data: {
      cortes: [
        { inicio: 2, fin: 4 },
        { inicio: 6, fin: 9 },
      ],
    },
  });
  expect(r.ok()).toBe(true);
  expect(((await r.json()) as { video: { tiene_mp4: boolean } }).video.tiene_mp4).toBe(false);

  // Al abrir el video, el navegador del dueño rehace la copia con los cortes.
  await page.goto(`/v/${id}`);
  await expect(page.getByRole('link', { name: /Download MP4/ })).toBeVisible({ timeout: 90_000 });
  const cortado = await medir();
  // 5 s menos que el entero (con medio segundo de holgura por los cuadros del borde).
  expect(cortado).toBeGreaterThan(entero - 5.6);
  expect(cortado).toBeLessThan(entero - 4.4);
});
