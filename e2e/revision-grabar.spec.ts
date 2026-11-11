import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-REVISION-GRABAR (10 nov 2026, Richard): una entrevista salió con el título del video anterior y con
// efecto de cantante porque el Karaoke había quedado encendido. Ahora «Grabar» abre una revisión: avisa las dos cosas,
// se corrige ahí mismo (se ve al instante en el escenario) y la grabación arranca solo con «Todo bien, grabar».
test('al grabar, la revisión avisa el título heredado y el Karaoke, y se corrige ahí mismo', async ({
  page,
}) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.revision.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  // El video anterior deja su título guardado y el Karaoke queda encendido.
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario-tema')).toHaveText('vertical-verde');
  await page.getByRole('button', { name: /Karaoke/ }).click();
  // Ahora una entrevista.
  await page.getByText('A remote guest').click();
  await expect(page.locator('.escenario-tema')).toHaveText('vertical-verde');

  await page.getByRole('button', { name: 'Start recording' }).click();
  const revision = page.getByRole('dialog', { name: 'Check before recording' });
  await expect(revision).toBeVisible();
  await expect(revision.locator('[data-aviso="tema_de_otro_video"]')).toBeVisible();
  await expect(revision.locator('[data-aviso="karaoke"]')).toContainText('Karaoke is ON');
  await expect(revision).toContainText('has not joined yet');
  // Cancelar no graba nada.
  await revision.getByRole('button', { name: 'Cancel' }).click();
  await expect(revision).toBeHidden();
  await expect(page.locator('.estudio .indicador')).toHaveCount(0);

  // Se abre otra vez (también con el «Grabar» de arriba) y se corrige ahí mismo.
  await page.locator('.encabezado .grabar-boton').click();
  await expect(revision).toBeVisible();
  await revision.getByLabel(/Video title/).fill('Entrevista con Ana');
  await expect(page.locator('.escenario-tema')).toHaveText('Entrevista con Ana'); // se ve al instante
  await expect(revision.locator('[data-aviso="tema_de_otro_video"]')).toHaveCount(0);
  await expect(revision).toContainText('Saved as: Entrevista con Ana');
  await revision.getByLabel('Your name on the card').fill('Richard');
  await expect(page.locator('.escenario-camara .cartel b').first()).toHaveText('Richard');
  await revision.getByRole('button', { name: 'Turn Karaoke off' }).click();
  await expect(revision).toContainText('Karaoke is off');
  await expect(page.getByRole('button', { name: /Karaoke/ }).first()).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  // Los cambios quedan guardados (al recargar siguen).
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('.escenario-tema')).toHaveText('Entrevista con Ana');
});
