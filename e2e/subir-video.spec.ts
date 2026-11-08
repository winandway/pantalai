import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-SUBIR-VIDEO: un MP4 de la computadora se sube desde la Biblioteca y queda como video con su enlace.
test('subir un video desde la computadora', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.subir.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.getByLabel('Upload a video').setInputFiles('e2e/datos/fragmentado.mp4');
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;
  await expect(page.getByRole('heading', { name: 'fragmentado' })).toBeVisible();
  // El video se reproduce desde la nube con su duración.
  const segundos = await page.evaluate(async (i) => {
    const v = document.createElement('video');
    v.src = `/media/${i}/video`;
    return new Promise<number>((ok) =>
      v.addEventListener('loadedmetadata', () => ok(v.duration), { once: true }),
    );
  }, id);
  expect(segundos).toBeGreaterThan(1);

  // Un archivo que no es video no se sube y se explica por qué.
  await page.goto('/library');
  await page.getByLabel('Upload a video').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from([1, 2, 3]),
  });
  await expect(page.getByRole('alert')).toHaveText('Choose an MP4 or WebM video file.');
});
