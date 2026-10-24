import { expect, test } from '@playwright/test';
import { cabecerasDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba() });

// CANDADO C-CAMARA-EN-PESTANA: con la burbuja flotante encendida, si se comparte UNA pestaña (o una ventana), la
// ventanita de la cámara queda fuera de lo que se graba; entonces la cámara se pinta DENTRO del video.
// Antes: al compartir solo la pestaña de YouTube para una reacción, el video salía sin la cara.
// Con la pantalla completa NO se pinta (la ventanita ya sale en la pantalla y quedaría doble).
for (const superficie of ['browser', 'monitor'] as const) {
  test(`burbuja dentro del video al compartir: ${superficie}`, async ({ page }) => {
    // Lo compartido es un lienzo blanco que dice ser una pestaña (o la pantalla): así se sabe qué es cámara y qué no.
    await page.addInitScript((sup) => {
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
        pista.getSettings = () => ({ ...original(), width: 1280, height: 720, displaySurface: sup });
        return s;
      };
    }, superficie);
    await page.goto('/signup');
    const flota = await page.evaluate(() => 'documentPictureInPicture' in window);
    test.skip(!flota, 'Este navegador no tiene la burbuja flotante (Document Picture-in-Picture).');
    await page.getByLabel('Your name').fill('Soporte E2E');
    await page.getByLabel('Email').fill(`e2e.pestana.${superficie}.${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/library/);
    await page.goto('/record');
    await page.getByText('Screen + Cam').click();
    await page.getByRole('button', { name: 'Start recording' }).click();
    await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 20_000 });

    // Lo que se está grabando: ¿hay cámara (no blanco) en la esquina de la burbuja (abajo a la izquierda)?
    await page.waitForTimeout(1500);
    const pixeles = await page.evaluate(() => {
      const v = document.querySelector('.grabar-previa video') as HTMLVideoElement;
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const x = c.getContext('2d')!;
      x.drawImage(v, 0, 0);
      const px = (fx: number, fy: number) =>
        Array.from(
          x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data.slice(0, 3),
        );
      // CANDADO C-MARCA-GRABADA (horizontal): la píldora gris de «pantalay.com» abajo a la derecha, sobre el blanco.
      const d = x.getImageData(
        Math.floor(c.width * 0.6),
        Math.floor(c.height * 0.85),
        Math.floor(c.width * 0.38),
        Math.floor(c.height * 0.13),
      ).data;
      let grises = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i]! < 210 && d[i]! > 60 && Math.abs(d[i]! - d[i + 2]!) < 20) grises++;
      return { burbuja: px(0.12, 0.82), centro: px(0.5, 0.4), grises };
    });
    await page.getByRole('button', { name: /Finish/ }).click();
    await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

    const blanco = (p: number[]) => p.every((n) => n > 235);
    expect(blanco(pixeles.centro)).toBe(true);
    expect(blanco(pixeles.burbuja)).toBe(superficie === 'monitor');
    expect(pixeles.grises).toBeGreaterThan(200);
  });
}
