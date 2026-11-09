import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO «video protagonista» (Richard, 9 nov 2026): en el Short 9:16, un video vertical va grande y de protagonista,
// con la cámara pequeña arriba y sin letras de sobra (ni el nombre del programa ni el tema).
test('Short 9:16 con un TikTok: el video es el protagonista', async ({ page }) => {
  await page.route('https://www.tiktok.com/player/v1/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><body style="margin:0;background:#00c853">',
    }),
  );
  await page.route('**/datos/oembed?**', (r) =>
    r.fulfill({
      json: {
        plataforma: 'tiktok',
        id: '7691731841765690645',
        vertical: true,
        insertable: true,
        titulo: '',
        autor: '',
        creador: '@creadora.prueba',
      },
    }),
  );
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.protagonista.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.getByText('Vertical 9:16').click();
  await page
    .getByLabel('YouTube or TikTok link')
    .fill('https://www.tiktok.com/@creadora.prueba/video/7691731841765690645');
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.getByRole('radio', { name: /Video in the spotlight/ })).toBeChecked();

  const total = (await page.locator('[data-escenario]').boundingBox())!;
  const cam = (await page.locator('.escenario-camara .escenario-caja').boundingBox())!;
  const vid = (await page.locator('.escenario-video .escenario-caja').boundingBox())!;
  expect(Math.abs(vid.width / vid.height - 9 / 16)).toBeLessThan(0.02);
  expect(vid.height / total.height).toBeGreaterThan(0.7); // el video manda
  expect(cam.height / total.height).toBeLessThan(0.22); // la cámara, pequeña
  expect(cam.y + cam.height).toBeLessThan(vid.y); // arriba
  await expect(page.locator('.escenario-programa')).toBeHidden();
  await expect(page.locator('.escenario-tema')).toBeHidden();
  await expect(page.locator('.escenario .cartel-video')).toContainText('@creadora.prueba');

  // La otra posición sigue ahí para quien la quiera.
  await page.getByText('Big camera on top').click();
  const cam2 = (await page.locator('.escenario-camara .escenario-caja').boundingBox())!;
  expect(cam2.height).toBeGreaterThan(cam.height * 1.5);
});
