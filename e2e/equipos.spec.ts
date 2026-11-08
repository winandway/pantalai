import { expect, test, type Browser, type Page } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

// CANDADO C-EQUIPOS: dos cuentas de verdad. La primera crea un equipo, invita por correo y copia el enlace; la segunda
// se une con ese enlace (creando su cuenta en el camino); la primera comparte un video PRIVADO y la segunda lo ve en la
// página del equipo y lo puede abrir.

async function nuevaPagina(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    extraHTTPHeaders: cabecerasDePrueba(),
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  return ctx.newPage();
}

async function llenarRegistro(page: Page, nombre: string, correo: string) {
  await page.getByLabel('Your name').fill(nombre);
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
}

test('equipo: crear, invitar, unirse y ver un video privado compartido', async ({ browser }) => {
  const sello = Date.now();
  const correoB = `e2e.equipo.b.${sello}@example.com`;
  const ana = await nuevaPagina(browser);
  const beto = await nuevaPagina(browser);

  // 1. Ana crea su cuenta y sube un video, que deja PRIVADO.
  await ana.goto('/signup');
  await llenarRegistro(ana, 'Soporte E2E Ana', `e2e.equipo.a.${sello}@example.com`);
  await expect(ana).toHaveURL(/\/library/);
  await ana.getByLabel('Upload a video').setInputFiles('e2e/datos/corto.mp4');
  await expect(ana).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const video = ana.url().split('/v/')[1]!;
  const privado = await ana.evaluate(
    async (id) =>
      (
        await fetch(`/datos/videos/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', 'x-pantalai': '1' },
          body: JSON.stringify({ privacidad: 'privado' }),
        })
      ).status,
    video,
  );
  expect(privado).toBe(200);

  // 2. Crea el equipo desde la barra lateral de la Biblioteca (ventanita propia, nunca el cuadro del navegador).
  ana.on('dialog', () => {
    throw new Error('Se abrió un cuadro del navegador');
  });
  await ana.goto('/library');
  await ana.getByRole('button', { name: 'New team' }).click();
  await ana.getByLabel('Team name').fill('Ventas E2E');
  await ana.getByRole('button', { name: 'Create team' }).click();
  await expect(ana).toHaveURL(/\/team\/[a-z0-9]+$/);
  const equipo = ana.url().split('/team/')[1]!;
  await expect(ana.getByRole('heading', { name: /Ventas E2E/ })).toBeVisible();

  // 3. Invita a Beto y copia el enlace (para mandarlo por WhatsApp).
  await ana.getByLabel('Email of the person').fill(correoB);
  await ana.getByRole('button', { name: 'Send invitation' }).click();
  const campoEnlace = ana.getByRole('textbox', { name: 'Copy invitation link' });
  await expect(campoEnlace).toHaveValue(/\/join\?token=/);
  await ana.getByRole('button', { name: 'Copy invitation link' }).click();
  const copiado = await ana.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(await campoEnlace.inputValue());
  await expect(ana.getByText(correoB)).toBeVisible(); // invitación pendiente

  // 4. Beto abre el enlace sin cuenta: crea la suya y termina dentro del equipo.
  const ruta = new URL(copiado).pathname + new URL(copiado).search;
  await beto.goto(ruta);
  await expect(beto).toHaveURL(/\/signup\?volver=/);
  await llenarRegistro(beto, 'Soporte E2E Beto', correoB);
  await expect(beto).toHaveURL((u) => u.pathname === `/team/${equipo}`, { timeout: 15_000 });
  await expect(beto.getByRole('heading', { name: /Ventas E2E/ })).toBeVisible();
  await expect(beto.getByText('No videos yet.', { exact: false })).toBeVisible();

  // 5. Ana comparte su video con el equipo desde el menú ⋮ de la Biblioteca.
  await ana.goto('/library');
  await ana.locator('.tarjeta-video').first().getByRole('button', { name: 'More options' }).click();
  await ana.getByRole('menuitem', { name: 'Share with a team' }).click();
  await ana.getByRole('checkbox', { name: /Ventas E2E/ }).check();
  await expect(ana.getByText('Saved')).toBeVisible();

  // 6. Beto lo ve en la página del equipo y lo abre, aunque es privado.
  await beto.reload();
  const tarjeta = beto.locator('.tarjeta-video').first();
  await expect(tarjeta).toContainText('Soporte E2E Ana');
  await tarjeta.locator('.tarjeta-video-titulo').click();
  await expect(beto).toHaveURL((u) => u.pathname === `/v/${video}`);
  const estado = await beto.evaluate(async (id) => (await fetch(`/media/${id}/video`)).status, video);
  expect(estado).toBe(200);
});
