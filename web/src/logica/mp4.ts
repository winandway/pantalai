// Copia MP4 del video, hecha en el navegador del dueño (H.264 + AAC, el formato que abren iPhone, Final Cut y YouTube).
// Usa el codificador del propio equipo (WebCodecs): rápido y sin costo. El original WebM no se toca.
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import { pedir } from './api';
import { unirTramos, type Tramo } from './tiempo';
import { Subidor, type ParteSubida } from './subida';

export async function puedeConvertir(): Promise<boolean> {
  try {
    return (
      typeof VideoEncoder !== 'undefined' && (await canEncodeVideo('avc')) && (await canEncodeAudio('aac'))
    );
  } catch {
    return false;
  }
}

export type Recorte = { inicio: number; fin: number };

/** Opciones de recorte para el convertidor: nada si no hay puntas cortadas. 0 en «fin» = hasta el final. */
export function opcionesRecorte(r?: Recorte): { start?: number; end?: number } | undefined {
  if (!r || (r.inicio <= 0 && r.fin <= 0)) return undefined;
  return { start: r.inicio > 0 ? r.inicio : undefined, end: r.fin > 0 ? r.fin : undefined };
}

/**
 * Lo que NO sale en el MP4 cuando hay cortes del medio: las puntas más los cortes, unidos y en orden.
 * Sin cortes del medio devuelve [] (las puntas solas van por el `trim` de siempre, que ya está probado).
 * «duracion» 0 = no se sabe: la punta del final llega hasta el infinito.
 */
export function tramosParaMp4(recorte: Recorte, cortes: Tramo[], duracion: number): Tramo[] {
  const validos = cortes.filter((t) => t.fin > t.inicio);
  if (!validos.length) return [];
  const t: Tramo[] = [...validos];
  if (recorte.inicio > 0) t.push({ inicio: 0, fin: recorte.inicio });
  if (recorte.fin > 0 && (duracion <= 0 || recorte.fin < duracion))
    t.push({ inicio: recorte.fin, fin: duracion > 0 ? duracion + 1 : Infinity });
  return unirTramos(t);
}

/**
 * En qué segundo del MP4 sale el instante «t» del original: corrido hacia atrás por todo lo cortado antes.
 * null = ese instante cae en un tramo cortado y no sale.
 */
export function tiempoEnSalida(t: number, ocultos: Tramo[]): number | null {
  let quitado = 0;
  for (const o of ocultos) {
    if (t >= o.inicio && t < o.fin) return null;
    if (o.fin <= t) quitado += o.fin - o.inicio;
  }
  return Math.round((t - quitado) * 1e6) / 1e6;
}

/** Segundo del MP4 para cualquier instante del original, aunque caiga en un corte (queda pegado al borde). */
function aSalida(x: number, ocultos: Tramo[]): number {
  let quitado = 0;
  for (const o of ocultos) quitado += Math.max(0, Math.min(o.fin, x) - o.inicio);
  return x - quitado;
}

/**
 * Dónde y cuánto sale un CUADRO de video que dura de «inicio» a «fin» en el original. Un cuadro de pantalla quieta
 * puede durar segundos y cruzar un corte: se queda con lo que se ve fuera de los cortes, empezando en el primer
 * instante visible. null = el cuadro entero cae en cortes.
 */
export function cuadroEnSalida(
  inicio: number,
  fin: number,
  ocultos: Tramo[],
): { inicio: number; duracion: number } | null {
  let p = inicio;
  for (const o of ocultos) if (p >= o.inicio && p < o.fin) p = o.fin;
  if (p >= fin) return null;
  const a = aSalida(p, ocultos);
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return { inicio: r(a), duracion: r(Math.max(0, aSalida(fin, ocultos) - a)) };
}

type Muestra = { timestamp: number; duration: number; setTimestamp(n: number): void; close(): void };

/** Cuadro de video: se coloca por su primer instante visible y se acorta si cruza un corte. */
function correrCuadro<M extends Muestra & { setDuration(n: number): void }>(
  m: M,
  ocultos: Tramo[],
): M | null {
  const c = cuadroEnSalida(m.timestamp, m.timestamp + Math.max(m.duration, 0), ocultos);
  if (!c) {
    m.close();
    return null;
  }
  m.setTimestamp(c.inicio);
  if (c.duracion > 0) m.setDuration(c.duracion);
  return m;
}

