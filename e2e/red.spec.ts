import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), actionTimeout: 15_000, navigationTimeout: 30_000 });

// CANDADO C-RED-VIDEOS: un video listo se publica en «Videos», se ve con la estructura de una plataforma de video
// (reproductor, me gusta, más videos), sale en el carrusel de la portada y Google lo lee como video.
test('publicar un video en la red de Pantalay', async ({ page, browser, request }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.red.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.getByLabel('Upload a video').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;

  // Publicar pide aceptar las reglas.
  await page.getByRole('button', { name: /Publish on Pantalay/ }).click();
  const publicar = page.getByRole('dialog');
  await expect(publicar.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  await publicar.getByRole('checkbox').check();
  await publicar.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('link', { name: /Published · See it in Videos/ })).toHaveAttribute(
    'href',
    `/videos/${id}`,
  );

  // En «Videos» aparece y se abre con su página.
  await page.locator('.encabezado-nav').getByRole('link', { name: 'Videos' }).click();
  await expect(page).toHaveURL(/\/videos$/);
  // La red se ve llena desde el principio: banner y espacios vacíos hasta 30.
  await expect(page.locator('.red-banner')).toBeVisible();
  const reales = await page.locator('.red-cuadricula .red-tarjeta:not(.red-vacia)').count();
  await expect(page.locator('.red-cuadricula .red-vacia')).toHaveCount(Math.max(0, 30 - reales));
  await page.locator(`a[href="/videos/${id}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/videos/${id}$`));
  await expect(page.locator('.red-ver-titulo')).toHaveText('vertical-verde');
  await expect(page.locator('.red-ver-reproductor video')).toBeVisible();
  // Más videos a la derecha, completados con espacios vacíos hasta 10.
  await expect(page.locator('.red-ver-lado .red-tarjeta')).toHaveCount(10);
  // El nombre del autor lleva a su perfil, con banner y sus videos.
  await page.locator('.red-ver-autor a').click();
  await expect(page).toHaveURL(/\/channel\/[A-Za-z0-9_-]+$/);
  await expect(page.locator('.red-canal-portada')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Soporte E2E' })).toBeVisible();
  await expect(page.locator(`.red-cuadricula a[href="/videos/${id}"]`)).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: /Like · 0/ }).click();
  await expect(page.getByRole('button', { name: /Liked · 1/ })).toBeVisible();

  // Denunciar: llega al equipo.
  await page.getByRole('button', { name: /Report/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('Thanks. Our team will review it.')).toBeVisible();

  // Lo que lee Google: datos de video y el mapa del sitio.
  const html = await (await request.get(`/videos/${id}`)).text();
  expect(html).toContain('"@type":"VideoObject"');
  expect(html).toContain('<title>vertical-verde · Pantalay</title>');
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`/videos/${id}</loc>`);

  // El carrusel de la portada (sin sesión) lo muestra y lleva a la red.
  const anonimo = await browser.newContext({ extraHTTPHeaders: cabecerasDePrueba() });
  const portada = await anonimo.newPage();
  await portada.goto('/');
  const enCarrusel = portada.locator(`.red-carrusel a[href="/videos/${id}"]`).first();
  await expect(enCarrusel).toBeVisible();
  // Al pasar el mouse el carrusel se detiene (así una persona puede tocar una tarjeta).
  await portada.locator('.red-carrusel-ventana').hover();
  await expect(portada.locator('.red-carrusel-cinta')).toHaveCSS('animation-play-state', 'paused');
  await enCarrusel.click({ force: true });
  await expect(portada).toHaveURL(new RegExp(`/videos/${id}$`));
  // Sin sesión, «Me gusta» manda a entrar.
  await portada.getByRole('button', { name: /Like/ }).click();
  await expect(portada).toHaveURL(/\/login/);
  await anonimo.close();

  // El dueño lo quita y sale de la red.
  await page.goto(`/v/${id}`);
  await page
    .getByRole('button', { name: /More options|Más opciones|⋮/ })
    .last()
    .click();
  await page.getByRole('menuitem', { name: 'Remove from Videos' }).click();
  await expect(page.getByRole('button', { name: /Publish on Pantalay/ })).toBeVisible();
  expect(await (await request.get(`/datos/red/${id}`)).status()).toBe(404);
});
