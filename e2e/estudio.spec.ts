import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, examinarVideo } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-ESTUDIO-RECORTE: el Estudio de reacciones graba SOLO el escenario (la máscara), nunca la pestaña entera.
// Se graba de verdad con la propia pestaña (Region Capture) y un reproductor de YouTube de prueba (verde) servido en
// la dirección del reproductor oficial: no se llama a YouTube. Se comprueba que el archivo mide lo del escenario,
// que el video de prueba sale en su tarjeta y que la esquina es la máscara oscura, no la página blanca.
const REPRODUCTOR_FALSO = `<!doctype html><html><body style="margin:0;background:#00c853">
<script>
let t = 0, estado = 5;
const decir = (m) => parent.postMessage(JSON.stringify(m), '*');
addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  (window.__ordenes = window.__ordenes || []).push(m);
  if (m.event === 'listening') { decir({ event: 'onReady' }); decir({ event: 'infoDelivery', info: { currentTime: t, playerState: estado, duration: 60 } }); }
  if (m.func === 'playVideo') estado = 1;
  if (m.func === 'pauseVideo') estado = 2;
  if (m.func === 'seekTo') t = m.args[0];
  decir({ event: 'infoDelivery', info: { currentTime: t, playerState: estado } });
});
</script></body></html>`;

test('el estudio graba solo el escenario con el video y la cámara', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/embed/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: REPRODUCTOR_FALSO }),
  );
  await page.route('**/datos/oembed?**', (r) =>
    r.fulfill({
      json: {
        id: 'dQw4w9WgXcQ',
        insertable: true,
        titulo: 'Video de prueba',
        autor: 'Canal de prueba',
        creador: '@canalprueba',
      },
    }),
  );
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Reaction Studio' })).toBeVisible();
  await page.getByLabel('YouTube or TikTok link').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Load video' }).click();
  // Nombre del creador y título automáticos (oEmbed).
  await expect(page.locator('.cartel-video')).toContainText('@canalprueba');
  await expect(page.locator('.escenario-tema')).toHaveText('Video de prueba');
  await expect(page.locator('.cartel').first()).toContainText('Soporte');
  // Botones de Pantalay (fuera del escenario) y atajos: el reproductor responde.
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();
  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();

  // CANDADO C-PROBADOR-MICROFONO: con un micrófono vivo (el de prueba suena) dice que llega sonido.
  await expect(page.locator('.probador-micro')).toHaveAttribute('data-estado', 'llega', { timeout: 10_000 });
  // Volumen solo del video: el reproductor recibe su propio volumen (no se toca la computadora ni el micrófono).
  await page.getByRole('slider', { name: 'Video volume' }).fill('40');
  const reproductor = page.frames().find((f) => f.url().includes('youtube-nocookie.com'))!;
  await expect
    .poll(() =>
      reproductor.evaluate(() =>
        ((window as unknown as { __ordenes?: { func?: string; args?: unknown[] }[] }).__ordenes ?? []).some(
          (o) => o.func === 'setVolume' && o.args?.[0] === 40,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole('slider', { name: 'Video volume' }).fill('100');

  // Selector de posiciones: «Dos horizontales» deja las dos tarjetas iguales; se vuelve a la clásica para grabar.
  await expect(page.getByRole('radio', { name: 'Camera + wide video' })).toBeChecked();
  await page.getByText('Two side by side').click();
  const cam = (await page.locator('.escenario-camara .escenario-caja').boundingBox())!;
  const vid = (await page.locator('.escenario-video .escenario-caja').boundingBox())!;
  expect(Math.abs(cam.width - vid.width)).toBeLessThan(3);
  expect(Math.abs(cam.height - vid.height)).toBeLessThan(3);
  await page.getByText('Camera + wide video').click();

  const escenario = await page.locator('[data-escenario]').boundingBox();
  expect(escenario).not.toBeNull();

  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  // CANDADO C-ESTUDIO-MEDIDA-FIJA: a mitad de la grabación la ventana se achica (el escenario cambia de tamaño).
  // Antes el video cambiaba de medida a mitad y el MP4 no abría en la Mac. Ahora tiene que salir con UNA medida.
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.waitForTimeout(1000);
  // Bajar la página mientras se graba ya no saca el escenario de la pantalla (queda fijo arriba) y los botones
  // siguen a la mano (barra fija abajo). Antes salía en el video solo un pedazo del escenario.
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  const fijo = (await page.locator('[data-escenario]').boundingBox())!;
  expect(fijo.y).toBeGreaterThanOrEqual(0);
  const barra = (await page.locator('.estudio-controles').boundingBox())!;
  expect(fijo.y + fijo.height).toBeLessThanOrEqual(barra.y + 1); // entero, sin quedar debajo de la barra
  await expect(page.getByRole('button', { name: 'Finish' })).toBeInViewport();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });

  // El archivo grabado: sus medidas y sus colores (con la ventana de vuelta a su tamaño para leerlo bien).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('.reproductor video').waitFor();
  const id = new URL(page.url()).pathname.split('/')[2]!;
  // Primero se espera a que el sitio termine de reordenar el MP4 por detrás (C-INDICE-MP4): leerlo a mitad del
  // reemplazo daba cuadros negros en la prueba. Solo si Chrome grabó en MP4 (en la compuerta de GitHub graba WebM).
  const tipo = ((await (await page.request.get(`/datos/videos/${id}`)).json()) as { video: { tipo: string } })
    .video.tipo;
  if (tipo.startsWith('video/mp4'))
    await expect
      .poll(
        async () => {
          const b = await (
            await page.request.get(`/media/${id}/video`, { headers: { range: 'bytes=0-65535' } })
          ).body();
          const cajas: string[] = [];
          for (let i = 0; i + 8 <= b.length && cajas.length < 4;) {
            const t = b.readUInt32BE(i);
            cajas.push(b.subarray(i + 4, i + 8).toString());
            if (t < 8) break;
            i += t;
          }
          return cajas.join(',');
        },
        { timeout: 60_000 },
      )
      .toMatch(/^ftyp,(free,)?moov/);
  const archivo = await (await page.request.get(`/media/${id}/video?descargar=1`)).body();
  writeFileSync(test.info().outputPath('estudio-grabado.mp4'), archivo);
  const examen = await examinarVideo(archivo);
  // Medida fija y estándar (1920 × 1080) en TODOS los cuadros, también después de achicar la ventana.
  expect(examen.medidas).toEqual(['1920,1080']);
  const px = examen.cuadro(1);
  // La esquina es la máscara oscura (no la página blanca de Pantalay).
  expect(px(0.01, 0.02).every((n) => n < 80)).toBe(true);
  // Y arriba a la derecha tampoco sale la barra blanca del sitio (botón Grabar, cuenta).
  expect(px(0.97, 0.03).every((n) => n < 80)).toBe(true);
  // En la tarjeta del video sale el reproductor (verde).
  const [rojo, verde, azul] = px(0.7, 0.45) as [number, number, number];
  expect(verde).toBeGreaterThan(140);
  expect(rojo).toBeLessThan(90);
  expect(azul).toBeLessThan(140);
});

