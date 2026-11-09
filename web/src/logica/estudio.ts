// Estudio de reacciones: lo puro (reconocer el enlace de YouTube, hablar con su reproductor oficial, armar la
// máscara). Plan: docs/PLAN-ESTUDIO-DE-REACCIONES.md. Candado C-ESTUDIO-RECORTE en CANDADOS.md.

export type VideoYoutube = { id: string; short: boolean; inicio: number };

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);

/** «1m30s», «90», «1h2m3s» → segundos. */
export function segundosDe(t: string | null | undefined): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (!m || !m[0]) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Reconoce un enlace de YouTube (normal, corto, Shorts, en vivo, insertado). null si no lo es. */
export function videoDeYoutube(texto: string): VideoYoutube | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;
  const partes = url.pathname.split('/').filter(Boolean);
  let id: string | undefined;
  let short = false;
  if (host === 'youtu.be') id = partes[0];
  else if (partes[0] === 'watch') id = url.searchParams.get('v') ?? undefined;
  else if (['shorts', 'embed', 'live', 'v'].includes(partes[0] ?? '')) {
    id = partes[1];
    short = partes[0] === 'shorts';
  }
  if (!id || !ID.test(id)) return null;
  return { id, short, inicio: segundosDe(url.searchParams.get('t') ?? url.searchParams.get('start')) };
}

/** Dirección del reproductor oficial insertado: sin controles de YouTube, sin sugeridos ajenos, con su API. */
export function urlReproductor(v: VideoYoutube, origen: string): string {
  const q = new URLSearchParams({
    enablejsapi: '1',
    controls: '0',
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
    origin: origen,
  });
  if (v.inicio) q.set('start', String(v.inicio));
  return `https://www.youtube-nocookie.com/embed/${v.id}?${q.toString()}`;
}

/** Orden para el reproductor insertado (protocolo de mensajes de su API). */
export function ordenYoutube(func: 'playVideo' | 'pauseVideo' | 'seekTo', args: unknown[] = []): string {
  return JSON.stringify({ event: 'command', func, args });
}

/** Lo primero que se le dice al reproductor para que empiece a contar su estado. */
export const ESCUCHAR_YOUTUBE = JSON.stringify({ event: 'listening', id: 1, channel: 'widget' });

export type MensajeYoutube =
  | { tipo: 'listo' }
  | { tipo: 'info'; tiempo?: number; estado?: number; duracion?: number }
  | { tipo: 'error'; codigo: number };

/** Interpreta un mensaje que llega del reproductor. null si no es suyo o no sirve. */
export function leerMensajeYoutube(dato: unknown): MensajeYoutube | null {
  let m: unknown = dato;
  if (typeof dato === 'string') {
    try {
      m = JSON.parse(dato);
    } catch {
      return null;
    }
  }
  if (!m || typeof m !== 'object') return null;
  const { event, info } = m as { event?: string; info?: unknown };
  if (event === 'onReady') return { tipo: 'listo' };
  if (event === 'onError') return { tipo: 'error', codigo: Number(info) || 0 };
  if ((event === 'infoDelivery' || event === 'initialDelivery') && info && typeof info === 'object') {
    const i = info as { currentTime?: unknown; playerState?: unknown; duration?: unknown };
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
    return {
      tipo: 'info',
      tiempo: num(i.currentTime),
      estado: num(i.playerState),
      duracion: num(i.duration),
    };
  }
  if (event === 'onStateChange') return { tipo: 'info', estado: Number(info) };
  return null;
}

/** Errores del reproductor que significan «el dueño no deja verlo fuera de YouTube» (o restricción de edad). */
export function noInsertable(codigo: number): boolean {
  return codigo === 101 || codigo === 150 || codigo === 153;
}

/** Atajos del estudio (los mismos que el reproductor de YouTube). */
export function accionDeTecla(tecla: string): 'alternar' | 'atras' | 'adelante' | null {
  if (tecla === ' ' || tecla === 'k' || tecla === 'K') return 'alternar';
  if (tecla === 'ArrowLeft' || tecla === 'j' || tecla === 'J') return 'atras';
  if (tecla === 'ArrowRight' || tecla === 'l' || tecla === 'L') return 'adelante';
  return null;
}

