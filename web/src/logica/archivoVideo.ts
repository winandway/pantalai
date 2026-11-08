// Cuentas para subir un video desde la computadora: qué archivos sirven, su título y cuánto dura.
import { ALL_FORMATS, BlobSource, Input } from 'mediabunny';

/** Tope de un archivo subido: 5 GB (lo mismo que aguanta una grabación larga en partes). */
export const MAXIMO_BYTES = 5 * 1024 * 1024 * 1024;

/** null si sirve; si no, la clave del texto que explica por qué. */
export function archivoDeVideoValido(a: {
  type: string;
  size: number;
}): 'archivoNoVideo' | 'archivoGrande' | null {
  if (!/^video\/(mp4|webm)$/.test(a.type.split(';')[0] ?? '')) return 'archivoNoVideo';
  if (a.size <= 0 || a.size > MAXIMO_BYTES) return 'archivoGrande';
  return null;
}

/** El nombre del archivo sin la extensión ni guiones bajos, como título del video. */
export function tituloDeArchivo(nombre: string): string {
  const t = nombre
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.slice(0, 200);
}

/** Duración en segundos, leída del propio archivo. 0 si no se puede leer (el servidor la acepta igual). */
export async function duracionDeArchivo(archivo: Blob): Promise<number> {
  try {
    const input = new Input({ source: new BlobSource(archivo), formats: ALL_FORMATS });
    const d = await input.computeDuration();
    return Number.isFinite(d) && d > 0 ? Math.round(d * 10) / 10 : 0;
  } catch (e) {
    console.error('duración del archivo', e);
    return 0;
  }
}
