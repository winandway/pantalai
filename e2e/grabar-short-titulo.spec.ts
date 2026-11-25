import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, esperarArchivoFinal } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-SHORT-TITULO: el Short con título de punta a punta. La cámara va arriba (más baja que en el Short de
// siempre), debajo una franja blanca con el título en letras negras, y abajo lo compartido. El video queda con el
// título como nombre.
test('grabar un Short con título: cámara arriba, franja blanca y video abajo', async ({ page }) => {
  // Lo compartido es un lienzo AZUL: así se distingue de la cámara de prueba (verde) y de la franja (blanca).
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 720;
      c.height = 1280;
      const x = c.getContext('2d')!;
      setInterval(() => {
        x.fillStyle = '#1040ff';
        x.fillRect(0, 0, c.width, c.height);
      }, 50);
      const s = c.captureStream(30);
      const pista = s.getVideoTracks()[0]!;
      const original = pista.getSettings.bind(pista);
      pista.getSettings = () => ({ ...original(), width: 720, height: 1280, displaySurface: 'browser' });
      return s;
    };
  });
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.shorttitulo.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen + Cam').click();
  await page.getByText('Short with title').click();
  await expect(page.locator('.maqueta-short.con-titulo')).toBeVisible();
  await page.getByLabel('Title on the video').fill('My first title');
  await expect(page.locator('.maqueta-short-titulo')).toHaveText('My first title');
  // En este formato la cámara siempre va arriba: no se ofrece ponerla abajo.
  await expect(page.getByRole('button', { name: /Camera at the bottom/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start recording' }).click();

  const encuadre = page.getByRole('dialog', { name: 'Frame what you are reacting to' });
  await expect(encuadre).toBeVisible({ timeout: 15_000 });
  await encuadre.getByRole('button', { name: 'Use this frame' }).click();

  // Preparación: el título se puede corregir ahí mismo, antes de grabar.
  await expect(page.getByRole('heading', { name: 'Your Short is ready to record' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Camera at the bottom/ })).toBeHidden();
  await page.getByLabel('Title on the video').fill('A girl who makes your day');
  await page.waitForTimeout(800);
  await page.screenshot({ path: test.info().outputPath('short-titulo-preparar.png') });
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  await esperarArchivoFinal(page, new URL(page.url()).pathname.split('/')[2]!);
  // El video se llama como el título escrito.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A girl who makes your day');

  await page.locator('.reproductor video').waitFor();
  const r = await page.evaluate(
    () =>
      new Promise<{
        w: number;
        h: number;
        camara: number[];
        franja: number[];
        video: number[];
        oscuros: number;
        foto: string;
      }>((ok) => {
        const v = document.querySelector('.reproductor video') as HTMLVideoElement;
        let listo = false;
        const una = () => {
          if (listo) return;
          listo = true;
          const c = document.createElement('canvas');
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const x = c.getContext('2d')!;
          x.drawImage(v, 0, 0);
          const px = (fx: number, fy: number) =>
            Array.from(
              x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data.slice(0, 3),
            );
          // Letras negras dentro de la franja (que empieza en el 25 % del alto).
          const d = x.getImageData(0, Math.floor(c.height * 0.255), c.width, Math.floor(c.height * 0.1)).data;
          let oscuros = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i]! < 70 && d[i + 1]! < 70 && d[i + 2]! < 70) oscuros++;
          ok({
            w: c.width,
            h: c.height,
            camara: px(0.3, 0.12),
            franja: px(0.01, 0.27),
            video: px(0.5, 0.7),
            oscuros,
            foto: c.toDataURL('image/jpeg', 0.7),
          });
        };
        const ir = () => {
          v.currentTime = 1.5;
          v.addEventListener('seeked', una, { once: true });
          setTimeout(una, 5000);
        };
        if (v.readyState >= 1) ir();
        else v.addEventListener('loadedmetadata', ir, { once: true });
      }),
  );
  writeFileSync(
    test.info().outputPath('short-titulo-grabado.jpg'),
    Buffer.from(r.foto.split(',')[1]!, 'base64'),
  );
  expect({ w: r.w, h: r.h }).toEqual({ w: 1080, h: 1920 });
  const verde = (p: number[]) => p[1]! > p[0]! + 40 && p[1]! > p[2]! + 40;
  const azul = (p: number[]) => p[2]! > p[0]! + 60 && p[2]! > p[1]! + 60;
  expect(verde(r.camara)).toBe(true);
  expect(r.franja.every((n) => n > 225)).toBe(true);
  expect(azul(r.video)).toBe(true);
  expect(r.oscuros).toBeGreaterThan(2000);
});
