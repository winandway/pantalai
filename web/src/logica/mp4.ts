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

export async function aMp4(origen: Blob, progreso?: (p: number) => void, recorte?: Recorte): Promise<Blob> {
  const input = new Input({ source: new BlobSource(origen), formats: ALL_FORMATS });
  const target = new BufferTarget();
  // fastStart «in-memory»: el índice va al principio, así el video arranca al instante y los editores lo abren sin problema.
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const conversion = await Conversion.init({
    input,
    output,
    video: { codec: 'avc', bitrate: QUALITY_HIGH },
    audio: { codec: 'aac', bitrate: 160_000 },
    // Las puntas cortadas en el editor no salen en el MP4 (es el que se descarga).
    trim: opcionesRecorte(recorte),
    showWarnings: false,
  });
  if (!conversion.isValid) throw new Error('conversión no válida');
  if (progreso) conversion.onProgress = (p) => progreso(p);
  await conversion.execute();
  if (!target.buffer) throw new Error('conversión vacía');
  return new Blob([target.buffer], { type: 'video/mp4' });
}

type Inicio = { ya: boolean; parte_minima?: number; recorte_inicio?: number; recorte_fin?: number };

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

/** Pide permiso al servidor (que dice con qué recorte), descarga el original, lo convierte y sube la copia. */
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
  const mp4 = await aMp4(origen, (p) => progreso(p * 0.9), recorte);
  await subirMp4(id, mp4, inicio, llamar);
  progreso(1);
}
