import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

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
    .getByLabel('YouTube, TikTok or Pantalay link')
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

// Video de la computadora (Richard, 9 nov 2026: «o carga el link o carga el video de forma manual»): se elige el
// archivo, se reproduce dentro del escenario (no se sube a ningún lado), lo manejan nuestros botones, un video
// vertical elige solo la posición grande y sale en la grabación.
test('reaccionar a un video de la computadora', async ({ page }) => {
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.archivo.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await expect(page.getByRole('button', { name: /Upload a video from my computer/ })).toBeVisible();
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await expect(page.locator('.estudio-archivo')).toContainText('vertical-verde.mp4');
  await expect(page.locator('#estudio-tema')).toHaveValue('vertical-verde');
  // Es vertical: elige solo la posición grande.
  await expect(page.getByRole('radio', { name: /Big vertical video/ })).toBeChecked();
  await page.locator('#estudio-creador').fill('@creadora.prueba');
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();
  // Arranca siempre: ningún aviso de «no arrancó».
  await page.waitForTimeout(4500);
  await expect(page.getByText('did not start')).toHaveCount(0);

  const total = (await page.locator('[data-escenario]').boundingBox())!;
  const caja = (await page.locator('.escenario-video .escenario-caja').boundingBox())!;
  const centro = {
    x: (caja.x + caja.width / 2 - total.x) / total.width,
    y: (caja.y + caja.height / 2 - total.y) / total.height,
  };
  await page.getByRole('button', { name: /Back 5 s/ }).click(); // vuelve al principio (el video dura 4 s)
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split('/')[2]!;
  const archivo = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  const examen = await examinarVideo(archivo);
  expect(examen.medidas).toEqual(['1920,1080']);
  const [rojo, verde] = examen.cuadro(1)(centro.x, centro.y) as [number, number, number];
  expect(verde).toBeGreaterThan(140);
  expect(rojo).toBeLessThan(90);

  // Y el enlace de un video de Pantalay (de la propia biblioteca) también se puede pegar en el Estudio.
  const enlace = page.url();
  await page.goto('/studio');
  await page.getByLabel('YouTube, TikTok or Pantalay link').fill(enlace);
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.locator('.escenario video.video-local')).toHaveAttribute('src', `/media/${id}/video`);
  await expect(page.locator('.estudio-archivo')).toContainText('Pantalay library');
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();
});
