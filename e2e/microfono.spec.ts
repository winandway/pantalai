import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-PROBADOR-MICROFONO: un micrófono apagado o sin batería (entrega puros ceros) se avisa claro.
test('el probador avisa cuando no llega señal del micrófono', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      if (c?.video) return original(c);
      // Un micrófono «muerto»: una pista de sonido que solo entrega silencio.
      const ctx = new AudioContext();
      const destino = ctx.createMediaStreamDestination();
      return destino.stream;
    };
  });
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.mudo.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('body').click();
  await expect(page.getByText('No signal from your microphone')).toBeVisible({ timeout: 10_000 });
  // Y en Grabar también.
  await page.goto('/record');
  await page.locator('body').click();
  await expect(page.getByText('No signal from your microphone')).toBeVisible({ timeout: 10_000 });
});
