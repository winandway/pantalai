// Reporte de error (CANDADO C-REPORTE-ERROR): lo que la extensión de Chrome recoge de la pestaña con el fallo
// (mensajes de consola y peticiones de red) y se guarda junto al video. Lógica pura: la usan la extensión (al
// recoger), la página de grabar (al alinear con el minuto), el servidor (al volver a limpiar) y la página del video.
// NUNCA se guardan cuerpos, cookies ni cabeceras; los valores sensibles de las direcciones se tapan.

export type NivelConsola = 'log' | 'info' | 'warn' | 'error' | 'excepcion';
/** «t» = momento en ms (reloj de la computadora). */
export type ConsolaCruda = { t: number; nivel: NivelConsola; texto: string };
export type RedCruda = {
  t: number;
  metodo: string;
  url: string;
  /** 0 = no hubo respuesta (sin red, bloqueada o cancelada). */
  estado: number;
  ms: number;
  tipo: string;
};
/** Ya alineado con el video: «s» = segundo del video; «antes» = pasó antes de empezar a grabar. */
export type ConsolaVideo = Omit<ConsolaCruda, 't'> & { s: number; antes?: boolean };
export type RedVideo = Omit<RedCruda, 't'> & { s: number; antes?: boolean };
export type Registros = { consola: ConsolaVideo[]; red: RedVideo[] };

export const TOPES = {
  consola: 500,
  red: 500,
  texto: 1000,
  url: 500,
  /** Tope del cuerpo que se sube al servidor (JSON). */
  bytes: 256 * 1024,
} as const;

export const NIVELES: NivelConsola[] = ['log', 'info', 'warn', 'error', 'excepcion'];
const OCULTO = '[hidden]';

/** Nombres de parámetros que suelen llevar secretos o datos personales. */
const SENSIBLE =
  /(token|key|secret|pass|pwd|auth|session|sid|code|signature|sig|credential|email|correo|phone|telefono|jwt|bearer|otp|pin|card|ssn)/i;

