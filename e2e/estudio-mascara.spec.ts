import { expect, test, type Page } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-MASCARAS (fase 3): una máscara propia (estilo noticiero, nombre del programa, logo y colores) se guarda en
// la cuenta, vuelve al recargar y SALE EN LA GRABACIÓN: en el escenario 16:9, en el vertical 9:16 y cuando la segunda
// tarjeta es un invitado remoto. Se comprueba en los píxeles del MP4 (FFmpeg), no solo en la página.
const NARANJA = '#ff7a00';
const FONDO = '#1030a0';

type Caja = { x: number; y: number; width: number; height: number };
/** Un punto de la página → fracción dentro del escenario (lo grabado es exactamente el escenario). */
async function fraccion(page: Page, fx: (c: Record<string, Caja>) => { x: number; y: number }) {
  const cajas: Record<string, Caja> = {};
  for (const [n, sel] of Object.entries({
    total: '[data-escenario]',
    cabeza: '.escenario-cabeza',
    programa: '.escenario-programa',
    logo: '.escenario-logo img',
  }))
    cajas[n] = (await page.locator(sel).boundingBox())!;
  const p = fx(cajas);
  const t = cajas.total!;
  return { x: (p.x - t.x) / t.width, y: (p.y - t.y) / t.height };
}

/** Puntos a revisar: el centro del logo, la franja del noticiero a la derecha del programa y la esquina del fondo. */
async function puntos(page: Page) {
  const logo = await fraccion(page, (c) => ({
    x: c.logo!.x + c.logo!.width / 2,
    y: c.logo!.y + c.logo!.height / 2,
  }));
  const franja = await fraccion(page, (c) => ({
    x:
      c.programa!.x +
      c.programa!.width +
      (c.cabeza!.x + c.cabeza!.width - c.programa!.x - c.programa!.width) / 2,
    y: c.cabeza!.y + c.cabeza!.height / 2,
  }));
  return { logo, franja };
}

async function grabar(page: Page) {
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split('/')[2]!;
  const archivo = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  if (process.env.DEPURAR) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`test-results/mascara-${Date.now()}.mp4`, archivo);
  }
  return examinarVideo(archivo);
}

function revisar(
  cuadro: (x: number, y: number) => number[],
  p: { logo: { x: number; y: number }; franja: { x: number; y: number } },
  esquina: { x: number; y: number },
) {
  const [lr, lg, lb] = cuadro(p.logo.x, p.logo.y) as [number, number, number];
  expect(lr, 'logo amarillo').toBeGreaterThan(190);
  expect(lg, 'logo amarillo').toBeGreaterThan(160);
  expect(lb, 'logo amarillo').toBeLessThan(110);
  const [fr, fg, fb] = cuadro(p.franja.x, p.franja.y) as [number, number, number];
  expect(fr, 'franja naranja').toBeGreaterThan(200);
  expect(fg, 'franja naranja').toBeGreaterThan(70);
  expect(fg, 'franja naranja').toBeLessThan(175);
  expect(fb, 'franja naranja').toBeLessThan(90);
  const [er, , eb] = cuadro(esquina.x, esquina.y) as [number, number, number];
  expect(eb - er, 'fondo azul').toBeGreaterThan(40);
}

test('máscara propia: se guarda, vuelve y sale en la grabación (16:9, 9:16 e invitado)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.mascara.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');

  // Un logo amarillo hecho aquí mismo (nada de imágenes de nadie).
  const logo = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffd400';
    g.fillRect(0, 0, 160, 160);
    return c.toDataURL('image/png').split(',')[1]!;
  });

  await page.getByRole('button', { name: /Customize/ }).click();
  await page.locator('#mascara-estilo').selectOption('noticiero');
  await page.locator('#mascara-nombre').fill('Friday show');
  await page.locator('#mascara-programa').fill('Morning Show');
  await page.locator('#mascara-anfitrion').fill('Alex');
  await page.locator('#mascara-rol').fill('Presenter');
  await page.locator('[data-color=principal]').fill(NARANJA);
  await page.locator('[data-color=fondo]').fill(FONDO);
  await page
    .locator('[data-archivo-imagen="logo-mascara"]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(logo, 'base64') });
  await expect(page.locator('.mascara-logo-vista')).toBeVisible();
  // Vista previa en vivo, antes de guardar.
  await expect(page.locator('[data-escenario]')).toHaveAttribute('data-mascara', 'noticiero');
  await expect(page.locator('.escenario-programa')).toHaveText('Morning Show');
  // Lo escrito no se pierde: se recarga a mitad y el formulario vuelve con todo (también el logo).
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('#mascara-programa')).toHaveValue('Morning Show');
  await expect(page.locator('.mascara-logo-vista')).toBeVisible();
  await page.getByRole('button', { name: 'Save mask' }).click();
  await expect(page.locator('[data-editor-mascara]')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Friday show' })).toBeChecked();

  // Guardada en la cuenta: vuelve al recargar, con su logo servido por Pantalay.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Friday show' })).toBeChecked();
  await expect(page.locator('.escenario-logo img')).toHaveAttribute(
    'src',
    /\/media\/mascaras\/[a-z0-9]{12}\/logo/,
  );
  await expect(page.locator('.escenario-camara .cartel').first()).toContainText('Alex · Presenter');
  await expect(page.locator('.escenario-programa')).toHaveText('Morning Show');

  // 1) 16:9 con un video de la computadora.
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await expect(page.locator('.escenario-logo img')).toBeVisible();
  const h = await puntos(page);
  if (process.env.DEPURAR) console.log('puntos 16:9', JSON.stringify(h));
  const examen16 = await grabar(page);
  expect(examen16.medidas).toEqual(['1920,1080']);
  revisar(examen16.cuadro(1), h, { x: 0.01, y: 0.98 });

  // 2) Vertical 9:16, con la cámara grande arriba (donde va la cabecera con el logo y el programa).
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await page.getByText('Vertical 9:16').click();
  await page.getByText('Big camera on top').click();
  await expect(page.locator('.escenario-logo img')).toBeVisible();
  const v = await puntos(page);
  const examen9 = await grabar(page);
  expect(examen9.medidas).toEqual(['1080,1920']);
  revisar(examen9.cuadro(1), v, { x: 0.06, y: 0.012 });

  // 3) Con un invitado remoto en la segunda tarjeta: la máscara es la misma.
  await page.goto('/studio');
  await page.getByText('Horizontal 16:9').click();
  await page.getByText('A remote guest').click();
  await expect(page.locator('.escenario-logo img')).toBeVisible();
  const g = await puntos(page);
  const examenInv = await grabar(page);
  revisar(examenInv.cuadro(1), g, { x: 0.01, y: 0.98 });
});
