import { writeFileSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-INVITADO: el anfitrión invita a alguien desde el Estudio y lo graba en la segunda tarjeta. Dos navegadores
// de verdad (dos contextos de Chrome) se conectan directo por WebRTC: el anfitrión con la cámara simulada de Chrome y
// el invitado con una cámara MAGENTA (un lienzo pintado) y un tono de 440 Hz como micrófono. Se comprueba que el video
// grabado tiene los píxeles magenta del invitado en su tarjeta, que su voz entra en la grabación, y que si el invitado
// se cae a mitad, la grabación sigue y se guarda.
const CAMARA_MAGENTA = () => {
  const md = navigator.mediaDevices;
  md.getUserMedia = async (c?: MediaStreamConstraints) => {
    const pistas: MediaStreamTrack[] = [];
    if (c?.video) {
      const lienzo = document.createElement('canvas');
      lienzo.width = 640;
      lienzo.height = 360;
      const x = lienzo.getContext('2d')!;
      const pintar = () => {
        x.fillStyle = '#ff00ff';
        x.fillRect(0, 0, 640, 360);
      };
      pintar();
      setInterval(pintar, 100);
      pistas.push(...lienzo.captureStream(15).getVideoTracks());
    }
    if (c?.audio) {
      const ac = new AudioContext();
      const tono = ac.createOscillator();
      tono.frequency.value = 440;
      const volumen = ac.createGain();
      volumen.gain.value = 0.5;
      const salida = ac.createMediaStreamDestination();
      tono.connect(volumen).connect(salida);
      tono.start();
      pistas.push(...salida.stream.getAudioTracks());
    }
    return new MediaStream(pistas);
  };
};

async function crearCuenta(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.invitado.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
}

async function abrirInvitado(browser: Browser, enlace: string, idioma: 'en' | 'es' = 'en') {
  const contexto = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    extraHTTPHeaders: cabecerasDePrueba(),
    permissions: ['camera', 'microphone'],
    viewport: { width: 1100, height: 900 },
  });
  await contexto.addInitScript(CAMARA_MAGENTA);
  if (idioma === 'es') await contexto.addInitScript(() => localStorage.setItem('pantalai:idioma', 'es'));
  const pagina = await contexto.newPage();
  await pagina.goto(enlace);
  return { contexto, pagina };
}

