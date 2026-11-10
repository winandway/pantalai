import { expect, test, type Download, type Page } from '@playwright/test';
import { cabecerasDePrueba, correoDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

/** Lo descargado, en memoria. */
async function leer(d: Download): Promise<Buffer> {
  const partes: Buffer[] = [];
  for await (const p of await d.createReadStream()) partes.push(p as Buffer);
  return Buffer.concat(partes);
}

/** Medidas de un JPG leyendo su cabecera (el marcador SOF), sin decodificarlo. */
function medidasJpg(b: Buffer): { ancho: number; alto: number } {
  expect(b[0]).toBe(0xff);
  expect(b[1]).toBe(0xd8);
  let i = 2;
  while (i < b.length) {
    const marca = b[i + 1]!;
    const largo = b.readUInt16BE(i + 2);
    if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca))
      return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    i += 2 + largo;
  }
  throw new Error('JPG sin medidas');
}

/** Cuenta píxeles de un JPG (en el navegador) en una franja de filas: amarillos, oscuros y azules. */
async function contar(page: Page, jpg: Buffer, desde: number, hasta: number) {
  return page.evaluate(
    async ({ b64, desde, hasta }) => {
      const datos = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const img = await createImageBitmap(new Blob([datos], { type: 'image/jpeg' }));
      const c = new OffscreenCanvas(img.width, img.height);
      const x = c.getContext('2d')!;
      x.drawImage(img, 0, 0);
      const d = x.getImageData(
        0,
        Math.floor(img.height * desde),
        img.width,
        Math.floor(img.height * (hasta - desde)),
      ).data;
      let amarillo = 0;
      let oscuro = 0;
      let azul = 0;
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, bl] = [d[i]!, d[i + 1]!, d[i + 2]!];
        if (r > 200 && g > 170 && bl < 90) amarillo++;
        else if (r < 60 && g < 60 && bl < 60) oscuro++;
        else if (bl > 150 && r < 90) azul++;
      }
      return { amarillo, oscuro, azul };
    },
    { b64: jpg.toString('base64'), desde, hasta },
  );
}

async function entrarYSubir(page: Page, archivo: string) {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(correoDePrueba('miniatura'));
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.getByLabel('Upload a video').setInputFiles(archivo);
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
}

// CANDADO C-MINIATURA: se elige un momento del video, se escribe el texto y se descarga: 1280 × 720, JPG por debajo
// de 2 MB, con el cuadro del video de fondo y el texto pintado de verdad en la franja amarilla de abajo.
test('crear la miniatura para YouTube desde un momento del video', async ({ page }) => {
  await entrarYSubir(page, 'e2e/datos/corto.mp4');
  const seccion = page.locator('[data-miniatura]');
  await expect(seccion.getByRole('heading', { name: 'Thumbnail' })).toBeVisible();
  await seccion.getByRole('slider').fill('5');
  await seccion.getByLabel('Text on the thumbnail').fill('Great tip');
  await expect(seccion.getByText('Yellow band')).toBeVisible();
  await expect(seccion.getByText('Bottom')).toBeVisible();
  // El cuadro del video ya está pintado (azul en el video de prueba): nunca un lienzo vacío.
  await expect(seccion.locator('[data-miniatura-lienzo]')).toHaveAttribute('data-modo', /webcodecs|video/);
  await expect(seccion.getByText('Getting the frame')).toHaveCount(0);
  // El plan gratis lleva la marca, igual que el video.
  await expect(seccion.getByText(/carries the small pantalay\.com mark/)).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    seccion.getByRole('button', { name: /Download thumbnail/ }).click(),
  ]);
  expect(descarga.suggestedFilename()).toBe('miniatura-corto.jpg');
  const jpg = await leer(descarga);
  expect(medidasJpg(jpg)).toEqual({ ancho: 1280, alto: 720 });
  expect(jpg.length).toBeLessThan(2_000_000);
  await expect(seccion.locator('[data-miniatura-peso]')).toHaveText(/1280 × 720 · \d+ KB/);

  // Arriba: el cuadro del video (azul), sin franja. Abajo: la franja amarilla CON letras oscuras encima.
  const arriba = await contar(page, jpg, 0.3, 0.5);
  const abajo = await contar(page, jpg, 0.55, 0.95);
  expect(arriba.azul).toBeGreaterThan(50_000);
  expect(arriba.amarillo).toBe(0);
  expect(abajo.amarillo).toBeGreaterThan(20_000);
  expect(abajo.oscuro).toBeGreaterThan(5_000);

  // Lo elegido no se pierde al recargar (borrador).
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('[data-miniatura]').getByLabel('Text on the thumbnail')).toHaveValue('Great tip');
});

// Plan B: sin WebCodecs (navegadores viejos) el cuadro sale con el elemento de video. Un video vertical va entero al
// medio con fondo desenfocado, y se puede cambiar a recortado.
test('miniatura de un video vertical sin WebCodecs (plan B)', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { VideoDecoder?: unknown }).VideoDecoder;
  });
  await entrarYSubir(page, 'e2e/datos/vertical-verde.mp4');
  const seccion = page.locator('[data-miniatura]');
  const lienzo = seccion.locator('[data-miniatura-lienzo]');
  await expect(lienzo).toHaveAttribute('data-modo', 'video', { timeout: 30_000 });
  await expect(seccion.getByText('Vertical video')).toBeVisible();
  const centro = () =>
    lienzo.evaluate((c: HTMLCanvasElement) => {
      const x = c.getContext('2d')!;
      return {
        centro: Array.from(x.getImageData(640, 200, 1, 1).data.slice(0, 3)),
        lado: Array.from(x.getImageData(60, 200, 1, 1).data.slice(0, 3)),
      };
    });
  // Entero al medio: verde en el centro; a los lados, el mismo verde pero oscurecido y borroso (no negro puro).
  await expect.poll(async () => (await centro()).centro[1]!, { timeout: 15_000 }).toBeGreaterThan(140);
  const desenfocado = await centro();
  expect(desenfocado.lado[1]!).toBeLessThan(desenfocado.centro[1]!);
  expect(desenfocado.lado[1]!).toBeGreaterThan(20);
  // Recortado: el verde llena hasta el borde.
  await seccion.getByText('Cropped to fill').click();
  await expect.poll(async () => (await centro()).lado[1]!).toBeGreaterThan(140);

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    seccion.getByRole('button', { name: /Download thumbnail/ }).click(),
  ]);
  const jpg = await leer(descarga);
  expect(medidasJpg(jpg)).toEqual({ ancho: 1280, alto: 720 });
  expect(jpg.length).toBeLessThan(2_000_000);
  await page.screenshot({ path: test.info().outputPath('miniatura-vertical.png') });

  // En el celular la página del video (con la miniatura) no se sale de la pantalla: nada se arrastra de lado.
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(seccion.getByRole('button', { name: /Download thumbnail/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
