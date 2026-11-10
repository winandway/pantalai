import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';
import { cajasDeArriba } from '../web/src/logica/cajasMp4';

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
  // CANDADO C-VERIFICAR-CORREO: cuenta nueva = franja discreta para confirmar el correo (y se puede grabar igual).
  await expect(page.locator('.franja-correo')).toContainText(correo);

  await page.goto('/record');
  await page.getByText('Screen + Cam').click();
  // Relojes del lado de la prueba para comprobar que la pausa no cuenta SIN números fijos: en una máquina lenta
  // (CI con dos grabaciones a la vez) cada clic tarda, y un tope fijo de 13 s fallaba al azar (13,4 s el 10 nov).
  const tClicEmpezar = Date.now();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByText('Recording', { exact: true })).toBeVisible({ timeout: 15_000 });
  const tGrabando = Date.now();
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
  const tClicPausa = Date.now();
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Paused');
  const tEnPausa = Date.now();
  // Pausa larga: más que lo que puede tardar el arranque, así una pausa que contara se notaría siempre.
  await page.waitForTimeout(5000);
  const tClicSeguir = Date.now();
  await page.getByRole('button', { name: /Resume/ }).click();
  const tSiguio = Date.now();
  await page.waitForTimeout(2000);
  const tClicTerminar = Date.now();
  await page.getByRole('button', { name: /Finish/ }).click();
  const tTermino = Date.now();

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
  // La pausa no cuenta. Cotas medidas: la grabación empezó después de la cuenta regresiva de 3 s y antes de verse
  // «Recording»; la pausa duró al menos de «Paused» al clic en «Resume»; se paró durante el clic en «Finish».
  const pausaMin = (tClicSeguir - tEnPausa) / 1000;
  const maximo = (tTermino - tClicEmpezar - 3000) / 1000 - pausaMin;
  const minimo = (tClicPausa - tGrabando + (tClicTerminar - tSiguio)) / 1000;
  expect(pausaMin).toBeGreaterThan(4.5);
  expect(datos.video.duracion).toBeLessThanOrEqual(maximo + 0.2);
  expect(datos.video.duracion).toBeGreaterThanOrEqual(minimo - 0.2);
  expect(datos.video.bytes).toBeGreaterThan(10_000);
  expect(datos.video.tiene_miniatura).toBe(true);

  // CANDADO C-INDICE-MP4: si Chrome grabó en MP4 (en fragmentos), al rato el original de la nube queda reordenado
  // con el índice al principio (ftyp, moov, mdat; sin moof): saltar a cualquier minuto es instantáneo.
  const tipo = await page.evaluate(
    async (i) =>
      ((await (await fetch(`/datos/videos/${i}`)).json()) as { video: { tipo: string } }).video.tipo,
    id,
  );
  if (tipo.startsWith('video/mp4')) {
    await expect
      .poll(
        async () => {
          const r = await page.request.get(`/media/${id}/video?formato=webm`, {
            headers: { range: 'bytes=0-65535' },
          });
          return cajasDeArriba(new Uint8Array(await r.body())).join(',');
        },
        { timeout: 60_000 },
      )
      .toMatch(/^ftyp,(free,)?moov(,mdat)?$/);
  }

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
