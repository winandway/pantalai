// Índice al principio del MP4 grabado (raíz para quien MIRA): Chrome graba el MP4 en fragmentos y sin índice,
// así que saltar a un minuto lejano tarda. Al terminar, el navegador ya tiene la grabación entera: la reordena
// SIN volver a codificar (misma imagen y mismo sonido, bit a bit), comprueba que la copia dura lo mismo y se
// puede reproducir, y recién entonces reemplaza el original en la nube. Sin segunda copia. CANDADO C-INDICE-MP4.
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  EncodedPacketSink,
  Input,
  Mp4OutputFormat,
  Output,
} from 'mediabunny';
import { pedir } from './api';
import { indiceAlPrincipio } from './cajasMp4';
import { Subidor, type ParteSubida } from './subida';

/** Más grande que esto no se reordena en memoria (el original se queda como está, que igual funciona). */
export const INDICE_MAX_BYTES = 1.5 * 1024 ** 3;
/** Diferencia de duración que se acepta entre el original y la copia (en segundos). */
export const TOLERANCIA_DURACION = 0.5;

export type ResultadoIndice = 'hecho' | 'ya_tenia' | 'omitido';

/** ¿Este archivo necesita que se le ponga el índice al principio? Solo MP4 sin él (o en fragmentos). */
export async function necesitaIndice(archivo: Blob): Promise<boolean> {
  if (!archivo.type.startsWith('video/mp4') || archivo.size === 0) return false;
  if (archivo.size > INDICE_MAX_BYTES) return false;
  const cabeza = new Uint8Array(await archivo.slice(0, 64 * 1024).arrayBuffer());
  return !indiceAlPrincipio(cabeza);
}

async function duracionDe(input: Input): Promise<number> {
  return input.computeDuration();
}

/** Reordena el MP4 con el índice al principio. Copia los paquetes tal cual: no hay pérdida ni re-codificación. */
export async function reordenar(origen: Blob): Promise<Blob> {
  const input = new Input({ source: new BlobSource(origen), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const conversion = await Conversion.init({ input, output, showWarnings: false });
  // Si alguna pista (por ejemplo el sonido) se quedara fuera, la copia no sirve: el original se queda.
  if (!conversion.isValid || conversion.discardedTracks.length)
    throw new Error('reordenar: pista descartada');
  await conversion.execute();
  if (!target.buffer) throw new Error('reordenar: vacío');
  return new Blob([target.buffer], { type: 'video/mp4' });
}

/**
 * La copia sirve solo si: trae el índice al principio, dura lo mismo que el original (±0,5 s), tiene imagen y su
 * primer cuadro se puede leer. Devuelve la duración de la copia; si algo no cuadra, lanza y el original se queda.
 */
export async function comprobarCopia(original: Blob, copia: Blob): Promise<number> {
  if (!indiceAlPrincipio(new Uint8Array(await copia.slice(0, 64 * 1024).arrayBuffer())))
    throw new Error('copia sin índice al principio');
  const a = new Input({ source: new BlobSource(original), formats: ALL_FORMATS });
  const b = new Input({ source: new BlobSource(copia), formats: ALL_FORMATS });
  const [da, db] = [await duracionDe(a), await duracionDe(b)];
  if (!(db > 0) || Math.abs(da - db) > TOLERANCIA_DURACION)
    throw new Error(`copia con otra duración (${da} contra ${db})`);
  const pista = await b.getPrimaryVideoTrack();
  if (!pista) throw new Error('copia sin imagen');
  const primero = await new EncodedPacketSink(pista).getFirstPacket();
  if (!primero || primero.byteLength === 0) throw new Error('copia sin cuadros');
  const audioA = (await a.getAudioTracks()).length;
  const audioB = (await b.getAudioTracks()).length;
  if (audioA !== audioB) throw new Error('copia sin el sonido');
  return db;
}

/** Sube la copia y le pide al servidor que reemplace el original (él vuelve a comprobar antes de hacerlo). */
export async function reemplazarOriginal(
  id: string,
  copia: Blob,
  duracion: number,
  llamar: typeof pedir = pedir,
): Promise<void> {
  const ini = await llamar<{ subida: string; parte_minima: number }>(`/datos/videos/${id}/indice`, {
    method: 'POST',
  });
  const subidor = new Subidor({
    videoId: id,
    parteMinima: ini.parte_minima,
    subirParte: async (videoId, n, datos) =>
      (
        await llamar<{ parte: ParteSubida }>(
          `/datos/videos/${videoId}/indice/partes/${n}?subida=${encodeURIComponent(ini.subida)}`,
          { method: 'PUT', body: datos, headers: { 'content-type': 'application/octet-stream' } },
        )
      ).parte,
  });
  const trozo = 5 * 1024 * 1024;
  for (let i = 0; i < copia.size; i += trozo)
    subidor.agregar(copia.slice(i, Math.min(copia.size, i + trozo)));
  const partes = await subidor.terminar();
  await llamar(`/datos/videos/${id}/indice/completar`, {
    method: 'POST',
    json: { subida: ini.subida, partes, duracion },
  });
}

/** Todo junto, en orden: ¿hace falta? → reordenar → comprobar → reemplazar. Nunca toca el original si algo falla. */
export async function ponerIndice(
  id: string,
  archivo: Blob,
  llamar: typeof pedir = pedir,
): Promise<ResultadoIndice> {
  if (!archivo.type.startsWith('video/mp4') || archivo.size > INDICE_MAX_BYTES) return 'omitido';
  if (!(await necesitaIndice(archivo))) return 'ya_tenia';
  const copia = await reordenar(archivo);
  const duracion = await comprobarCopia(archivo, copia);
  await reemplazarOriginal(id, copia, duracion, llamar);
  return 'hecho';
}

/** Para llamar sin esperar después de subir: si falla, queda en el registro de errores y el original sigue igual. */
export function ponerIndiceDeFondo(id: string, archivo: Blob): void {
  void ponerIndice(id, archivo).catch((e: unknown) => {
    console.error('indice', e);
    void pedir('/datos/errores', {
      method: 'POST',
      json: {
        donde: 'indice',
        mensaje: String(e instanceof Error ? e.message : e).slice(0, 500),
        video_id: id,
      },
    }).catch(() => undefined);
  });
}
