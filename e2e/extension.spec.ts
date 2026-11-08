import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext, type Worker } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

// CANDADOS C-EXTENSION y C-REPORTE-ERROR: la extensión de Chrome cargada DE VERDAD (Chromium de Playwright; el Chrome
// de marca ya no deja cargar extensiones con --load-extension). Se usa la versión de pruebas (.dist-extension-pruebas):
// igual a la publicada, pero con permiso fijo sobre 127.0.0.1, porque Playwright no puede tocar la ventanita ni los
// atajos de Chrome que dan «activeTab». Las funciones que se llaman son las mismas que usan la ventanita y los atajos.

const DIR = resolve('.dist-extension-pruebas');
let ctx: BrowserContext;
let fondo: Worker;
let base: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browserName }, info) => {
  void browserName;
  execFileSync('node', ['scripts/extension.mjs', '--pruebas'], { stdio: 'inherit' });
  base = (info.project.use.baseURL as string) ?? 'http://127.0.0.1:8787';
  ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pantalay-ext-')), {
    channel: 'chromium',
    headless: true,
    baseURL: base,
    extraHTTPHeaders: cabecerasDePrueba(),
    permissions: ['camera', 'microphone'],
    locale: 'en-US',
    args: [
      '--lang=en-US',
      `--disable-extensions-except=${DIR}`,
      `--load-extension=${DIR}`,
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--auto-accept-this-tab-capture',
      '--auto-select-tab-capture-source-by-title=Pantalay',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  fondo = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  // Páginas de prueba servidas en la misma dirección del sitio local (127.0.0.1), como cualquier sitio web.
  await ctx.route(`${base}/prueba-dibujo`, (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Pagina de prueba</title><body style="margin:0;background:#fff;height:100vh"><h1>Hola</h1></body>',
    }),
  );
  await ctx.route(`${base}/prueba-reporte`, (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Tienda de prueba</title><body>
        <button id="pagar" onclick="console.error('fallo-de-prueba'); fetch('/datos/salud?token=secreto123'); setTimeout(() => { throw new Error('excepcion-de-prueba'); })">Pay</button>
      </body>`,
    }),
  );
});

test.afterAll(async () => {
  await ctx?.close();
});

/** Id de la pestaña de Chrome que tiene abierta esa ruta. */
async function idPestana(ruta: string): Promise<number> {
  return fondo.evaluate(async (r) => {
    const [t] = await chrome.tabs.query({ url: `http://127.0.0.1/${r}*` });
    return t!.id!;
  }, ruta);
}

type Api = {
  capa(id: number, q: string): Promise<unknown>;
  empezarReporte(id: number, origen: string): Promise<{ ok: boolean }>;
};

test('dibujar encima de una página cualquiera y resaltar el cursor', async () => {
  const page = await ctx.newPage();
  await page.goto('/prueba-dibujo');
  const id = await idPestana('prueba-dibujo');

  // Lo mismo que el atajo Alt+Shift+A o «Dibujar sobre esta página» en la ventanita.
  const estado = await fondo.evaluate(
    ([i]) => (globalThis as unknown as { pantalay: Api }).pantalay.capa(i!, 'dibujo'),
    [id],
  );
  expect(estado).toEqual({ dibujo: true, cursor: false });
  const barra = page.locator('#pantalay-capa [role="toolbar"]');
  await expect(barra).toBeVisible();
  // Primero otro color y después el rojo (en macOS, Chrome usa el idioma del sistema).
  await barra.getByRole('button', { name: /^(Blue|Azul)$/ }).click();
  await barra.getByRole('button', { name: /^(Red|Rojo)$/ }).click();

  const vp = page.viewportSize()!;
  const y = Math.round(vp.height / 2);
  await page.mouse.move(vp.width * 0.2, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(vp.width * (0.2 + i * 0.05), y);
  await page.mouse.up();

  // ¿Cuántos píxeles rojos hay en la capa, sobre la raya?
  const rojos = () =>
    page.evaluate(() => {
      const c = document.getElementById('pantalay-capa')!.shadowRoot!.querySelector('canvas')!;
      const fila = c.getContext('2d')!.getImageData(0, Math.round(c.height / 2), c.width, 1).data;
      let n = 0;
      for (let i = 0; i < fila.length; i += 4)
        if (fila[i]! > 200 && fila[i + 1]! < 90 && fila[i + 2]! < 90 && fila[i + 3]! > 200) n++;
      return n / c.width;
    });
  await expect.poll(rojos, { timeout: 5000 }).toBeGreaterThan(0.4);

  // Esc deja de dibujar: la barra se va, la página vuelve a recibir clics y el dibujo se queda.
  await page.keyboard.press('Escape');
  await expect(barra).toBeHidden();
  expect(await rojos()).toBeGreaterThan(0.4);
  const recibe = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return el?.id !== 'pantalay-capa';
  });
  expect(recibe).toBe(true);

  // Énfasis del cursor (Alt+Shift+C): el círculo sigue al puntero.
  const conCursor = await fondo.evaluate(
    ([i]) => (globalThis as unknown as { pantalay: Api }).pantalay.capa(i!, 'cursor'),
    [id],
  );
  expect(conCursor).toEqual({ dibujo: false, cursor: true });
  await page.mouse.move(300, 200);
  const circulo = page.locator('#pantalay-capa .cursor');
  await expect(circulo).toBeVisible();
  await expect
    .poll(() => circulo.evaluate((el) => getComputedStyle(el).transform))
    .toMatch(/matrix\(1, 0, 0, 1, 300, 200\)/);
  await page.close();
});

