import { expect, test } from '@playwright/test';

// CANDADO C-AUDITORIA (21 oct 2026): lo que hace una persona real en Pantalay, de punta a punta, en pantalla.
// Graba, comenta, reacciona, comparte en privado e insertado, ordena la biblioteca (carpetas, mover, buscar,
// archivar, duplicar, borrar), sale y vuelve a entrar, y busca en Docs.
test('una persona usa Pantalay de punta a punta', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const correo = `e2e.auditoria.${Date.now()}@example.com`;
  const clave = `Prueba-${Date.now()}`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  // Grabar.
  await page.goto('/record');
  await page.getByText('Screen only').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;

  // Comentar y reaccionar (los comentarios viven en la pestaña «Activity»).
  await page.getByRole('tab', { name: /Activity/ }).click();
  await page.getByLabel('Write a comment…').fill('Great walkthrough');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(page.getByText('Great walkthrough')).toBeVisible();
  await page.getByRole('button', { name: '👍' }).click();

  // Compartir: solo yo → un extraño no lo ve; con enlace → sí, también insertado.
  const extraño = await (await browser.newContext()).newPage();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByLabel('Who can watch').selectOption({ label: '🔒 Only me' });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await extraño.request.get(`/datos/videos/${id}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByLabel('Who can watch').selectOption({ label: '🌐 Anyone with the link' });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await extraño.request.get(`/datos/videos/${id}`)).status()).toBe(200);
  await extraño.goto(`/embed/${id}`);
  await expect(extraño.locator('video')).toBeVisible();
  await extraño.goto(`/v/${id}`);
  await extraño.getByRole('tab', { name: /Activity/ }).click();
  await expect(extraño.getByText('Great walkthrough')).toBeVisible();

  // Biblioteca: carpeta nueva, mover, renombrar, buscar, duplicar, archivar, borrar.
  await page.goto('/library');
  await page.getByRole('button', { name: 'New folder' }).click();
  await page.getByLabel('Folder name').fill('Clients');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.lateral-carpeta', { hasText: 'Clients' })).toBeVisible();
  const tarjeta = page.locator('.biblioteca article').first();
  await tarjeta.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Move to folder' }).click();
  await page.getByRole('button', { name: '📁 Clients', exact: true }).click();
  await page.locator('.lateral-carpeta', { hasText: 'Clients' }).getByRole('button').first().click();
  await expect(page.locator('.biblioteca article')).toHaveCount(1);
  await page.getByRole('button', { name: 'All videos' }).click();
  await page.getByLabel('Search videos and transcripts').fill('zzz-no-existe');
  await expect(page.locator('.biblioteca article')).toHaveCount(0);
  await page.getByLabel('Search videos and transcripts').fill('');
  await tarjeta.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(page.locator('.biblioteca article')).toHaveCount(2);
  await page.locator('.biblioteca article').first().getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.locator('.biblioteca article')).toHaveCount(1);
  await page
    .getByRole('button', { name: /Archive/ })
    .first()
    .click();
  await expect(page.locator('.biblioteca article')).toHaveCount(1);
  await page.locator('.biblioteca article').first().getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.biblioteca article')).toHaveCount(0);
  // Borrar la carpeta NO borra sus videos.
  await page.getByRole('button', { name: 'All videos' }).click();
  await page
    .locator('.lateral-carpeta', { hasText: 'Clients' })
    .getByRole('button', { name: 'More options' })
    .click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.lateral-carpeta', { hasText: 'Clients' })).toHaveCount(0);
  await expect(page.locator('.biblioteca article')).toHaveCount(1);

  // Salir y volver a entrar.
  await page.getByRole('button', { name: /Soporte E2E/ }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get('/datos/yo').then((r) => r.json())) as { usuario: unknown }).toMatchObject({
    usuario: null,
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/library/);

  // Docs: buscador y guía propia.
  await page.goto('/docs');
  await page
    .getByPlaceholder(/Search/)
    .first()
    .fill('trim');
  await expect(page.getByText('Trim the start and end of a video').first()).toBeVisible();
});