test('el anfitrión graba a su invitado remoto en la segunda tarjeta, y la grabación sobrevive si se cae', async ({
  page,
  browser,
}) => {
  await crearCuenta(page);
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');

  await page.goto('/studio');
  await page.getByText('A remote guest').click();
  await expect(page.locator('.escenario-video')).toContainText('Invite a guest');
  await expect(page.locator('.escenario-tema')).toHaveText('Live interview');
  await page.getByRole('button', { name: /Invite a guest/ }).click();
  const enlace = await page.getByLabel('Guest link').inputValue();
  expect(enlace).toMatch(/\/join\/[a-z0-9]{32}$/);
  await expect(page.locator('[data-estado-invitado]')).toHaveAttribute('data-estado-invitado', 'esperando');
  await expect(page.locator('.escenario-video')).toContainText('Waiting for your guest');

  // El invitado: sin cuenta, con su nombre, su vista previa y el aviso de audífonos.
  const { contexto, pagina: inv } = await abrirInvitado(browser, new URL(enlace).pathname);
  await expect(inv.getByRole('heading', { name: 'Join a live interview' })).toBeVisible();
  await expect(inv.getByText('Soporte invited you to a live interview')).toBeVisible();
  await expect(inv.getByText(/Use headphones/)).toBeVisible();
  await inv.getByLabel('Your name').fill('Invitada E2E');
  await inv.getByRole('button', { name: 'Join the interview' }).click();

  // Los dos lados quedan conectados y el anfitrión ve el nombre del invitado en su cartel.
  await expect(page.locator('[data-estado-invitado]')).toHaveAttribute('data-estado-invitado', 'conectado', {
    timeout: 30_000,
  });
  await expect(inv.locator('[data-estado]')).toHaveAttribute('data-estado', 'conectado', { timeout: 30_000 });
  await expect(page.locator('.cartel-video')).toContainText('Invitada E2E');
  // El invitado ve y oye al anfitrión.
  await expect
    .poll(() => inv.locator('[data-video-anfitrion]').evaluate((v: HTMLVideoElement) => v.videoWidth > 0))
    .toBe(true);
  await expect
    .poll(() => page.locator('[data-video-invitado]').evaluate((v: HTMLVideoElement) => v.videoWidth > 0))
    .toBe(true);

  if (process.env.CAPTURAS) {
    await expect(page.getByText('Link copied')).toHaveCount(0, { timeout: 15_000 });
    await page.locator('[data-escenario]').screenshot({ path: 'docs/capturas/invitado-estudio-en.png' });
    await inv.screenshot({ path: 'docs/capturas/invitado-pagina-en.png' });
  }

  // Dónde cae la tarjeta del invitado dentro del escenario (en fracciones), para leer sus píxeles en el archivo.
  const esc = (await page.locator('[data-escenario]').boundingBox())!;
  const caja = (await page.locator('.escenario-video .escenario-caja').boundingBox())!;
  const fx = (caja.x + caja.width / 2 - esc.x) / esc.width;
  const fy = (caja.y + caja.height / 2 - esc.y) / esc.height;

  // Solo la voz del invitado en la grabación: el micrófono del anfitrión va en 0.
  await page.getByRole('slider', { name: 'Microphone in the recording' }).fill('0');
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(2500);

  // El invitado se cae de golpe (cierra todo sin despedirse): la grabación sigue.
  await contexto.close();
  await expect(page.locator('[data-estado-invitado]')).toHaveAttribute(
    'data-estado-invitado',
    /caido|salio/,
    {
      timeout: 30_000,
    },
  );
  await page.waitForTimeout(1000);
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

  const id = new URL(page.url()).pathname.split('/')[2]!;
  const tipo = ((await (await page.request.get(`/datos/videos/${id}`)).json()) as { video: { tipo: string } })
    .video.tipo;
  // Igual que en el Estudio: si se grabó en MP4, se espera a que el sitio termine de reordenarlo (C-INDICE-MP4).
  if (tipo.startsWith('video/mp4')) await page.waitForTimeout(8000);
  const archivo = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  writeFileSync(test.info().outputPath('invitado-grabado.mp4'), archivo);
  const examen = await examinarVideo(archivo);
  expect(examen.medidas).toEqual(['1920,1080']);
  // En la tarjeta del invitado sale SU cámara (magenta), no un hueco negro ni el aviso de espera.
  const [r, g, b] = examen.cuadro(1)(fx, fy) as [number, number, number];
  expect(r).toBeGreaterThan(170);
  expect(g).toBeLessThan(100);
  expect(b).toBeGreaterThan(170);
  // Y su voz entra en la grabación (el micrófono del anfitrión estaba en 0).
  expect(examen.picoDb()).toBeGreaterThan(-40);
});

test('la página del invitado: enlace que no existe, y versión en español', async ({ page, browser }) => {
  await page.goto(`/join/${'z'.repeat(32)}`);
  await expect(page.getByText('This invitation expired or does not exist')).toBeVisible();

  await crearCuenta(page);
  await page.goto('/studio');
  await page.getByText('A remote guest').click();
  await page.getByRole('button', { name: /Invite a guest/ }).click();
  const enlace = await page.getByLabel('Guest link').inputValue();
  const { contexto, pagina } = await abrirInvitado(browser, new URL(enlace).pathname, 'es');
  await expect(pagina.getByRole('heading', { name: 'Entra a una entrevista en vivo' })).toBeVisible();
  await expect(pagina.getByText(/Usa audífonos/)).toBeVisible();
  // El nombre escrito se recupera si se recarga (borrador).
  await pagina.getByLabel('Tu nombre').fill('Invitada');
  await pagina.waitForTimeout(800);
  await pagina.reload();
  await expect(pagina.getByLabel('Tu nombre')).toHaveValue('Invitada');
  if (process.env.CAPTURAS) {
    await pagina.getByRole('button', { name: 'Entrar a la entrevista' }).click();
    await expect(pagina.locator('[data-estado]')).toHaveAttribute('data-estado', 'conectado', {
      timeout: 30_000,
    });
    await page.evaluate(() => localStorage.setItem('pantalai:idioma', 'es'));
    await page.reload();
    await expect(page.locator('[data-estado-invitado]')).toHaveAttribute(
      'data-estado-invitado',
      'conectado',
      {
        timeout: 30_000,
      },
    );
    await expect
      .poll(() => page.locator('[data-video-invitado]').evaluate((v: HTMLVideoElement) => v.videoWidth > 0))
      .toBe(true);
    await page.locator('[data-escenario]').screenshot({ path: 'docs/capturas/invitado-estudio-es.png' });
    await pagina.screenshot({ path: 'docs/capturas/invitado-pagina-es.png' });
  }
  await contexto.close();
});