/** El segundo al que se salta con ±5 s, sin pasarse de los bordes. */
export function saltar(actual: number, delta: number, duracion?: number): number {
  const s = Math.max(0, actual + delta);
  return duracion && duracion > 0 ? Math.min(s, Math.max(0, duracion - 0.5)) : s;
}

/** «@creador» desde la dirección del canal; si no hay arroba, el nombre tal cual. */
export function arrobaDe(autorUrl: string | undefined, autorNombre: string | undefined): string {
  const m = /\/(@[\w.-]{1,60})\/?$/.exec(autorUrl ?? '');
  if (m) return m[1]!;
  return (autorNombre ?? '').trim();
}

const cortar = (t: string, n: number) => {
  const s = t.replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
};

export type Mascara = {
  programa: string;
  anfitrion: string;
  rolAnfitrion: string;
  creador: string;
  rolCreador: string;
  tema: string;
  etiquetaTema: string;
};

/** Los textos de la máscara «Podcast», cortados para que nunca se salgan de su cartel. */
export function armarMascara(d: {
  idioma: 'en' | 'es';
  programa?: string;
  anfitrion: string;
  creador?: string;
  tema?: string;
}): Mascara {
  const es = d.idioma === 'es';
  const primerNombre = cortar(d.anfitrion.split(/\s+/)[0] ?? '', 24);
  const programa = cortar(d.programa?.trim() || (es ? 'Estudio de reacciones' : 'Reaction Studio'), 40);
  return {
    programa,
    anfitrion: primerNombre || (es ? 'Anfitrión' : 'Host'),
    rolAnfitrion: es ? 'Anfitrión' : 'Host',
    creador: cortar(d.creador?.trim() || (es ? 'Video' : 'Video'), 32),
    rolCreador: es ? 'Reaccionando' : 'Reacting',
    tema: cortar(d.tema?.trim() || (es ? 'Pega un enlace para empezar' : 'Paste a link to start'), 90),
    etiquetaTema: es ? 'Tema de hoy' : "Today's topic",
  };
}

/** Título del video grabado. */
export function tituloReaccion(tema: string | undefined, idioma: 'en' | 'es'): string | undefined {
  const t = tema?.trim();
  if (!t) return undefined;
  return cortar(`${idioma === 'es' ? 'Reacción' : 'Reaction'}: ${t}`, 100);
}

/** Dónde está una caja dentro de otra, en fracciones (0 a 1). Sirve para poner la marca sobre la cámara. */
export function zonaRelativa(
  hijo: { left: number; top: number; width: number; height: number },
  padre: { left: number; top: number; width: number; height: number },
): { x: number; y: number; w: number; h: number } | null {
  if (!padre.width || !padre.height) return null;
  const f = (n: number) => Math.min(1, Math.max(0, n));
  return {
    x: f((hijo.left - padre.left) / padre.width),
    y: f((hijo.top - padre.top) / padre.height),
    w: f(hijo.width / padre.width),
    h: f(hijo.height / padre.height),
  };
}

/** Chrome y Edge de computadora pueden grabar SOLO un elemento de la pestaña (Region Capture). */
export function puedeRecortarPestana(w: unknown = globalThis): boolean {
  const g = w as {
    CropTarget?: { fromElement?: unknown };
    MediaStreamTrack?: { prototype?: { cropTo?: unknown } };
    BrowserCaptureMediaStreamTrack?: { prototype?: { cropTo?: unknown } };
    navigator?: { mediaDevices?: { getDisplayMedia?: unknown } };
    MediaRecorder?: unknown;
  };
  return Boolean(
    (typeof g.CropTarget?.fromElement === 'function' ||
      typeof (g as { RestrictionTarget?: { fromElement?: unknown } }).RestrictionTarget?.fromElement ===
        'function') &&
    // En Chrome «cropTo» vive en la pista de captura de pestaña (BrowserCaptureMediaStreamTrack).
    (typeof g.BrowserCaptureMediaStreamTrack?.prototype?.cropTo === 'function' ||
      typeof g.MediaStreamTrack?.prototype?.cropTo === 'function') &&
    typeof g.navigator?.mediaDevices?.getDisplayMedia === 'function' &&
    g.MediaRecorder,
  );
}