function cortar(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Dirección sin datos sensibles: sin usuario ni contraseña, sin la parte después de «#», y con el VALOR tapado en
 * los parámetros de consulta que suenan a secreto (token, key, password, email…). Las direcciones que no se pueden
 * leer se cortan donde empieza la consulta.
 */
export function limpiarUrl(u: string, base?: string): string {
  let url: URL;
  try {
    url = new URL(u, base);
  } catch {
    return cortar(String(u).split(/[?#]/)[0] ?? '', TOPES.url);
  }
  if (url.protocol === 'data:' || url.protocol === 'blob:') return `${url.protocol}…`;
  url.username = '';
  url.password = '';
  url.hash = '';
  for (const k of [...new Set(url.searchParams.keys())]) {
    if (SENSIBLE.test(k)) url.searchParams.set(k, OCULTO);
  }
  // El [hidden] queda legible (sin %5B…%5D).
  return cortar(url.toString().replaceAll('%5Bhidden%5D', OCULTO), TOPES.url);
}

/** Texto de consola sin los secretos más obvios (tokens «Bearer», JWT y claves largas) y con tope de largo. */
export function limpiarTexto(s: unknown): string {
  const texto = typeof s === 'string' ? s : String(s ?? '');
  return cortar(
    texto
      .replace(/(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, `$1 ${OCULTO}`)
      .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, OCULTO)
      .replace(/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/g, OCULTO)
      .replace(
        /((?:password|passwd|pwd|token|secret|api[_-]?key)["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi,
        `$1${OCULTO}`,
      ),
    TOPES.texto,
  );
}

const numero = (v: unknown, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : def);

/** Una entrada de consola válida y limpia, o null. */
export function limpiarConsola(e: unknown): ConsolaCruda | null {
  if (!e || typeof e !== 'object') return null;
  const x = e as Record<string, unknown>;
  const nivel = NIVELES.includes(x.nivel as NivelConsola) ? (x.nivel as NivelConsola) : 'log';
  const texto = limpiarTexto(x.texto);
  if (!texto) return null;
  return { t: numero(x.t), nivel, texto };
}

/** Una petición de red válida y limpia, o null. Solo método, dirección, estado, duración y tipo. */
export function limpiarRed(e: unknown): RedCruda | null {
  if (!e || typeof e !== 'object') return null;
  const x = e as Record<string, unknown>;
  if (typeof x.url !== 'string' || !x.url) return null;
  return {
    t: numero(x.t),
    metodo:
      cortar(
        String(x.metodo ?? 'GET')
          .toUpperCase()
          .replace(/[^A-Z]/g, ''),
        10,
      ) || 'GET',
    url: limpiarUrl(x.url),
    estado: Math.max(0, Math.min(999, Math.round(numero(x.estado)))),
    ms: Math.max(0, Math.round(numero(x.ms))),
    tipo: cortar(String(x.tipo ?? ''), 30),
  };
}

/**
 * Limpia y recorta lo recogido: entradas válidas, ordenadas por momento, y solo las MÁS RECIENTES hasta el tope
 * (el fallo suele estar al final).
 */
export function limpiarRegistros(crudo: { consola?: unknown; red?: unknown }): {
  consola: ConsolaCruda[];
  red: RedCruda[];
} {
  const lista = <T>(v: unknown, f: (e: unknown) => T | null, tope: number) =>
    (Array.isArray(v) ? v : [])
      .map(f)
      .filter((e): e is T => e !== null)
      .sort((a, b) => (a as { t: number }).t - (b as { t: number }).t)
      .slice(-tope);
  return {
    consola: lista(crudo.consola, limpiarConsola, TOPES.consola),
    red: lista(crudo.red, limpiarRed, TOPES.red),
  };
}

/**
 * Tramos en que el video estuvo grabando: «desde» y «hasta» (ms del reloj) y en qué segundo del video empezó cada
 * uno. Una pausa cierra el tramo; continuar abre otro.
 */
export type Tramo = { desde: number; hasta: number | null; video: number };

/** Segundo del video en que pasó algo ocurrido en el momento «t». Antes de grabar → 0; en una pausa → donde paró. */
export function aSegundo(t: number, tramos: Tramo[]): { s: number; antes: boolean } {
  const primero = tramos[0];
  if (!primero || t < primero.desde) return { s: 0, antes: true };
  let s = 0;
  for (const tr of tramos) {
    if (t < tr.desde) break;
    const fin = tr.hasta ?? Number.POSITIVE_INFINITY;
    s = tr.video + (Math.min(t, fin) - tr.desde) / 1000;
  }
  return { s: Math.round(s * 10) / 10, antes: false };
}

/** Pasa lo recogido (con momentos del reloj) a segundos del video, ya limpio y recortado. */
export function alinear(crudo: { consola?: unknown; red?: unknown }, tramos: Tramo[]): Registros {
  const limpio = limpiarRegistros(crudo);
  const pasar = <T extends { t: number }>(e: T) => {
    const { t, ...resto } = e;
    const { s, antes } = aSegundo(t, tramos);
    return antes ? { ...resto, s, antes } : { ...resto, s };
  };
  return { consola: limpio.consola.map(pasar), red: limpio.red.map(pasar) };
}

/** Si el JSON pasa del tope, quita las entradas más viejas (de las dos listas, alternando) hasta que entre. */
export function ajustarATamano(r: Registros, bytes: number = TOPES.bytes): Registros {
  const out = { consola: [...r.consola], red: [...r.red] };
  const medida = () => new TextEncoder().encode(JSON.stringify(out)).length;
  while (medida() > bytes && (out.consola.length || out.red.length)) {
    const a = out.consola[0]?.s ?? Number.POSITIVE_INFINITY;
    const b = out.red[0]?.s ?? Number.POSITIVE_INFINITY;
    if (a <= b) out.consola.shift();
    else out.red.shift();
  }
  return out;
}

export type Fila = ({ clase: 'consola' } & ConsolaVideo) | ({ clase: 'red' } & RedVideo);

/** Consola y red juntas, en el orden del video (para el panel «Consola y red»). */
export function filas(r: Registros): Fila[] {
  return [
    ...r.consola.map((e) => ({ clase: 'consola' as const, ...e })),
    ...r.red.map((e) => ({ clase: 'red' as const, ...e })),
  ].sort((a, b) => a.s - b.s);
}

/** ¿Es un fallo? Errores de consola y peticiones sin respuesta o con estado 400 o más. */
export function esFallo(f: Fila): boolean {
  return f.clase === 'consola'
    ? f.nivel === 'error' || f.nivel === 'excepcion'
    : f.estado === 0 || f.estado >= 400;
}

/** La última fila que ya pasó en el segundo «ahora» del video (-1 si ninguna). */
export function filaActual(lista: { s: number }[], ahora: number): number {
  let i = -1;
  for (let k = 0; k < lista.length; k++) {
    if (lista[k]!.s <= ahora) i = k;
    else break;
  }
  return i;
}
