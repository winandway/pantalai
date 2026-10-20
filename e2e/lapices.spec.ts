import { expect, test } from '@playwright/test';

// CANDADO C-LAPICES: mientras se graba, «Draw» abre los lápices y lo que se dibuja sale en el video
// (la vista previa muestra exactamente lo que se graba).
test('dibujar con el lápiz rojo mientras se graba', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.lapiz.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/record');
  await page.getByText('Screen only').click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.barra-grabacion .indicador')).toHaveText('Recording', { timeout: 15_000 });

  await page.getByRole('button', { name: /Draw/ }).click();
  await expect(page.getByRole('toolbar', { name: 'Drawing tools' })).toBeVisible();
  await page.getByRole('button', { name: 'Red' }).click();
  await page.getByRole('button', { name: 'Thick' }).click();

  const caja = (await page.getByTestId('capa-dibujo').boundingBox())!;
  const y = caja.y + caja.height * 0.5;
  await page.mouse.move(caja.x + caja.width * 0.2, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(caja.x + caja.width * (0.2 + i * 0.05), y);
  await page.mouse.up();

  // ¿Cuántos píxeles rojos hay en lo que se está grabando, sobre la raya?
  const rojos = () =>
    page.evaluate(() => {
      const v = document.querySelector('.grabar-previa video') as HTMLVideoElement;
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, 0, 0);
      const fila = ctx.getImageData(0, Math.round(c.height / 2), c.width, 1).data;
      let n = 0;
      for (let i = 0; i < fila.length; i += 4)
        if (fila[i]! > 200 && fila[i + 1]! < 90 && fila[i + 2]! < 90) n++;
      return n / c.width;
    });
  await expect.poll(rojos, { timeout: 5000 }).toBeGreaterThan(0.4);

  // Deshacer la quita del video.
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect.poll(rojos, { timeout: 5000 }).toBeLessThan(0.05);

  await page.getByRole('button', { name: /Discard/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard' }).click();
});
