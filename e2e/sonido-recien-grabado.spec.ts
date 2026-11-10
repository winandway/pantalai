import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-SONIDO-RECIEN-GRABADO (9 nov 2026, Richard): justo después de grabar, al darle play el video se trababa
// sin sonido hasta recargar la página. Causa: el archivo se reordena y cambia de tamaño con la misma dirección, y el
// navegador mezclaba la versión vieja guardada con la nueva («data source error»). Ahora cada versión tiene su
// dirección y la página se pone al día sola. La prueba: grabar, esperar todo el proceso, y el video suena entero.
test('el video recién grabado se reproduce entero sin recargar', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.son.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/record');
  await page.getByText('Screen + Cam').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByText('Recording', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;
  // Se espera a que termine todo lo de fondo (el reordenado del archivo, si Chrome grabó en MP4).
  await expect
    .poll(
      async () =>
        (
          (await (await page.request.get(`/datos/videos/${id}`)).json()) as {
            video: { tiene_mp4: boolean };
          }
        ).video.tiene_mp4,
      { timeout: 90_000 },
    )
    .toBe(true);
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const w = window as unknown as { __errores: string[] };
    w.__errores = [];
    document.addEventListener(
      'error',
      (e) => {
        const v = e.target as HTMLVideoElement;
        if (v.tagName === 'VIDEO') w.__errores.push(v.error?.message ?? 'error');
      },
      true,
    );
  });
  await page.locator('.reproductor-pantalla').click();
  // Sigue avanzando más allá del primer pedazo descargado, y con sonido decodificado.
  await expect
    .poll(
      () =>
        page.evaluate(() => (document.querySelector('.reproductor video') as HTMLVideoElement).currentTime),
      {
        timeout: 15_000,
      },
    )
    .toBeGreaterThan(4);
  const estado = await page.evaluate(() => {
    const v = document.querySelector('.reproductor video') as HTMLVideoElement & {
      webkitAudioDecodedByteCount?: number;
    };
    return {
      error: v.error?.message ?? null,
      muted: v.muted,
      audio: v.webkitAudioDecodedByteCount ?? 1,
      errores: (window as unknown as { __errores: string[] }).__errores,
    };
  });
  expect(estado.error).toBeNull();
  expect(estado.errores).toEqual([]);
  expect(estado.muted).toBe(false);
  expect(estado.audio).toBeGreaterThan(0);
});
