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

// Si el micrófono elegido no tiene señal (el «predeterminado» del navegador era otra entrada sin sonido, como le pasó
// a Richard el 9 nov 2026), el probador busca entre los demás y ofrece el que sí suena; con un clic queda elegido.
test('el probador encuentra el micrófono que sí tiene sonido', async ({ page }) => {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices;
    const original = md.getUserMedia.bind(md);
    const lista = md.enumerateDevices.bind(md);
    md.enumerateDevices = async () =>
      [
        ...(await lista()).filter((d) => d.kind !== 'audioinput'),
        {
          deviceId: 'default',
          kind: 'audioinput',
          label: 'Predeterminado (sin sonido)',
          groupId: 'a',
          toJSON: () => ({}),
        },
        {
          deviceId: 'mudo',
          kind: 'audioinput',
          label: 'Entrada virtual muda',
          groupId: 'b',
          toJSON: () => ({}),
        },
        {
          deviceId: 'vivo',
          kind: 'audioinput',
          label: 'Micrófono de estudio',
          groupId: 'c',
          toJSON: () => ({}),
        },
      ] as MediaDeviceInfo[];
    md.getUserMedia = async (c) => {
      if (c?.video) return original(c);
      const pedido = (c?.audio as MediaTrackConstraints | undefined)?.deviceId as
        { exact?: string } | undefined;
      if (pedido?.exact === 'vivo') return original({ audio: true });
      return new AudioContext().createMediaStreamDestination().stream;
    };
  });
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.buscar.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('body').click();
  await expect(page.getByText('No signal from your microphone')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('This one does have sound:')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.probador-micro-busqueda b')).toHaveText('Micrófono de estudio');
  await page.getByRole('button', { name: 'Use this microphone' }).click();
  await expect(page.locator('#estudio-mic')).toHaveValue('vivo');
  await expect(page.locator('.probador-micro')).toHaveAttribute('data-estado', 'llega', { timeout: 10_000 });
});
