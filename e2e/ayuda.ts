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
  const { execFileSync } = await import('node:child_process');
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
  return { medidas: [...medidas], cuadro };
}
