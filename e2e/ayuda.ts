import { expect, type Page } from '@playwright/test';
// Cada archivo de pruebas llega desde su propia dirección de internet de mentira, para no gastar entre todos el límite
// de 5 registros cada 15 minutos. Solo en local y en la compuerta: contra el sitio real (URL_BASE) no se manda,
// porque Cloudflare pone la dirección real y rechaza esa cabecera si viene del navegador. Un URL_BASE local (otro
// puerto, por ejemplo 8790) cuenta como local.
const n = () => Math.floor(Math.random() * 250) + 1;
const esLocal = (url?: string) => !url || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url);
export const cabecerasDePrueba = (): Record<string, string> =>
  esLocal(process.env.URL_BASE) ? { 'cf-connecting-ip': `10.${n()}.${n()}.${n()}` } : {};

/** La versión publicada del sitio: las pruebas que crean videos por la API la mandan, igual que la página. */
export async function versionDelSitio(request: {
  get: (u: string) => Promise<{ json: () => Promise<unknown> }>;
}) {
  const r = (await (await request.get('/datos/config')).json()) as { commit?: string };
  return r.commit ?? 'local';
}

/**
 * Examina un video como lo haría un editor (FFmpeg), fuera del navegador: el navegador de pruebas, sin pantalla, a
 * veces no pinta cuadros grandes y daba negros falsos. Devuelve las medidas de TODOS los cuadros (si cambian a mitad,
 * QuickTime y la Mac no lo abren) y una función para leer un píxel de un segundo dado (en fracciones 0 a 1).
 */
export async function examinarVideo(archivo: Buffer) {
  const { execFileSync, spawnSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const ruta = join(mkdtempSync(join(tmpdir(), 'pantalay-')), 'video.mp4');
  writeFileSync(ruta, archivo);
  const medidas = new Set(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'frame=width,height',
      '-of',
      'csv=p=0',
      ruta,
    ])
      .toString()
      .split('\n')
      .map((l) => l.trim().replace(/,+$/, '')) // algunas líneas traen una coma de más al final
      .filter(Boolean),
  );
  const ANCHO = 192;
  const cuadro = (segundo: number) => {
    const crudo = execFileSync('ffmpeg', [
      '-v',
      'error',
      '-ss',
      String(segundo),
      '-i',
      ruta,
      '-frames:v',
      '1',
      '-vf',
      `scale=${ANCHO}:-2`,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ]);
    const alto = crudo.length / 3 / ANCHO;
    return (fx: number, fy: number) => {
      const i = (Math.floor(alto * fy) * ANCHO + Math.floor(ANCHO * fx)) * 3;
      return [crudo[i]!, crudo[i + 1]!, crudo[i + 2]!];
    };
  };
  // El pico de sonido de todo el archivo, en dB (0 = el tope; ahí satura).
  const picoDb = (): number => {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-i', ruta, '-af', 'volumedetect', '-f', 'null', '-'], {
      encoding: 'utf8',
    });
    const m = /max_volume:\s*(-?[\d.]+) dB/.exec(r.stderr ?? '');
    return m ? Number(m[1]) : Number.NaN;
  };
  return { medidas: [...medidas], cuadro, picoDb };
}

/**
 * Espera a que el video recién grabado tenga su archivo DEFINITIVO en la página. Al terminar de grabar, el navegador
 * reordena el MP4 de fondo (C-INDICE-MP4) y, al reemplazarlo, el reproductor cambia de dirección y monta un <video>
 * NUEVO (C-SONIDO-RECIEN-GRABADO). Una prueba que agarra el <video> antes de ese cambio se queda con uno desmontado,
 * a medio cargar, que nunca llega a tener medidas («The source width is 0»). Era la prueba inestable del Short del
 * Estudio (10 nov 2026). Aquí se espera (1) a que la nube tenga el archivo con el índice al principio, si es MP4, y
 * (2) a que el reproductor de la página apunte a esa versión. Recién entonces se puede mirar el <video>.
 */
export async function esperarArchivoFinal(page: Page, id: string): Promise<void> {
  const { cajasDeArriba } = await import('../web/src/logica/cajasMp4');
  const datos = async () =>
    (
      (await (await page.request.get(`/datos/videos/${id}`)).json()) as {
        video: { tipo: string; bytes: number; version_archivo?: string | null };
      }
    ).video;
  if ((await datos()).tipo.startsWith('video/mp4'))
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
  const v = await datos();
  const version = encodeURIComponent(v.version_archivo ?? String(v.bytes));
  await expect
    .poll(
      async () =>
        (await page.locator('.reproductor video source').first().getAttribute('src'))?.endsWith(
          `v=${version}`,
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
}

/** Correo de prueba que no choca aunque dos pruebas arranquen en el mismo milisegundo (--repeat-each en paralelo). */
export const correoDePrueba = (prefijo: string): string =>
  `e2e.${prefijo}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
