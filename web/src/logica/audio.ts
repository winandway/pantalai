// Saca el audio del video en el navegador y lo parte en pedazos de 2 minutos (WAV 16 kHz, mono):
// es lo que el «oído» (Whisper) escucha. Así no se sube el video otra vez ni se paga por la imagen.

export const SEGUNDOS_POR_PEDAZO = 120;
const TASA = 16000;

/** WAV PCM de 16 bits a partir de muestras entre -1 y 1. */
export function aWav(muestras: Float32Array, tasa = TASA): ArrayBuffer {
  const datos = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(datos);
  const texto = (o: number, t: string) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  texto(0, 'RIFF');
  v.setUint32(4, 36 + muestras.length * 2, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, tasa, true);
  v.setUint32(28, tasa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, 'data');
  v.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) {
    const m = Math.max(-1, Math.min(1, muestras[i]!));
    v.setInt16(44 + i * 2, m < 0 ? m * 0x8000 : m * 0x7fff, true);
  }
  return datos;
}

/** Parte las muestras en pedazos con su segundo de inicio. */
export function partir(
  muestras: Float32Array,
  tasa = TASA,
  segundos = SEGUNDOS_POR_PEDAZO,
): { desde: number; wav: ArrayBuffer }[] {
  const paso = tasa * segundos;
  const salida: { desde: number; wav: ArrayBuffer }[] = [];
  for (let i = 0; i < muestras.length; i += paso) {
    salida.push({
      desde: i / tasa,
      wav: aWav(muestras.subarray(i, Math.min(muestras.length, i + paso)), tasa),
    });
  }
  return salida;
}

/** Descarga el video, decodifica el audio y lo pasa a 16 kHz mono. */
export async function audioDelVideo(url: string): Promise<Float32Array> {
  const datos = await (await fetch(url, { credentials: 'same-origin' })).arrayBuffer();
  const ctx = new AudioContext();
  try {
    const original = await ctx.decodeAudioData(datos);
    const fuera = new OfflineAudioContext(1, Math.ceil(original.duration * TASA), TASA);
    const fuente = fuera.createBufferSource();
    fuente.buffer = original;
    fuente.connect(fuera.destination);
    fuente.start();
    return (await fuera.startRendering()).getChannelData(0);
  } finally {
    void ctx.close();
  }
}
