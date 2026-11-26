import { expect, test } from '@playwright/test';
import { ARGUMENTOS_CHROME } from '../playwright.config';
import { cabecerasDePrueba } from './ayuda';

// Chrome SIN tarjeta gráfica (como la máquina de GitHub): cada cuadro se dibuja a mano y cuesta de verdad.
test.use({
  extraHTTPHeaders: cabecerasDePrueba(),
  viewport: { width: 1280, height: 900 },
  launchOptions: { args: [...ARGUMENTOS_CHROME, '--disable-gpu'] },
});

// CANDADO C-RELOJ-SIN-COLA: en una máquina lenta el Estudio sigue respondiendo mientras graba. La página se frena
// 20 veces (como una computadora sin tarjeta gráfica o la máquina de GitHub): antes, el reloj de los cuadros mandaba
// 30 avisos por segundo sin esperar al dibujo anterior, se amontonaban sin tope y la página quedaba congelada (no se
// podía ni tocar «Terminar»). Así fallaba «a veces» la prueba de Karaoke en GitHub.
test('en una máquina lenta el Estudio graba sin congelarse', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.lenta.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await page.getByRole('button', { name: /Play/ }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page
    .getByRole('dialog', { name: 'Check before recording' })
    .getByRole('button', { name: 'All good, record' })
    .click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  // Tres vueltas: la página contesta cada vez (con la cola, la primera ya no volvía nunca).
  const demoras: number[] = [];
  for (let i = 0; i < 3; i++) {
    const antes = Date.now();
    await page.locator('.estudio-controles').boundingBox({ timeout: 45_000 });
    demoras.push(Date.now() - antes);
    await page.waitForTimeout(1500); // el video sigue grabándose entre una vuelta y otra
  }
  expect(Math.max(...demoras), `demoras de la página frenada: ${demoras.join(', ')} ms`).toBeLessThan(40_000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
});