/** Pedazo de audio (unos 20 ms): sale o no según dónde cae su centro, corrido por lo cortado antes. */
function correrAudio<M extends Muestra>(m: M, ocultos: Tramo[]): M | null {
  const nuevo = tiempoEnSalida(m.timestamp + m.duration / 2, ocultos);
  if (nuevo === null) {
    m.close();
    return null;
  }
  m.setTimestamp(Math.max(0, nuevo - m.duration / 2));
  return m;
}

export async function aMp4(
  origen: Blob,
  progreso?: (p: number) => void,
  recorte?: Recorte,
  cortes: Tramo[] = [],
): Promise<Blob> {
  const input = new Input({ source: new BlobSource(origen), formats: ALL_FORMATS });
  const duracion = cortes.length ? await input.computeDuration().catch(() => 0) : 0;
  const ocultos = tramosParaMp4(recorte ?? { inicio: 0, fin: 0 }, cortes, duracion);
  const target = new BufferTarget();
  // fastStart «in-memory»: el índice va al principio, así el video arranca al instante y los editores lo abren sin problema.
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const conversion = await Conversion.init({
    input,
    output,
    // Con cortes del medio cada cuadro y cada pedazo de audio pasa por «correrCuadro» o «correrAudio»: lo cortado se descarta y lo
    // que sigue se corre hacia atrás, sin huecos. Hay que re-codificar siempre (si no, «process» no se llama).
    video: ocultos.length
      ? {
          codec: 'avc',
          bitrate: QUALITY_HIGH,
          forceTranscode: true,
          process: (m) => correrCuadro(m, ocultos),
        }
      : { codec: 'avc', bitrate: QUALITY_HIGH },
    audio: ocultos.length
      ? { codec: 'aac', bitrate: 160_000, forceTranscode: true, process: (m) => correrAudio(m, ocultos) }
      : { codec: 'aac', bitrate: 160_000 },
    // Las puntas cortadas en el editor no salen en el MP4 (es el que se descarga). Con cortes del medio las puntas
    // ya van dentro de «ocultos».
    trim: ocultos.length ? undefined : opcionesRecorte(recorte),
    showWarnings: false,
  });
  if (!conversion.isValid) throw new Error('conversión no válida');
  if (progreso) conversion.onProgress = (p) => progreso(p);
  await conversion.execute();
  if (!target.buffer) throw new Error('conversión vacía');
  return new Blob([target.buffer], { type: 'video/mp4' });
}

type Inicio = {
  ya: boolean;
  parte_minima?: number;
  recorte_inicio?: number;
  recorte_fin?: number;
  cortes?: Tramo[];
};

/** Sube la copia MP4 por partes, con los mismos reintentos que el video original. */
export async function subirMp4(
  id: string,
  mp4: Blob,
  inicio: Inicio,
  llamar: typeof pedir = pedir,
): Promise<void> {
  const subidor = new Subidor({
    videoId: id,
    parteMinima: inicio.parte_minima ?? 5 * 1024 * 1024,
    subirParte: async (videoId, n, datos) =>
      (
        await llamar<{ parte: ParteSubida }>(`/datos/videos/${videoId}/mp4/partes/${n}`, {
          method: 'PUT',
          body: datos,
          headers: { 'content-type': 'application/octet-stream' },
        })
      ).parte,
  });
  const trozo = 5 * 1024 * 1024;
  for (let i = 0; i < mp4.size; i += trozo) subidor.agregar(mp4.slice(i, Math.min(mp4.size, i + trozo)));
  const partes = await subidor.terminar();
  await llamar(`/datos/videos/${id}/mp4/completar`, { method: 'POST', json: { partes } });
}

/** Pide permiso al servidor (que dice con qué recorte y qué cortes del medio), descarga el original, lo convierte y sube la copia. */
export async function prepararMp4(
  id: string,
  progreso: (p: number) => void,
  llamar: typeof pedir = pedir,
): Promise<void> {
  const inicio = await llamar<Inicio>(`/datos/videos/${id}/mp4`, { method: 'POST' });
  if (inicio.ya) return progreso(1);
  const origen = await (
    await fetch(`/media/${id}/video?formato=webm`, { credentials: 'same-origin' })
  ).blob();
  const recorte = { inicio: inicio.recorte_inicio ?? 0, fin: inicio.recorte_fin ?? 0 };
  const mp4 = await aMp4(origen, (p) => progreso(p * 0.9), recorte, inicio.cortes ?? []);
  await subirMp4(id, mp4, inicio, llamar);
  progreso(1);
}
