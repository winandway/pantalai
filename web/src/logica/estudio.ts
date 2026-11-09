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
export function ordenYoutube(
  func: 'playVideo' | 'pauseVideo' | 'seekTo' | 'setVolume' | 'mute' | 'unMute',
  args: unknown[] = [],
): string {
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

// ---------- TikTok (reproductor oficial «Embed Player v1», developers.tiktok.com/doc/embed-player) ----------

export type VideoTiktok = {
  id: string;
  /** El @ del creador, sacado del enlace («» si es un enlace corto). */
  creador: string;
  /** Enlace corto (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/…): el servidor lo convierte en el largo. */
  corto?: string;
};

const HOSTS_TIKTOK = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);
const ID_TIKTOK = /^\d{8,25}$/;

function aUrl(texto: string): URL | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  try {
    return new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }
}

/** Reconoce un enlace de TikTok: el largo (@usuario/video/123…), el del reproductor o uno corto. */
export function videoDeTiktok(texto: string): VideoTiktok | null {
  const url = aUrl(texto);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS_TIKTOK.has(host)) return null;
  const partes = url.pathname.split('/').filter(Boolean);
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || partes[0] === 't') {
    const codigo = host.startsWith('v') ? partes[0] : partes[1];
    if (!codigo || !/^[A-Za-z0-9]{4,20}$/.test(codigo)) return null;
    return { id: '', creador: '', corto: `https://${host}/${host.startsWith('v') ? '' : 't/'}${codigo}/` };
  }
  if (partes[0]?.startsWith('@') && partes[1] === 'video' && ID_TIKTOK.test(partes[2] ?? ''))
    return { id: partes[2]!, creador: partes[0].slice(0, 61) };
  if ((partes[0] === 'player' && partes[1] === 'v1') || (partes[0] === 'embed' && partes[1] === 'v2'))
    return ID_TIKTOK.test(partes[2] ?? '') ? { id: partes[2]!, creador: '' } : null;
  return null;
}

/** El reproductor oficial de TikTok sin sus botones (los nuestros van fuera del escenario). */
export function urlReproductorTiktok(id: string): string {
  const q = new URLSearchParams({
    controls: '0',
    progress_bar: '0',
    play_button: '0',
    volume_control: '0',
    fullscreen_button: '0',
    timestamp: '0',
    music_info: '0',
    description: '0',
    rel: '0',
    native_context_menu: '0',
    closed_caption: '0',
  });
  return `https://www.tiktok.com/player/v1/${id}?${q.toString()}`;
}

/** Orden para el reproductor de TikTok (su protocolo: type, value y la marca «x-tiktok-player»). */
export function ordenTiktok(tipo: 'play' | 'pause' | 'seekTo' | 'mute' | 'unMute', valor?: number) {
  return valor === undefined
    ? { type: tipo, 'x-tiktok-player': true }
    : { type: tipo, value: valor, 'x-tiktok-player': true };
}

/** Interpreta un mensaje del reproductor de TikTok (llega como objeto o como texto). */
export function leerMensajeTiktok(dato: unknown): MensajeYoutube | null {
  let m: unknown = dato;
  if (typeof dato === 'string') {
    try {
      m = JSON.parse(dato);
    } catch {
      return null;
    }
  }
  if (!m || typeof m !== 'object') return null;
  const { type, value } = m as { type?: string; value?: unknown };
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
  if (type === 'onPlayerReady') return { tipo: 'listo' };
  if (type === 'onStateChange') return { tipo: 'info', estado: num(value) };
  if (type === 'onCurrentTime' && value && typeof value === 'object') {
    const v = value as { currentTime?: unknown; duration?: unknown };
    return { tipo: 'info', tiempo: num(v.currentTime), duracion: num(v.duration) };
  }
  if (type === 'onPlayerError' && value && typeof value === 'object')
    return { tipo: 'error', codigo: num((value as { errorCode?: unknown }).errorCode) ?? 0 };
  return null;
}

// ---------- Las dos plataformas juntas ----------

/** «archivo»: un video de la computadora de la persona (no se sube a ningún lado: se reproduce desde ella). */
export type Plataforma = 'youtube' | 'tiktok' | 'archivo';
export type VideoPegado =
  | { plataforma: 'youtube'; id: string; vertical: boolean; inicio: number; creador: string }
  | { plataforma: 'tiktok'; id: string; vertical: true; inicio: 0; creador: string; corto?: string }
  | { plataforma: 'archivo'; id: string; vertical: boolean; inicio: 0; creador: string; nombre: string };

