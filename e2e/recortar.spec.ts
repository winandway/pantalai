import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-RECORTE-DESCARGA: se cortan las dos puntas con las agarraderas, se guarda,
// y el MP4 que se descarga ya sale sin ellas.
test('recortar las puntas y descargar el video recortado', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.recorte.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen only').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  await page.waitForTimeout(10_000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;

  await page.goto(`/v/${id}/edit`);
  const tira = page.locator('.recortador-tira');
  await expect(tira).toBeVisible();
  // Las fotos de la tira se cargan.
  await expect
    .poll(() => page.locator('.recortador-fotos span[style*="background-image"]').count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(3);
  const caja = (await tira.boundingBox())!;
  const duracion = Number(await page.getByRole('slider', { name: 'End' }).getAttribute('aria-valuemax'));
  const x = (s: number) => caja.x + (s / duracion) * caja.width;
  const y = caja.y + caja.height / 2;
  // Inicio a los 2 s y final a los 7 s.
  const ini = (await page.getByRole('slider', { name: 'Start' }).boundingBox())!;
  await page.mouse.move(ini.x + ini.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(x(2), y, { steps: 8 });
  await page.mouse.up();
  const fin = (await page.getByRole('slider', { name: 'End' }).boundingBox())!;
  await page.mouse.move(fin.x + fin.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(x(7), y, { steps: 8 });
  await page.mouse.up();
  const largo = Number((await page.getByTestId('duracion-recorte').textContent())!.replace(' s', ''));
  expect(largo).toBeGreaterThan(4.3);
  expect(largo).toBeLessThan(5.7);

  // «Reproducir recortado» arranca en el inicio.
  await page.getByRole('button', { name: /Play trimmed video/ }).click();
  await page.waitForTimeout(800);
  const t = await page.evaluate(
    () => (document.querySelector('.reproductor video') as HTMLVideoElement).currentTime,
  );
  expect(t).toBeGreaterThan(1.8);

  await page.locator('.tarjeta-recortar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/v/${id}$`));

  // El MP4 se arma de nuevo con el recorte y es el que se descarga (si este Chrome sabe codificar H.264 + AAC).
  const puede = await page.evaluate(async () => {
    try {
      const v = await VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 640, height: 480 });
      const a = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
      });
      return Boolean(v.supported && a.supported);
    } catch {
      return false;
    }
  });
  test.skip(!puede, 'Este navegador no codifica H.264/AAC: se omite la parte MP4.');
  await expect(page.getByRole('link', { name: /Download MP4/ })).toBeVisible({ timeout: 90_000 });
  const mp4 = await page.request.get(`/media/${id}/video?descargar=1`);
  expect(mp4.headers()['content-type']).toBe('video/mp4');
  const segundos = await page.evaluate(async (i) => {
    const b = await (await fetch(`/media/${i}/video?descargar=1`)).blob();
    const v = document.createElement('video');
    v.src = URL.createObjectURL(b);
    return new Promise<number>((ok) =>
      v.addEventListener('loadedmetadata', () => ok(v.duration), { once: true }),
    );
  }, id);
  expect(segundos).toBeGreaterThan(4);
  expect(segundos).toBeLessThan(6.2);
});
