import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-IA-FLUJO: con una grabación real, el navegador saca el audio, lo manda en pedazos WAV al
// servidor y pide el análisis; la página avisa el avance y el final. Las respuestas de la IA se simulan
// aquí para no gastar dinero en cada prueba.
test('la IA procesa una grabación real (proveedores simulados)', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E IA');
  await page.getByLabel('Email').fill(`e2e.ia.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  let estado = 'pendiente';
  const pedazos: { tamano: number; url: string }[] = [];
  await page.route(/\/datos\/videos\/[a-z0-9]+\/ia$/, (r) =>
    r.fulfill({
      json: {
        ia: {
          oido: true,
          cerebro: true,
          estado,
          error: '',
          tareas: estado === 'listo' ? ['Revisar el panel'] : [],
          muletillas: [],
          palabras: 3,
        },
      },
    }),
  );
  await page.route(/\/ia\/transcribir/, async (r) => {
    pedazos.push({ tamano: r.request().postDataBuffer()?.length ?? 0, url: r.request().url() });
    await r.fulfill({ json: { ok: true, palabras: 3, idioma: 'en' } });
  });
  await page.route(/\/ia\/analizar/, async (r) => {
    estado = 'listo';
    await r.fulfill({ json: { ok: true } });
  });

  await page.goto('/record');
  await page.getByText('Cam only').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByText('Recording', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

  await expect(page.getByText(/AI finished/)).toBeVisible({ timeout: 60_000 });
  expect(pedazos).toHaveLength(1);
  expect(pedazos[0]!.url).toContain('primero=1');
  expect(pedazos[0]!.url).toContain('ultimo=1');
  // ~5 s de audio a 16 kHz mono 16 bits ≈ 160 KB (más la cabecera WAV).
  expect(pedazos[0]!.tamano).toBeGreaterThan(100_000);
  await expect(page.getByText('Revisar el panel')).toBeVisible();
});
