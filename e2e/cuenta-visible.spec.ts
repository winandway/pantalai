import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-CUENTA-VISIBLE (10 nov 2026, Richard): la cuenta 3, 2, 1 salía chiquita en la barra de abajo a la derecha
// y no se veía. Ahora sale grande en el centro, encima del escenario, y NO queda en el video.
test('la cuenta 3, 2, 1 se ve grande en el centro y no sale en el video', async ({ page }) => {
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.cuenta.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page
    .getByRole('dialog', { name: 'Check before recording' })
    .getByRole('button', { name: 'All good, record' })
    .click();

  // Se mide TODO de una sola vez, dentro de la página y apenas aparece el número: la cuenta dura 3 s y en la máquina
  // lenta de GitHub ya no existía cuando la prueba volvía a preguntar (falló así el 14 y el 25 nov 2026).
  const medidas = await page
    .waitForFunction(
      () => {
        const s = document.querySelector('.escenario-cuenta span');
        const e = document.querySelector('[data-escenario]');
        if (!s || !e || !/^[321]$/.test(s.textContent ?? '')) return null;
        const caja = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
        const numero = caja(s.getBoundingClientRect());
        return numero.height > 0 ? { numero, esc: caja(e.getBoundingClientRect()) } : null;
      },
      null,
      { timeout: 20_000, polling: 'raf' },
    )
    .then((h) => h.jsonValue());
  const { numero, esc } = medidas!;
  // Grande y en el centro del escenario, a la vista.
  expect(numero.height).toBeGreaterThan(120);
  const cx = numero.x + numero.width / 2;
  const cy = numero.y + numero.height / 2;
  expect(Math.abs(cx - (esc.x + esc.width / 2))).toBeLessThan(esc.width * 0.1);
  expect(Math.abs(cy - (esc.y + esc.height / 2))).toBeLessThan(esc.height * 0.15);
  // A la vista entera, medido con la MISMA caja: la cuenta dura 3 s y en una máquina lenta ya no existe si se
  // vuelve a preguntar al navegador (así falló en GitHub el 14 nov 2026 con «element(s) not found»).
  const vista = page.viewportSize()!;
  expect(numero.x).toBeGreaterThanOrEqual(0);
  expect(numero.y).toBeGreaterThanOrEqual(0);
  expect(numero.x + numero.width).toBeLessThanOrEqual(vista.width);
  expect(numero.y + numero.height).toBeLessThanOrEqual(vista.height);
  // Fuera del escenario (lo que se graba es el escenario).
  expect(await page.locator('[data-escenario] .escenario-cuenta').count()).toBe(0);

  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await expect(page.locator('.escenario-cuenta')).toHaveCount(0);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split('/')[2]!;
  const archivo = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  const examen = await examinarVideo(archivo);
  // El primer instante del video no trae el círculo rojo del número en el centro.
  const [r, g, b] = examen.cuadro(0.05)(0.5, 0.5) as [number, number, number];
  expect(r > 180 && g < 110 && b < 110).toBe(false);
});