// TikTok: se reconoce el enlace, se pone sola la posición vertical y el video vertical sale en su tarjeta.
// Se porta como el de verdad (comprobado el 9 nov 2026): muestra una portada y NO responde a nada (ni avisa que está
// listo) hasta que alguien toca el video por dentro; con ese toque arranca y desde ahí obedece play, pausa y salto.
const TIKTOK_FALSO = `<!doctype html><html><body style="margin:0;background:#00c853;height:100vh">
<script>
let activo = false;
const decir = (m) => parent.postMessage({ ...m, 'x-tiktok-player': true }, '*');
document.body.addEventListener('click', () => {
  if (activo) return;
  activo = true;
  decir({ type: 'onPlayerReady' });
  decir({ type: 'onStateChange', value: 1 });
});
addEventListener('message', (e) => {
  const m = e.data || {};
  if (!activo) return;
  if (m.type === 'play') decir({ type: 'onStateChange', value: 1 });
  if (m.type === 'pause') decir({ type: 'onStateChange', value: 2 });
  if (m.type === 'seekTo') decir({ type: 'onCurrentTime', value: { currentTime: m.value, duration: 30 } });
});
</script></body></html>`;

test('el estudio reacciona a un TikTok vertical', async ({ page }) => {
  await page.route('https://www.tiktok.com/player/v1/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: TIKTOK_FALSO }),
  );
  await page.route('**/datos/oembed?**', (r) =>
    r.fulfill({
      json: {
        plataforma: 'tiktok',
        id: '7691731841765690645',
        vertical: true,
        insertable: true,
        titulo: '',
        autor: '',
        creador: '@creadora.prueba',
      },
    }),
  );
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.tiktok.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/studio');
  await page
    .getByLabel('YouTube or TikTok link')
    .fill('https://www.tiktok.com/@creadora.prueba/video/7691731841765690645?_r=1&_t=ZS-9BGPBWAFyug');
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.locator('.cartel-video')).toContainText('@creadora.prueba');
  // Un TikTok elige solo la posición «video vertical grande» (pedido de Richard, 9 nov 2026).
  await expect(page.getByRole('radio', { name: /Big vertical video/ })).toBeChecked();
  await expect(page.locator('.escenario iframe')).toHaveAttribute(
    'src',
    /tiktok\.com\/player\/v1\/7691731841765690645\?controls=0/,
  );
  await page.locator('#estudio-tema').fill('Probando TikTok');
  await page.locator('#estudio-tema').blur();
  // CANDADO del play de TikTok: antes del toque nuestro botón no lo arranca y se pide el toque, con plan B.
  await expect(page.getByText('TikTok asks for one tap')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open on TikTok' })).toHaveAttribute(
    'href',
    'https://www.tiktok.com/@creadora.prueba/video/7691731841765690645',
  );
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  // Si no arranca, se explica con amabilidad que TikTok pide la sesión iniciada en el navegador (Richard, 9 nov 2026).
  await expect(page.getByText('TikTok only plays inside other sites if you are signed in')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to TikTok' }).first()).toHaveAttribute(
    'href',
    'https://www.tiktok.com/login',
  );
  // El toque dentro del video tiene que llegarle (antes una capa lo bloqueaba y quedaba la portada muerta).
  await page.frameLocator('.escenario iframe').locator('body').click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();
  await expect(page.getByText('TikTok asks for one tap')).toHaveCount(0);
  // Desde ahí lo manejan nuestros botones.
  await page.getByRole('button', { name: /Pause$/ }).click();
  await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();

  const total = (await page.locator('[data-escenario]').boundingBox())!;
  const caja = (await page.locator('.escenario-video .escenario-caja').boundingBox())!;
  expect(Math.abs(caja.width / caja.height - 9 / 16)).toBeLessThan(0.02);
  // El video ocupa el escenario de arriba abajo (no una tarjeta chiquita).
  expect(caja.height / total.height).toBeGreaterThan(0.85);
  const centro = {
    x: (caja.x + caja.width / 2 - total.x) / total.width,
    y: (caja.y + caja.height / 2 - total.y) / total.height,
  };
  const afuera = { x: (caja.x - 12 - total.x) / total.width, y: centro.y };

  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  await page.locator('.reproductor video').waitFor();
  const r = await page.evaluate(
    async ({ centro, afuera }) => {
      const v = document.querySelector('.reproductor video') as HTMLVideoElement;
      v.muted = true;
      // Se espera mirando el estado (los avisos del reproductor a veces ya pasaron): como mucho 15 s.
      const esperar = async (listo: () => boolean) => {
        for (let i = 0; i < 150 && !listo(); i++) await new Promise((ok) => setTimeout(ok, 100));
      };
      await esperar(() => v.readyState >= 1);
      v.currentTime = 1.5;
      await esperar(() => !v.seeking && v.readyState >= 2);
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const x = c.getContext('2d')!;
      x.drawImage(v, 0, 0);
      const px = (p: { x: number; y: number }) =>
        Array.from(
          x.getImageData(Math.floor(c.width * p.x), Math.floor(c.height * p.y), 1, 1).data.slice(0, 3),
        );
      return { centro: px(centro), afuera: px(afuera), foto: c.toDataURL('image/jpeg', 0.8) };
    },
    { centro, afuera },
  );
  writeFileSync(test.info().outputPath('estudio-tiktok.jpg'), Buffer.from(r.foto.split(',')[1]!, 'base64'));
  const [rojo, verde] = r.centro as [number, number, number];
  expect(verde).toBeGreaterThan(140);
  expect(rojo).toBeLessThan(90);
  // Justo al lado del video vertical ya es la máscara oscura: el video ocupa solo su franja.
  expect((r.afuera as number[]).every((n) => n < 90)).toBe(true);
});

