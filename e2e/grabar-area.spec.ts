import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-AREA: «Elegir qué parte grabar». Se comparte, se marca un rectángulo con el mouse y el video sale SOLO con
// esa parte (sus medidas son las del rectángulo, no las de todo lo compartido). La próxima vez aparece marcada igual.
test('grabar solo el área marcada', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.area.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen only').click();
  await page.getByLabel('Choose which part of the screen to record').check();
  await page.getByRole('button', { name: 'Start recording' }).click();

  const dialogo = page.getByRole('dialog', { name: 'Which part do you want to record?' });
  await expect(dialogo).toBeVisible({ timeout: 15_000 });
  // Sin marcar nada no se puede grabar «esta área».
  await expect(dialogo.getByRole('button', { name: 'Record this area' })).toBeDisabled();
  const lienzo = page.getByTestId('lienzo-area');
  await expect(lienzo).toBeVisible();
  const caja = (await lienzo.boundingBox())!;
  // De 10 % a 60 % de ancho y de 20 % a 70 % de alto: la mitad de lo compartido en cada lado.
  await page.mouse.move(caja.x + caja.width * 0.1, caja.y + caja.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width * 0.6, caja.y + caja.height * 0.7, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.area-marco')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('elegir-area.png') });
  await dialogo.getByRole('button', { name: 'Record this area' }).click();
  await expect(dialogo).toHaveCount(0);

  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  const compartida = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

  // El archivo grabado mide lo del rectángulo (la mitad), no lo de todo lo compartido.
  await page.locator('.reproductor video').waitFor({ timeout: 30_000 });
  const medidas = await page.evaluate(
    () =>
      new Promise<{ w: number; h: number }>((ok) => {
        const v = document.querySelector('.reproductor video') as HTMLVideoElement;
        const listo = () => ok({ w: v.videoWidth, h: v.videoHeight });
        if (v.readyState >= 1 && v.videoWidth) listo();
        else v.addEventListener('loadedmetadata', listo, { once: true });
      }),
  );
  expect(medidas.w).toBeGreaterThan(0);
  const proporcion = medidas.w / medidas.h;
  const compartidaProporcion = compartida.w / compartida.h;
  // Mitad de ancho y mitad de alto: la proporción se mantiene, pero el tamaño es la mitad (con margen).
  expect(Math.abs(proporcion - compartidaProporcion)).toBeLessThan(0.15);
  expect(medidas.w).toBeLessThan(compartida.w * 0.75);

  // La próxima vez el área aparece marcada.
  await page.goto('/record');
  await page.getByText('Screen only').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByRole('dialog', { name: 'Which part do you want to record?' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.area-marco')).toBeVisible();
  await page.getByRole('button', { name: 'Record this area' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
});
