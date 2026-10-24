import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-GRABAR-PUNTA-A-PUNTA: crea cuenta, graba pantalla + cámara de verdad,
// sube por partes, y el video queda listo, con duración y reproducible.
test('grabar, subir y ver un video', async ({ page }) => {
  const correo = `e2e.${Date.now()}@example.com`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(correo);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen + Cam').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByText('Recording', { exact: true })).toBeVisible({ timeout: 15_000 });
  // CANDADO C-VISTA-PREVIA: mientras se graba, la vista previa tiene imagen (antes quedaba en negro).
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((document.querySelector('.grabar-previa video') as HTMLVideoElement | null)?.srcObject),
      ),
    )
    .toBe(true);
  // El botón de arriba dice «Recording» con el tiempo, no «Record».
  await expect(page.locator('.encabezado .grabando-ahora')).toContainText('Recording');
  await page.waitForTimeout(7000);
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Paused');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Resume/ }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Finish/ }).click();

  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = page.url().split('/v/')[1]!;
  const datos = await page.evaluate(
    async (i) =>
      (await (await fetch(`/datos/videos/${i}`)).json()) as {
        video: { estado: string; duracion: number; bytes: number; tiene_miniatura: boolean };
      },
    id,
  );
  expect(datos.video.estado).toBe('listo');
  expect(datos.video.duracion).toBeGreaterThan(7);
  expect(datos.video.duracion).toBeLessThan(13); // la pausa no cuenta
  expect(datos.video.bytes).toBeGreaterThan(10_000);
  expect(datos.video.tiene_miniatura).toBe(true);

  // El archivo trae su duración escrita (se puede adelantar y la barra no queda en «infinito»).
  await page.locator('.reproductor video').waitFor({ timeout: 30_000 });
  const duracion = await page.evaluate(
    () =>
      new Promise<number>((ok) => {
        const v = document.querySelector('.reproductor video') as HTMLVideoElement;
        if (v.readyState >= 1) ok(v.duration);
        else v.addEventListener('loadedmetadata', () => ok(v.duration), { once: true });
      }),
  );
  expect(Number.isFinite(duracion)).toBe(true);
  expect(duracion).toBeGreaterThan(7);

  // CANDADO C-MP4: si el navegador puede codificar H.264 + AAC, al abrir el video se arma y sube la copia MP4,
  // y «Descargar» entrega ese MP4 (el que abren iPhone, Final Cut y YouTube).
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
  if (puede) {
    await expect(page.getByRole('link', { name: /Download MP4/ })).toBeVisible({ timeout: 60_000 });
    const descarga = await page.request.get(`/media/${id}/video?descargar=1`);
    expect(descarga.headers()['content-type']).toBe('video/mp4');
    const cuerpo = await descarga.body();
    expect(cuerpo.subarray(4, 8).toString()).toBe('ftyp');
    if (process.env.GUARDAR_MP4) (await import('node:fs')).writeFileSync(process.env.GUARDAR_MP4, cuerpo);
  } else {
    console.log('Este navegador no codifica H.264/AAC: se omite la parte MP4.');
  }
  await page.evaluate(() => {
    const v = document.querySelector('.reproductor video') as HTMLVideoElement;
    v.currentTime = 4;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/video-grabado.png' });
});