test('reporte de error: la consola y la red de otra pestaña llegan al video', async () => {
  const cuenta = await ctx.newPage();
  await cuenta.goto('/signup');
  await cuenta.getByLabel('Your name').fill('Soporte E2E');
  await cuenta.getByLabel('Email').fill(`e2e.reporte.${Date.now()}@example.com`);
  await cuenta.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await cuenta.getByRole('button', { name: 'Create account' }).click();
  await expect(cuenta).toHaveURL(/\/library/);
  await cuenta.close();

  const tienda = await ctx.newPage();
  await tienda.goto('/prueba-reporte');
  const id = await idPestana('prueba-reporte');

  // Lo mismo que «Grabar un reporte de error» en la ventanita: abre Pantalay en modo reporte.
  const [grabar] = await Promise.all([
    ctx.waitForEvent('page'),
    fondo.evaluate(
      ([i, o]) =>
        (globalThis as unknown as { pantalay: Api }).pantalay.empezarReporte(i as number, o as string),
      [id, base] as const,
    ),
  ]);
  await expect(grabar).toHaveURL(/\/record\?reporte=1&ext=[a-p]{32}$/);
  await expect(grabar.getByTestId('franja-reporte')).toContainText('Tienda de prueba');

  await grabar.getByText('Screen only').click();
  await grabar.getByRole('button', { name: 'Start recording' }).click();
  await expect(grabar.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 20_000 });

  // El fallo pasa en la otra pestaña mientras se graba.
  await grabar.waitForTimeout(1500);
  await tienda.locator('#pagar').click();
  await grabar.waitForTimeout(2500);
  await grabar.getByRole('button', { name: /Finish/ }).click();
  await expect(grabar).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const video = grabar.url().split('/v/')[1]!;

  // El servidor los tiene, limpios y alineados con el video.
  const r = (await grabar.evaluate(
    async (v) => (await fetch(`/datos/videos/${v}/registros`)).json(),
    video,
  )) as {
    consola: { s: number; nivel: string; texto: string }[];
    red: { url: string; estado: number }[];
    pagina: { titulo: string };
  };
  const error = r.consola.find((e) => e.texto === 'fallo-de-prueba')!;
  expect(error.nivel).toBe('error');
  expect(error.s).toBeGreaterThan(0.5);
  expect(error.s).toBeLessThan(6);
  expect(r.consola.some((e) => e.nivel === 'excepcion' && e.texto.includes('excepcion-de-prueba'))).toBe(
    true,
  );
  expect(r.red.some((e) => e.url.endsWith('/datos/salud?token=[hidden]') && e.estado === 200)).toBe(true);
  expect(JSON.stringify(r)).not.toContain('secreto123');
  expect(r.pagina.titulo).toBe('Tienda de prueba');

  // Y se ven en la página del video, en la pestaña «Console & network»; tocar una fila lleva el video a ese segundo.
  await grabar.getByRole('tab', { name: 'Console & network' }).click();
  const panel = grabar.getByTestId('panel-registros');
  await expect(panel).toContainText('fallo-de-prueba');
  await expect(panel).toContainText('excepcion-de-prueba');
  await expect(panel).toContainText('token=[hidden]');
  await panel.locator('.registro', { hasText: 'fallo-de-prueba' }).click();
  await expect
    .poll(() => grabar.evaluate(() => document.querySelector('video')?.currentTime ?? -1))
    .toBeCloseTo(error.s, 0);
});
