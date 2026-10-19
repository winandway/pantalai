import { expect, test } from '@playwright/test';

// CANDADO C-GRABAR-PUNTA-A-PUNTA: crea cuenta, graba pantalla + cámara de verdad,
// sube por partes, y el video queda listo, con duración y reproducible.
test('grabar, subir y ver un video', async ({ page }) => {
  const correo = `e2e.${Date.now()}@example.com`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen + Cam').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByText('Recording', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(7000);
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.getByText('Paused')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Resume/ }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Finish/ }).click();

  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;
  const datos = await page.evaluate(
    async (i) =>
      (await (await fetch(`/datos/videos/${i}`)).json()) as {
        video: { estado: string; duracion: number; bytes: number; tiene_miniatura: boolean };
      },
    id,
  );
  expect(datos.video.estado).toBe('listo');
  expect(datos.video.duracion).toBeGreaterThan(7);
  expect(datos.video.duracion).toBeLessThan(13); // la pausa no cuenta
  expect(datos.video.bytes).toBeGreaterThan(10_000);
  expect(datos.video.tiene_miniatura).toBe(true);

  // El archivo trae su duración escrita (se puede adelantar y la barra no queda en «infinito»).
  const duracion = await page.evaluate(
    () =>
      new Promise<number>((ok) => {
        const v = document.querySelector('.reproductor video') as HTMLVideoElement;
        if (v.readyState >= 1) ok(v.duration);
        else v.addEventListener('loadedmetadata', () => ok(v.duration), { once: true });
      }),
  );
  expect(Number.isFinite(duracion)).toBe(true);
  expect(duracion).toBeGreaterThan(7);
  await page.evaluate(() => {
    const v = document.querySelector('.reproductor video') as HTMLVideoElement;
    v.currentTime = 4;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/video-grabado.png' });
});
