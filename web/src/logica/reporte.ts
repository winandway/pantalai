// Modo «reporte de error» en la página de grabar (CANDADO C-REPORTE-ERROR): la extensión abre /record?reporte=1&ext=…
// Al grabar se anotan los tramos (para saltar las pausas) y, al terminar, se le pide a la extensión lo recogido, se
// alinea con el segundo del video y se sube junto al video.
import { pedir } from './api';
import { ajustarATamano, alinear, type Tramo } from './registros';

type Respuesta = Record<string, unknown> | undefined;
type RuntimePagina = {
  sendMessage(id: string, mensaje: unknown, responder: (r: Respuesta) => void): void;
  lastError?: unknown;
};

/** ¿Pidió la extensión el modo reporte? El id de la extensión son 32 letras de la «a» a la «p». */
export function leerModoReporte(busqueda: string): { ext: string } | null {
  const p = new URLSearchParams(busqueda);
  if (p.get('reporte') !== '1') return null;
  const ext = p.get('ext') ?? '';
  return /^[a-p]{32}$/.test(ext) ? { ext } : { ext: '' };
}

function runtime(): RuntimePagina | null {
  const c = (globalThis as { chrome?: { runtime?: RuntimePagina } }).chrome;
  return c?.runtime?.sendMessage ? c.runtime : null;
}

/** Mensaje a la extensión con tope de espera; sin extensión (o sin respuesta) da undefined. */
export function hablarConExtension(ext: string, mensaje: unknown, esperaMs = 8000): Promise<Respuesta> {
  const rt = runtime();
  if (!rt || !ext) return Promise.resolve(undefined);
  return new Promise((listo) => {
    const reloj = setTimeout(() => listo(undefined), esperaMs);
    try {
      rt.sendMessage(ext, mensaje, (r) => {
        clearTimeout(reloj);
        void rt.lastError; // leerlo evita el aviso de Chrome cuando la extensión no está
        listo(r);
      });
    } catch {
      clearTimeout(reloj);
      listo(undefined);
    }
  });
}

/** Lleva la cuenta de los tramos grabados (empezar, pausar, continuar) con el reloj de la computadora. */
export class RelojReporte {
  tramos: Tramo[] = [];
  empezar(ahora = Date.now()) {
    this.tramos = [{ desde: ahora, hasta: null, video: 0 }];
  }
  pausar(ahora = Date.now()) {
    const u = this.tramos.at(-1);
    if (u && u.hasta === null) u.hasta = ahora;
  }
  continuar(segundoVideo: number, ahora = Date.now()) {
    const u = this.tramos.at(-1);
    if (u && u.hasta !== null) this.tramos.push({ desde: ahora, hasta: null, video: segundoVideo });
  }
}

/**
 * Al terminar: pide lo recogido a la extensión, lo alinea y lo sube al video. Nunca frena la grabación: si algo
 * falla devuelve el motivo y el video queda igual.
 */
export async function enviarRegistros(
  ext: string,
  videoId: string,
  tramos: Tramo[],
): Promise<{ ok: true; consola: number; red: number } | { ok: false; motivo: string }> {
  const r = await hablarConExtension(ext, { tipo: 'tomar' });
  if (!r) return { ok: false, motivo: 'sin_extension' };
  if (typeof r.error === 'string') return { ok: false, motivo: r.error };
  const datos = ajustarATamano(alinear(r, tramos));
  const pagina = (r.pagina ?? { url: '', titulo: '' }) as { url: string; titulo: string };
  try {
    await pedir(`/datos/videos/${videoId}/registros`, {
      method: 'PUT',
      json: { ...datos, pagina, navegador: typeof r.navegador === 'string' ? r.navegador : '' },
    });
    return { ok: true, consola: datos.consola.length, red: datos.red.length };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'servidor' };
  }
}
