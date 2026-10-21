import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ipDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: { 'cf-connecting-ip': ipDePrueba() } });

// CANDADO C-VIDEO-A-LA-VISTA (iPhone): al darle play, la página NO salta a la transcripción y el video sigue a la vista;
// el reproductor usa la copia MP4 (Safari no reproduce WebM) y trae subtítulos.
test('en iPhone el video se reproduce y no se va de la vista', async ({ page, request, baseURL }) => {
  // Se prepara un video con transcripción y su copia MP4, como queda después de grabar.
  const correo = `iphone.${Date.now()}@example.com`;
  const H = { 'x-pantalai': '1' };
  await request.post('/datos/registro', {
    headers: H,
    data: { nombre: 'Soporte iPhone', correo, clave: 'clave-segura-1' },
  });
  const { id } = await (await request.post('/datos/videos', { headers: H, data: { idioma: 'es' } })).json();
  const webm = readFileSync(new URL('./datos/corto.webm', import.meta.url));
  const p1 = (await (await request.put(`/datos/videos/${id}/partes/1`, { headers: H, data: webm })).json())
    .parte;
  const transcripcion = Array.from({ length: 12 }, (_, i) => ({
    inicio: i * 3,
    fin: i * 3 + 2.5,
    texto: `Frase número ${i + 1} del video de prueba.`,
  }));
  await request.post(`/datos/videos/${id}/completar`, {
    headers: H,
    data: { partes: [p1], duracion: 40, transcripcion },
  });
  await request.post(`/datos/videos/${id}/mp4`, { headers: H });
  const mp4 = readFileSync(new URL('./datos/corto.mp4', import.meta.url));
  const m1 = (await (await request.put(`/datos/videos/${id}/mp4/partes/1`, { headers: H, data: mp4 })).json())
    .parte;
  await request.post(`/datos/videos/${id}/mp4/completar`, { headers: H, data: { partes: [m1] } });

  await page.goto(`${baseURL}/v/${id}`);
  await page.waitForSelector('.reproductor video');
  const r = await page.evaluate(async () => {
    const v = document.querySelector('.reproductor video') as HTMLVideoElement;
    v.muted = true;
    await v.play();
    await new Promise((ok) => setTimeout(ok, 7000));
    return {
      t: v.currentTime,
      fuente: v.currentSrc,
      scroll: window.scrollY,
      arriba: v.getBoundingClientRect().top,
      pistas: v.textTracks.length,
    };
  });
  expect(r.t).toBeGreaterThan(3);
  expect(r.fuente).toContain('formato=mp4');
  expect(r.scroll).toBeLessThan(50);
  expect(r.arriba).toBeGreaterThanOrEqual(0);
  expect(r.pistas).toBe(1);
  // La transcripción está a un toque, no encima del video.
  await expect(page.getByRole('button', { name: /Transcript and comments/ })).toBeVisible();
});
