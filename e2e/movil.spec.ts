import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), actionTimeout: 15_000, navigationTimeout: 30_000 });

// CANDADO C-MOVIL: en el celular, Videos se usa como una app de video (barra de abajo, miniaturas de borde a borde,
// Shorts a pantalla completa que se deslizan) y la página no se sale de lado.
test('Videos en el celular: barra de abajo, sin desbordes y Shorts a pantalla completa', async ({
  browser,
  request,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    extraHTTPHeaders: cabecerasDePrueba(),
  });
  const page = await ctx.newPage();
  for (const ruta of ['/', '/videos', '/videos/search?q=a', '/docs', '/shorts']) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    const [ancho, ventana] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(ancho, `${ruta} se sale de lado`).toBeLessThanOrEqual(ventana);
  }
  await page.goto('/videos');
  const barra = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(barra).toBeVisible();
  await expect(barra.getByRole('link', { name: 'Videos' })).toHaveAttribute('aria-current', 'page');
  await barra.getByRole('link', { name: 'Shorts' }).click();
  await expect(page).toHaveURL(/\/shorts/);
  // En una pantalla de computadora la barra no aparece.
  const pc = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pc.goto('/videos');
  await expect(pc.locator('.barra-inferior')).toBeHidden();

  // Shorts: si hay, uno por pantalla; al deslizar cambia el que suena y la dirección.
  const lista = (await (await request.get('/datos/red?forma=vertical&limite=2')).json()) as {
    videos: { id: string }[];
  };
  if (lista.videos.length >= 2) {
    await page.goto(`/shorts/${lista.videos[0]!.id}`);
    const primero = page.locator('.short-pantalla').first();
    await expect(primero).toHaveAttribute('aria-current', 'true');
    const alto = await primero.evaluate((n) => n.getBoundingClientRect().height);
    expect(alto).toBeGreaterThan(600);
    await page.locator('.shorts-caja').evaluate((c) => c.scrollTo({ top: c.clientHeight }));
    await expect(page.locator('.short-pantalla').nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(new RegExp(`/shorts/${lista.videos[1]!.id}$`));
  }
  // La página de un Short le dice a Google que la principal es /videos/<id>.
  const html = await (await request.get('/shorts/abc123')).text();
  expect(html).toContain('<link rel="canonical" href="https://pantalay.com/videos/abc123" />');
  await ctx.close();
});

// CANDADO C-PWA: Pantalay se puede instalar (manifiesto con íconos, ayudante activo) y sin internet muestra
// «Sin conexión» en vez de la página de error del navegador.
test('app instalable y página sin conexión', async ({ page, context, request }) => {
  const m = (await (await request.get('/manifest.webmanifest')).json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { sizes: string; purpose: string }[];
  };
  expect(m.display).toBe('standalone');
  expect(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
  expect(m.icons.some((i) => i.sizes === '192x192')).toBe(true);
  for (const i of ['/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/sw.js', '/offline'])
    expect((await request.get(i)).status(), i).toBe(200);

  await page.goto('/docs');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto('/una-pagina-que-nunca-se-abrio');
  await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible();
  await page.goto('/docs');
  await expect(page.locator('#raiz')).not.toBeEmpty();
  await context.setOffline(false);
});
