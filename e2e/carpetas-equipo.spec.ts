import { execFileSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

// CANDADO C-CARPETAS-EQUIPO: dos cuentas de verdad (dueña y miembro) y una tercera de fuera. La dueña crea una carpeta
// con un video PRIVADO y la comparte con su equipo desde el menú ⋮ de la carpeta; el miembro la ve en la página del
// equipo, marcada con el equipo y la dueña, entra y abre el video; la de fuera recibe 404 en el video y en el archivo;
// y al dejar de compartir, el miembro pierde el acceso al instante.
// Con CAPTURAS=1 guarda las capturas de la guía de Docs en inglés y en español (docs/capturas y web/public/capturas).

async function nuevaPagina(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    extraHTTPHeaders: cabecerasDePrueba(),
    viewport: { width: 1280, height: 800 },
  });
  return ctx.newPage();
}

async function llenarRegistro(page: Page, nombre: string, correo: string) {
  await page.getByLabel('Your name').fill(nombre);
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
}

const api = (page: Page, ruta: string, metodo = 'GET', json?: unknown) =>
  page.evaluate(
    async ([r, m, j]) => {
      const res = await fetch(r as string, {
        method: m as string,
        headers: { 'content-type': 'application/json', 'x-pantalai': '1' },
        body: j === undefined ? undefined : JSON.stringify(j),
      });
      return {
        status: res.status,
        cuerpo: (await res.json().catch(() => null)) as Record<string, unknown> | null,
      };
    },
    [ruta, metodo, json] as const,
  );

// Para las capturas de Docs: nombres neutros, correos de ejemplo cortos y sin la franja de «confirma tu correo».
const CAPTURAS = Boolean(process.env.CAPTURAS);
const NOMBRE_A = CAPTURAS ? 'Ana Rivera' : 'Soporte E2E Ana';
const NOMBRE_B = CAPTURAS ? 'Ben Carter' : 'Soporte E2E Beto';

async function capturar(page: Page, nombre: string, idioma: 'en' | 'es', antes?: () => Promise<void>) {
  if (!CAPTURAS) return;
  await page.evaluate((i) => localStorage.setItem('pantalai:idioma', i), idioma);
  await page.reload();
  await page.waitForLoadState('networkidle');
  if (antes) await antes();
  await page.addStyleTag({ content: '.franja-correo { display: none !important; }' });
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.equipo-miembros .ayuda'))
      el.textContent = (el.textContent ?? '').replace(/e2e\.carpeta\.(\w)\.\d+@/, (_m, l: string) =>
        l === 'a' ? 'ana@' : 'ben@',
      );
  });
  const png = `docs/capturas/${nombre}-${idioma}.png`;
  await page.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `web/public/capturas/${nombre}-${idioma}.webp`]);
}

