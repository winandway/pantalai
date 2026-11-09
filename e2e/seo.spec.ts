import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-SEO-IDIOMAS: cada página pública existe en inglés y en español con su propia dirección, y se ve en su idioma.
test('las páginas por búsqueda y el español con su dirección', async ({ page, request }) => {
  // Lo que recibe Google sin JavaScript.
  const html = await (await request.get('/es/screen-recorder')).text();
  expect(html).toContain('<html lang="es">');
  expect(html).toContain('<title>Grabar pantalla gratis online, sin descargar | Pantalay</title>');
  expect(html).toContain('hreflang="en" href="https://pantalay.com/screen-recorder"');
  const mapa = await (await request.get('/sitemap.xml')).text();
  expect(mapa).toContain('<loc>https://pantalay.com/es/reaction-video-maker</loc>');

  // Lo que ve la persona.
  await page.goto('/es/screen-recorder');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Grabador de pantalla gratis, directo en tu navegador',
  );
  await expect(page.getByRole('link', { name: /Grabar mi pantalla gratis/ }).first()).toHaveAttribute(
    'href',
    '/signup',
  );
  // Los enlaces internos siguen en español.
  await expect(page.locator('.pie-herramientas a').first()).toHaveAttribute('href', /^\/es\//);

  await page.goto('/reaction-video-maker');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make reaction videos like a pro podcast');

  // Cambiar de idioma en una página pública lleva a su gemela.
  await page.locator('.selector-idioma button').first().click();
  await page.getByText('español - ES').click();
  await expect(page).toHaveURL(/\/es\/reaction-video-maker$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Haz videos de reacción como un podcast profesional',
  );

  // La portada y Docs en español.
  await page.goto('/es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.goto('/es/docs/start-here');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Empieza aquí');
});
