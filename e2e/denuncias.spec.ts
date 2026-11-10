import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), actionTimeout: 15_000, navigationTimeout: 30_000 });

// CANDADO C-DENUNCIAS: el superadmin ve la denuncia de un video de la red y lo oculta desde el panel.
// Necesita un servidor con superadmin configurado: E2E_PANEL (la dirección secreta) y E2E_PANEL_CORREO (la cuenta
// de la lista). Sin eso se salta (en CI la prueba de servidor C-DENUNCIAS cubre lo mismo).
const PANEL = process.env.E2E_PANEL;
const CORREO = process.env.E2E_PANEL_CORREO;

test('denunciar un video y ocultarlo desde el panel', async ({ page, browser }) => {
  test.skip(!PANEL || !CORREO, 'sin superadmin configurado');
  const clave = `Prueba-${Date.now()}`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Creador E2E');
  await page.getByLabel('Email').fill(`e2e.den.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.getByLabel('Upload a video').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;
  await page.getByRole('button', { name: /Publish on Pantalay/ }).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('link', { name: /Published/ })).toBeVisible();

  // Un visitante lo denuncia.
  const visita = await browser.newPage({ extraHTTPHeaders: cabecerasDePrueba() });
  await visita.goto(`/videos/${id}`);
  await visita.getByRole('button', { name: 'Report' }).click();
  await visita.getByLabel('It uses my content without permission (copyright)').check();
  await visita.getByLabel('Tell us more (optional)').fill('Es mi canción, sin permiso.');
  await visita.getByRole('button', { name: 'Send report' }).click();
  await expect(visita.getByText('Thanks. Our team will review it.')).toBeVisible();

  // El superadmin lo ve en «Reports» y lo oculta.
  const admin = await browser.newPage({ extraHTTPHeaders: cabecerasDePrueba() });
  const claveAdmin = process.env.E2E_PANEL_CLAVE ?? 'Prueba-panel-e2e-1';
  await admin.goto('/signup');
  await admin.getByLabel('Your name').fill('Soporte Pantalay');
  await admin.getByLabel('Email').fill(CORREO!);
  await admin.getByLabel('Password', { exact: true }).fill(claveAdmin);
  await admin.getByRole('button', { name: 'Create account' }).click();
  // Si la cuenta ya existía, se entra con ella.
  await admin.waitForURL(/\/library|\/panel\//, { timeout: 10_000 }).catch(() => undefined);
  if (!/\/library|\/panel\//.test(admin.url())) {
    await admin.goto('/login');
    await admin.getByLabel('Email').fill(CORREO!);
    await admin.getByLabel('Password', { exact: true }).fill(claveAdmin);
    await admin.getByRole('button', { name: /Sign in|Log in/ }).click();
  }
  await expect(admin).toHaveURL(/\/library|\/panel\//);
  await admin.goto(PANEL!);
  await admin.getByRole('tab', { name: /Reports/ }).click();
  const fila = admin.locator(`.admin-denuncia[data-video="${id}"]`).first();
  await expect(fila).toContainText('Copyright');
  await expect(fila).toContainText('Es mi canción, sin permiso.');
  await admin.screenshot({ path: 'test-results/denuncias-panel.png', fullPage: true });
  await fila.getByRole('button', { name: 'Hide from Videos' }).click();
  await admin.getByRole('dialog').getByRole('button', { name: 'Hide from Videos' }).click();
  await expect(admin.locator(`.admin-denuncia[data-video="${id}"]`)).toHaveCount(0);
  await admin.getByRole('button', { name: 'Reviewed' }).click();
  await expect(admin.locator(`.admin-denuncia[data-video="${id}"]`).first()).toContainText(
    'Hidden from Videos',
  );

  // Ya no sale en Videos.
  const red = await (await visita.request.get('/datos/red?limite=100')).json();
  expect((red as { videos: { id: string }[] }).videos.map((v) => v.id)).not.toContain(id);
});