test('carpeta compartida: la dueña comparte, el miembro la ve y la de fuera nunca', async ({ browser }) => {
  const sello = Date.now();
  const correoB = `e2e.carpeta.b.${sello}@example.com`;
  const ana = await nuevaPagina(browser);
  const beto = await nuevaPagina(browser);
  const carla = await nuevaPagina(browser);
  ana.on('dialog', () => {
    throw new Error('Se abrió un cuadro del navegador');
  });

  // 1. Ana crea su cuenta y sube un video, que deja PRIVADO.
  await ana.goto('/signup');
  await llenarRegistro(ana, NOMBRE_A, `e2e.carpeta.a.${sello}@example.com`);
  await expect(ana).toHaveURL(/\/library/);
  await ana.getByLabel('Upload a video').setInputFiles('e2e/datos/corto.mp4');
  await expect(ana).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const video = ana.url().split('/v/')[1]!;
  expect(
    (await api(ana, `/datos/videos/${video}`, 'PATCH', { titulo: 'Weekly demo', privacidad: 'privado' }))
      .status,
  ).toBe(200);

  // 2. Crea la carpeta desde la barra lateral y mete el video desde su menú ⋮.
  await ana.goto('/library');
  await ana.getByRole('button', { name: 'New folder' }).click();
  await ana.getByLabel('Folder name').fill('Client demos');
  await ana.getByRole('button', { name: 'Save' }).click();
  const carpetaLateral = ana.locator('.lateral-carpeta', { hasText: 'Client demos' });
  await expect(carpetaLateral).toBeVisible();
  await ana.locator('.tarjeta-video').first().getByRole('button', { name: 'More options' }).click();
  await ana.getByRole('menuitem', { name: 'Move to folder' }).click();
  await ana.locator('.lista-opciones').getByRole('button', { name: 'Client demos' }).click();
  await expect(carpetaLateral.locator('.contador')).toHaveText('1');

  // 3. Crea el equipo e invita a Beto; Beto se une con el enlace creando su cuenta.
  const equipo = (await api(ana, '/datos/equipos', 'POST', { nombre: 'Sales' })).cuerpo!.equipo as {
    id: string;
  };
  const invitacion = await api(ana, `/datos/equipos/${equipo.id}/invitar`, 'POST', { correo: correoB });
  const enlace = new URL(invitacion.cuerpo!.enlace as string);
  await beto.goto(enlace.pathname + enlace.search);
  await expect(beto).toHaveURL(/\/signup\?volver=/);
  await llenarRegistro(beto, NOMBRE_B, correoB);
  await expect(beto).toHaveURL((u) => u.pathname === `/team/${equipo.id}`, { timeout: 15_000 });
  await expect(beto.getByText('No shared folders yet.', { exact: false })).toBeVisible();

  // 4. Ana comparte la CARPETA desde su menú ⋮ (no video por video).
  await carpetaLateral.getByRole('button', { name: 'More options' }).click();
  await ana.getByRole('menuitem', { name: 'Share with a team' }).click();
  await expect(ana.getByRole('heading', { name: 'Share folder with a team' })).toBeVisible();
  await ana.getByRole('checkbox', { name: /Sales/ }).check();
  await expect(ana.getByText('Saved')).toBeVisible();
  await ana.getByRole('button', { name: 'Close', exact: true }).last().click();
  for (const [idioma, opcion] of [
    ['es', 'Compartir con un equipo'],
    ['en', 'Share with a team'],
  ] as const)
    await capturar(ana, 'carpeta-compartir', idioma, async () => {
      await carpetaLateral.getByRole('button').last().click();
      await ana.getByRole('menuitem', { name: opcion }).click();
      await expect(ana.getByRole('checkbox')).toBeChecked();
    });
  if (CAPTURAS) await ana.reload();
  await expect(carpetaLateral.getByText('Shared with a team')).toBeAttached();

  // 5. Beto la ve en la página del equipo, con el nombre de la dueña, entra y abre el video privado.
  await beto.reload();
  const tarjeta = beto.locator('.equipo-carpeta', { hasText: 'Client demos' });
  await expect(tarjeta).toContainText(`Shared by ${NOMBRE_A}`);
  await expect(tarjeta).toContainText('1 video');
  await expect(tarjeta.getByRole('button', { name: 'More options' })).toHaveCount(0); // no es suya ni es admin
  await capturar(beto, 'carpeta-equipo', 'es');
  await capturar(beto, 'carpeta-equipo', 'en');
  await tarjeta.getByRole('link').click();
  await expect(beto).toHaveURL((u) => u.pathname.startsWith(`/team/${equipo.id}/folder/`));
  const rutaCarpeta = new URL(beto.url()).pathname;
  const carpeta = rutaCarpeta.split('/').pop()!;
  await expect(beto.locator('.carpeta-compartida-marca')).toContainText('Shared folder in');
  await expect(beto.locator('.carpeta-compartida-marca')).toContainText('Sales');
  await expect(beto.locator('.carpeta-compartida-marca')).toContainText(NOMBRE_A);
  await expect(beto.getByRole('heading', { name: /Client demos/ })).toBeVisible();
  await capturar(beto, 'carpeta-equipo-dentro', 'es');
  await capturar(beto, 'carpeta-equipo-dentro', 'en');
  await beto.locator('.tarjeta-video-titulo', { hasText: 'Weekly demo' }).click();
  await expect(beto).toHaveURL((u) => u.pathname === `/v/${video}`);
  expect(await beto.evaluate(async (id) => (await fetch(`/media/${id}/video`)).status, video)).toBe(200);
  // Beto no puede moverlo ni borrarlo.
  expect((await api(beto, `/datos/videos/${video}`, 'DELETE')).status).toBe(404);

  // 6. Carla, que no es del equipo, nunca lo ve: ni la API, ni el archivo, ni la carpeta.
  await carla.goto('/signup');
  await llenarRegistro(carla, 'Soporte E2E Carla', `e2e.carpeta.c.${sello}@example.com`);
  await expect(carla).toHaveURL(/\/library/);
  expect((await api(carla, `/datos/videos/${video}`)).status).toBe(404);
  expect(await carla.evaluate(async (id) => (await fetch(`/media/${id}/video`)).status, video)).toBe(404);
  expect((await api(carla, `/datos/equipos/${equipo.id}/carpetas/${carpeta}`)).status).toBe(404);
  await carla.goto(rutaCarpeta);
  await expect(carla.getByText('Page not found')).toBeVisible();

  // 7. Ana deja de compartir y Beto pierde el acceso al instante.
  await carpetaLateral.getByRole('button', { name: 'More options' }).click();
  await ana.getByRole('menuitem', { name: 'Share with a team' }).click();
  await ana.getByRole('checkbox', { name: /Sales/ }).uncheck();
  await expect(ana.getByText('Saved')).toBeVisible();
  expect((await api(beto, `/datos/videos/${video}`)).status).toBe(404);
  await beto.goto(rutaCarpeta);
  await expect(beto.getByText('Page not found')).toBeVisible();
});
