import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-HABLANDO (fase 4): el cartel «Hablando / Escuchando» con sus barras va DENTRO del escenario, se enciende
// con el micrófono (el de prueba de Chrome suena a pitidos) y sale verde en el MP4 grabado.
test('el cartel «Hablando» se enciende con el micrófono y sale en la grabación', async ({ page }) => {
  test.setTimeout(180_000);
  // Una «voz» de mentira con sílabas y pausas, como alguien hablando. El micrófono de prueba de Chrome es un pitido
  // FIJO y, en Linux (la compuerta de GitHub), la supresión de ruido que el cartel pide (noiseSuppression) lo
  // aprende y lo apaga al segundo: el cartel se encendía antes de grabar y ya estaba apagado durante la grabación
  // (fallaba siempre en GitHub y nunca en la Mac). Una pista hecha con WebAudio no pasa por ese filtro.
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c?: MediaStreamConstraints) => {
      if (!c?.audio || c.video) return original(c);
      const ctx = new AudioContext();
      const tono = ctx.createOscillator();
      tono.type = 'sawtooth';
      tono.frequency.value = 180;
      // Sílabas de 150 ms con pausas de 150 ms (menos que lo que el cartel sostiene encendido). El vaivén lo lleva
      // otro oscilador, DENTRO del motor de sonido: no depende de los relojes de la página, que en una máquina
      // lenta se atrasan y dejaban la «voz» callada segundos enteros (26 nov 2026).
      const volumen = ctx.createGain();
      volumen.gain.value = 0.3;
      const silabas = ctx.createOscillator();
      silabas.type = 'square';
      silabas.frequency.value = 1000 / 300;
      const fuerza = ctx.createGain();
      fuerza.gain.value = 0.3;
      silabas.connect(fuerza).connect(volumen.gain);
      const salida = ctx.createMediaStreamDestination();
      tono.connect(volumen).connect(salida);
      tono.start();
      silabas.start();
      void ctx.resume();
      return salida.stream;
    };
  });
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.hablando.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await page.locator('#estudio-creador').fill('@creadora.prueba');
  const cartel = page.locator('[data-escenario] [data-voz=anfitrion]');
  await expect(cartel).toBeVisible();
  await page.mouse.click(5, 5); // despierta el sonido de la página, como el primer toque de una persona
  // La voz de prueba suena: el cartel se enciende (que se apague en el silencio lo cubre pruebas/voz.test.ts).
  await expect(cartel).toHaveAttribute('data-hablando', '1', { timeout: 15_000 });
  await expect(cartel).toHaveText('Speaking');
  // Apagado con su casilla, el cartel no sale; encendido, vuelve.
  await page.getByLabel(/Speaking \/ Listening/).uncheck();
  await expect(cartel).toHaveCount(0);
  await page.getByLabel(/Speaking \/ Listening/).check();
  await expect(cartel).toHaveAttribute('data-hablando', '1', { timeout: 15_000 });

  // Dónde está el cartel dentro del escenario (fracciones): ahí se mira el video grabado.
  const total = (await page.locator('[data-escenario]').boundingBox())!;
  const caja = (await cartel.boundingBox())!;
  const zona = {
    x: (caja.x - total.x) / total.width,
    y: (caja.y - total.y) / total.height,
    w: caja.width / total.width,
    h: caja.height / total.height,
  };
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page
    .getByRole('dialog', { name: 'Check before recording' })
    .getByRole('button', { name: 'All good, record' })
    .click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split('/')[2]!;
  const grabado = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  // Queda entre los resultados (en GitHub se suben solo si algo falla) para poder mirar los cuadros.
  writeFileSync(test.info().outputPath('hablando-grabado.video'), grabado);
  const examen = await examinarVideo(grabado);
  // Se mira TODO el cartel a tamaño real y se cuenta cuánto es verde de «Hablando». Antes se miraban 7 puntos sobre
  // el renglón de las letras en una imagen achicada: cada punto mezclaba letra blanca con fondo y acertar el verde
  // dependía de cómo cayera la letra en esa máquina (fallaba a veces en GitHub; 26 nov 2026).
  // El verde del cartel (#16a34a) lleva azul; el de la cámara de prueba, no: así no se confunden. En GitHub (Linux,
  // WebM VP9) sale más oscuro, cerca de (7, 142, 70), que en la Mac (H.264): por eso g > 110.
  const esVerdeCartel = ([r, g, b]: [number, number, number]) =>
    g > 110 && r < 90 && b > 45 && b < 130 && g > b + 40;
  const partes = [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2].map((s) => {
    const colores = examen.zona(s, zona);
    return colores.filter(esVerdeCartel).length / colores.length;
  });
  if (process.env.DEPURAR) console.log('parte verde del cartel en cada cuadro', partes);
  // Encendido, el fondo verde es más de la mitad del cartel (el resto son letras, barras y esquinas); apagado, nada.
  // La voz de prueba no para: tiene que salir «Hablando» en la mayoría de los cuadros mirados.
  const verdes = partes.filter((p) => p > 0.35).length;
  expect(
    verdes,
    `cuadros con el cartel «Hablando» en verde (parte verde: ${partes.map((p) => p.toFixed(2))})`,
  ).toBeGreaterThanOrEqual(6);

  // «Para YouTube» trae el crédito del video original ya puesto (C-CREDITO).
  await expect(page.locator('[data-credito]')).toContainText('Original video by @creadora.prueba');
});
