import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-SHORT: el Short vertical de punta a punta. Se encuadra lo que se va a reaccionar (el recuadro tiene la
// forma exacta de su mitad), se prepara (cámara abajo), NO se graba hasta tocar «Empezar», se pausa y se sigue, y el
// video sale en 1080 × 1920 con la cámara en su mitad.
test('grabar un Short vertical para reaccionar', async ({ page }) => {
  // Lo compartido es un lienzo blanco (como la pestaña de un video): así se distingue de la cámara (verde).
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const x = c.getContext('2d')!;
      setInterval(() => {
        x.fillStyle = '#ffffff';
        x.fillRect(0, 0, c.width, c.height);
      }, 50);
      const s = c.captureStream(30);
      const pista = s.getVideoTracks()[0]!;
      const original = pista.getSettings.bind(pista);
      pista.getSettings = () => ({ ...original(), width: 1280, height: 720, displaySurface: 'browser' });
      return s;
    };
  });
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.short.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen + Cam').click();
  await page.getByText('Vertical Short (9:16)').click();
  await expect(page.locator('.maqueta-short')).toBeVisible();
  await page.getByRole('button', { name: 'Start recording' }).click();

  // 1) Encuadre con forma fija: 1080 de ancho por 1056 de alto (la cámara ocupa el 45 %).
  const encuadre = page.getByRole('dialog', { name: 'Frame what you are reacting to' });
  await expect(encuadre).toBeVisible({ timeout: 15_000 });
  const lienzo = (await page.getByTestId('lienzo-area').boundingBox())!;
  await page.mouse.move(lienzo.x + lienzo.width * 0.1, lienzo.y + lienzo.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(lienzo.x + lienzo.width * 0.4, lienzo.y + lienzo.height * 0.9, { steps: 8 });
  await page.mouse.up();
  const marco = (await page.locator('.area-marco').boundingBox())!;
  expect(marco.width / marco.height).toBeCloseTo(1080 / 1056, 1);
  await encuadre.getByRole('button', { name: 'Use this frame' }).click();

  // 2) Preparación: se ve el Short armado y todavía no se graba nada.
  await expect(page.getByRole('heading', { name: 'Your Short is ready to record' })).toBeVisible();
  await expect(page.locator('.barra-grabacion')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const v = document.querySelector('.grabar-previa video') as HTMLVideoElement;
        return { w: v.videoWidth, h: v.videoHeight };
      }),
    )
    .toEqual({ w: 1080, h: 1920 });
  await page.screenshot({ path: test.info().outputPath('short-preparar.png') });
  await page.getByRole('button', { name: /Camera at the bottom/ }).click();
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/\/record$/);

  // 3) Grabar, pausar, seguir y terminar.
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Paused');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Resume/ }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

  // 4) El video es vertical y la cámara (verde en la cámara de prueba) está ABAJO.
  await page.locator('.reproductor video').waitFor();
  const r = await page.evaluate(
    () =>
      new Promise<{ w: number; h: number; arriba: number[]; abajo: number[]; claros: number; foto: string }>(
        (ok) => {
          const v = document.querySelector('.reproductor video') as HTMLVideoElement;
          const sacar = () => {
            const c = document.createElement('canvas');
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const x = c.getContext('2d')!;
            x.drawImage(v, 0, 0);
            const px = (fy: number) =>
              Array.from(
                x.getImageData(Math.floor(c.width / 2), Math.floor(c.height * fy), 1, 1).data.slice(0, 3),
              );
            // La marca «pantalay.com» (letras claras) va abajo a la derecha de la cámara, que es verde en la prueba.
            const zona = x.getImageData(
              Math.floor(c.width * 0.55),
              Math.floor(c.height * 0.9),
              Math.floor(c.width * 0.42),
              Math.floor(c.height * 0.09),
            ).data;
            let claros = 0;
            for (let i = 0; i < zona.length; i += 4) if (zona[i]! > 170 && zona[i + 2]! > 170) claros++;
            ok({
              w: c.width,
              h: c.height,
              arriba: px(0.25),
              abajo: px(0.6),
              claros,
              foto: c.toDataURL('image/jpeg', 0.7),
            });
          };
          const ir = () => {
            v.currentTime = 1.5;
            v.addEventListener('seeked', sacar, { once: true });
          };
          if (v.readyState >= 1) ir();
          else v.addEventListener('loadedmetadata', ir, { once: true });
        },
      ),
  );
  writeFileSync(test.info().outputPath('short-grabado.jpg'), Buffer.from(r.foto.split(',')[1]!, 'base64'));
  expect({ w: r.w, h: r.h }).toEqual({ w: 1080, h: 1920 });
  const verde = (p: number[]) => p[1]! > p[0]! + 40 && p[1]! > p[2]! + 40;
  expect(verde(r.abajo)).toBe(true);
  expect(r.arriba.every((n) => n > 235)).toBe(true);
  // CANDADO C-MARCA-GRABADA: el Short descargado lleva «pantalay.com» sobre la cámara.
  expect(r.claros).toBeGreaterThan(50);
});