// Formato vertical 9:16: el archivo sale vertical (Short), con la cámara arriba y el video abajo.
test('el estudio graba un Short vertical 9:16', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/embed/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: REPRODUCTOR_FALSO }),
  );
  await page.route('**/datos/oembed?**', (r) =>
    r.fulfill({
      json: {
        plataforma: 'youtube',
        id: 'dQw4w9WgXcQ',
        vertical: false,
        insertable: true,
        titulo: 'Tema vertical',
        autor: '',
        creador: '@c',
      },
    }),
  );
  await page.goto('/signup');
  const puede = await page.evaluate(() => 'CropTarget' in window);
  test.skip(!puede, 'Este navegador no tiene Region Capture.');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.vertical.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.getByText('Vertical 9:16').click();
  await expect(page.locator('.estudio-posiciones')).toHaveCount(0);
  await page.getByLabel('YouTube or TikTok link').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.locator('.escenario-tema')).toHaveText('Tema vertical');
  const total = (await page.locator('[data-escenario]').boundingBox())!;
  expect(Math.abs(total.width / total.height - 9 / 16)).toBeLessThan(0.01);
  const cam = (await page.locator('.escenario-camara .escenario-caja').boundingBox())!;
  const vid = (await page.locator('.escenario-video .escenario-caja').boundingBox())!;
  expect(cam.y + cam.height).toBeLessThan(vid.y); // cámara arriba, video abajo
  const centro = {
    x: (vid.x + vid.width / 2 - total.x) / total.width,
    y: (vid.y + vid.height / 2 - total.y) / total.height,
  };
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.locator('.estudio .indicador')).toHaveText('Recording', { timeout: 20_000 });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60_000 });
  await page.locator('.reproductor video').waitFor();
  const r = await page.evaluate(async (centro) => {
    const v = document.querySelector('.reproductor video') as HTMLVideoElement;
    v.muted = true;
    // Se espera mirando el estado (los avisos del reproductor a veces ya pasaron): como mucho 15 s.
    const esperar = async (listo: () => boolean) => {
      for (let i = 0; i < 150 && !listo(); i++) await new Promise((ok) => setTimeout(ok, 100));
    };
    await esperar(() => v.readyState >= 1);
    v.currentTime = 1.5;
    await esperar(() => !v.seeking && v.readyState >= 2);
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const x = c.getContext('2d')!;
    // El cuadro puede no estar pintado todavía aunque el video diga que está listo: se redibuja hasta que tenga algo.
    for (let i = 0; i < 20; i++) {
      x.drawImage(v, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let algo = false;
      for (let j = 0; j < d.length; j += 4 * 997) if (d[j]! + d[j + 1]! + d[j + 2]! > 30) algo = true;
      if (algo) break;
      await new Promise((ok) => setTimeout(ok, 200));
    }
    const d = x.getImageData(Math.floor(c.width * centro.x), Math.floor(c.height * centro.y), 1, 1).data;
    return {
      w: v.videoWidth,
      h: v.videoHeight,
      centro: Array.from(d.slice(0, 3)),
      foto: c.toDataURL('image/jpeg', 0.8),
    };
  }, centro);
  writeFileSync(test.info().outputPath('estudio-vertical.jpg'), Buffer.from(r.foto.split(',')[1]!, 'base64'));
  expect({ w: r.w, h: r.h }).toEqual({ w: 1080, h: 1920 });
  const [rojo, verde] = r.centro as [number, number, number];
  expect(verde).toBeGreaterThan(140);
  expect(rojo).toBeLessThan(90);
});