/** El tema que se propone para un archivo: su nombre sin extensión ni guiones bajos. */
export function temaDeArchivo(nombre: string): string {
  return nombre
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/** Un archivo de video es vertical si es más alto que ancho. */
export function esVertical(ancho: number, alto: number): boolean {
  return alto > ancho && ancho > 0;
}

/** Reconoce un enlace de YouTube o de TikTok. */
export function videoDeEnlace(texto: string): VideoPegado | null {
  const y = videoDeYoutube(texto);
  if (y) return { plataforma: 'youtube', id: y.id, vertical: y.short, inicio: y.inicio, creador: '' };
  const t = videoDeTiktok(texto);
  if (t)
    return { plataforma: 'tiktok', id: t.id, vertical: true, inicio: 0, creador: t.creador, corto: t.corto };
  return null;
}

/** El formato del video que sale: horizontal 16:9 (YouTube) o vertical 9:16 (Shorts, TikTok, Reels). */
export type Formato = 'horizontal' | 'vertical';
export const FORMATOS: Formato[] = ['horizontal', 'vertical'];

/**
 * Las clases del escenario. En vertical la posición es fija (cámara arriba, video abajo, tema al pie) y un video
 * vertical se recorta al centro (4:5) para que quepa sin quedar como una tira finita.
 */
export function claseEscenario(
  formato: Formato,
  diseno: Diseno,
  videoVertical: boolean,
  disenoV: DisenoVertical = 'mitades',
): string {
  if (formato === 'vertical')
    return `escenario formato-vertical vertical-${disenoV}${videoVertical ? ' video-es-vertical' : ''}`;
  return `escenario diseno-${diseno}`;
}

/**
 * Posiciones del Short 9:16. «protagonista» (9 nov 2026, Richard: «el protagonismo principal lo tiene el video que uno
 * está mostrando»): tu cámara pequeña arriba con los carteles al lado y el video grande ocupando el resto, sin más
 * letras. «mitades»: tu cámara grande arriba, el video abajo y el tema al pie.
 */
export type DisenoVertical = 'protagonista' | 'mitades';
export const DISENOS_VERTICALES: DisenoVertical[] = ['protagonista', 'mitades'];

/** Un video vertical (TikTok, Short) va de protagonista; uno horizontal, en mitades. */
export function disenoVerticalPara(videoVertical: boolean): DisenoVertical {
  return videoVertical ? 'protagonista' : 'mitades';
}

/**
 * Las posiciones del escenario (todas en 16:9): cámara cuadrada + video ancho, dos horizontales iguales, o cámara
 * ancha + video vertical (TikTok, Shorts).
 */
export type Diseno = 'clasico' | 'iguales' | 'vertical' | 'grande';
/** «grande» (9 nov 2026, Richard): el video vertical ocupa el escenario de arriba abajo, sin carteles encima. */
export const DISENOS: Diseno[] = ['clasico', 'iguales', 'vertical', 'grande'];

/** La posición que conviene para el video: vertical para TikTok y Shorts, la clásica para lo demás. */
export function disenoPara(vertical: boolean): Diseno {
  return vertical ? 'grande' : 'clasico';
}

/** Errores que significan «este video no se puede reproducir aquí». */
export function errorDeVideo(
  plataforma: Plataforma,
  codigo: number,
): 'no_insertable' | 'no_existe' | 'ocupado' | null {
  if (plataforma === 'youtube') return noInsertable(codigo) ? 'no_insertable' : null;
  if (codigo === 1001) return 'no_existe';
  if (codigo === 2001 || codigo === 2005) return 'ocupado';
  return null;
}

/** La página original del video, para abrirla cuando no se deja reproducir aquí (plan B). */
export function enlaceOriginal(v: { plataforma: Plataforma; id: string; creador?: string }): string {
  if (v.plataforma === 'archivo') return '';
  if (v.plataforma === 'youtube') return `https://www.youtube.com/watch?v=${v.id}`;
  return v.creador?.startsWith('@')
    ? `https://www.tiktok.com/${v.creador}/video/${v.id}`
    : `https://www.tiktok.com/player/v1/${v.id}`;
}

/**
 * TikTok muestra primero solo una portada: su reproductor de verdad (y sus mensajes) arranca recién cuando la persona
 * toca el video por dentro. Hasta ese toque, play/pausa desde afuera no hacen nada (comprobado el 9 nov 2026).
 */
export function pideToque(plataforma: Plataforma | undefined, listo: boolean): boolean {
  return plataforma === 'tiktok' && !listo;
}

/**
 * Volumen del video (0 a 100) → qué se le dice al reproductor y cuánto entra en la grabación.
 * YouTube deja cambiar su volumen desde afuera: se oye y se graba igual. TikTok solo deja silenciar: su volumen en la
 * grabación se ajusta en nuestro mezclador (lo que se oye en los parlantes no cambia).
 */
export function volumenDelVideo(
  plataforma: Plataforma,
  volumen: number,
): { ordenes: ('mute' | 'unMute' | { setVolume: number })[]; enGrabacion: number } {
  const v = Math.round(Math.min(100, Math.max(0, Number.isFinite(volumen) ? volumen : 100)));
  if (plataforma === 'youtube')
    return { ordenes: v === 0 ? ['mute'] : ['unMute', { setVolume: v }], enGrabacion: 1 };
  // Archivo: la página le baja el volumen al propio reproductor (se oye y se graba así).
  if (plataforma === 'archivo') return { ordenes: [], enGrabacion: 1 };
  return { ordenes: [v === 0 ? 'mute' : 'unMute'], enGrabacion: v / 100 };
}

/**
 * Medida FIJA del video del Estudio (lado largo 1920, números pares), según la forma del escenario. Nunca cambia
 * mientras se graba: si el lienzo cambiaba de medida a mitad (el escenario se movía o quedaba en parte fuera de la
 * pantalla), el MP4 no abría en la Mac ni en QuickTime (pasó el 9 nov 2026). Candado C-ESTUDIO-MEDIDA-FIJA.
 */
export function medidaGrabacionEstudio(anchoCss: number, altoCss: number): { ancho: number; alto: number } {
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const r = anchoCss > 0 && altoCss > 0 ? anchoCss / altoCss : 16 / 9;
  return r >= 1 ? { ancho: 1920, alto: par(1920 / r) } : { ancho: par(1920 * r), alto: 1920 };
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