// Plan B: un video que no obedece al play nunca deja la portada muerta: aviso claro, botón de vuelta y «Abrir».
test('si el video no arranca, se avisa y se ofrece abrirlo', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/embed/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><body style="background:#111"></body>',
    }),
  );
  await page.route('**/datos/oembed?**', (r) =>
    r.fulfill({
      json: {
        plataforma: 'youtube',
        id: 'dQw4w9WgXcQ',
        vertical: false,
        insertable: true,
        titulo: 'T',
        autor: '',
        creador: '@c',
      },
    }),
  );
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.muerto.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.getByLabel('YouTube or TikTok link').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.locator('.escenario iframe')).toBeVisible();
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByText('The video did not start')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
});

// El Estudio se encuentra fácil: botón en el menú, opción en Grabar y tarjeta grande en la portada (Richard, 9 nov 2026).
test('el estudio está a la vista en el menú, en Grabar y en la portada', async ({ page }) => {
  await page.goto('/');
  const tarjeta = page.locator('#estudio-de-reacciones');
  await expect(tarjeta.getByRole('heading', { name: 'React to any video like a pro podcast' })).toBeVisible();
  await expect(tarjeta.getByRole('link', { name: /Open the Reaction Studio/ })).toHaveAttribute(
    'href',
    '/signup',
  );
  await expect(page.locator('.portada-novedad')).toContainText('Reaction Studio');
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(`e2e.estudio.menu.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page
    .locator('.encabezado-nav')
    .getByRole('link', { name: /Reactions/ })
    .click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.goto('/record');
  await page.getByRole('link', { name: /React to a video/ }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText('YouTube plays without an account')).toBeVisible();
});

test('el estudio pide sesión y no se indexa', async ({ page, request }) => {
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/login/);
  const html = await (await request.get('/studio')).text();
  expect(html).toContain('noindex');
});
