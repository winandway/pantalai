// Flujo de IA desde el navegador del dueño: audio en pedazos → oído (Whisper) → cerebro (Gemini).
import { pedir } from './api';
import { audioDelVideo, partir } from './audio';

export type EstadoIA = {
  oido: boolean;
  cerebro: boolean;
  estado: 'pendiente' | 'transcribiendo' | 'transcrito' | 'listo' | 'error';
  error: string;
  tareas: string[];
  muletillas: { inicio: number; fin: number; palabra: string }[];
  palabras: number;
};

export type Documento = {
  titulo: string;
  introduccion: string;
  pasos: { segundo: number; texto: string }[];
  cierre: string;
};

export const PLANTILLAS = ['procedimiento', 'guia', 'error', 'cambio', 'pruebas', 'mensaje'] as const;
export type Plantilla = (typeof PLANTILLAS)[number];

export async function leerIA(id: string): Promise<EstadoIA> {
  return (await pedir<{ ia: EstadoIA }>(`/datos/videos/${id}/ia`)).ia;
}

export type Fase = { fase: 'audio' | 'oido' | 'cerebro'; avance: number };

export async function procesar(
  id: string,
  idioma: 'en' | 'es' | undefined,
  avisar: (f: Fase) => void,
  dependencias: { audio?: typeof audioDelVideo; llamar?: typeof pedir; cerebro?: boolean } = {},
): Promise<void> {
  const sacar = dependencias.audio ?? audioDelVideo;
  const llamar = dependencias.llamar ?? pedir;
  avisar({ fase: 'audio', avance: 0 });
  const pedazos = partir(await sacar(`/media/${id}/video`));
  let detectado: string | undefined = idioma;
  for (let i = 0; i < pedazos.length; i++) {
    avisar({ fase: 'oido', avance: i / pedazos.length });
    const p = pedazos[i]!;
    const q = new URLSearchParams({ desde: String(p.desde) });
    if (i === 0) q.set('primero', '1');
    if (i === pedazos.length - 1) q.set('ultimo', '1');
    if (detectado) q.set('idioma', detectado);
    const r = await llamar<{ idioma: string; palabras: number }>(`/datos/videos/${id}/ia/transcribir?${q}`, {
      method: 'POST',
      body: new Blob([p.wav], { type: 'audio/wav' }),
      headers: { 'content-type': 'audio/wav' },
    });
    detectado = detectado ?? (r.idioma ? r.idioma.slice(0, 2) : undefined);
  }
  // Sin la llave del cerebro, el oído trabaja solo: transcripción precisa y muletillas.
  if (dependencias.cerebro === false) return;
  avisar({ fase: 'cerebro', avance: 1 });
  try {
    await llamar(`/datos/videos/${id}/ia/analizar`, { method: 'POST' });
  } catch (e) {
    // Un video sin voz no tiene nada que resumir: no es un error.
    if ((e as { codigo?: string }).codigo !== 'sin_transcripcion') throw e;
  }
}

export async function generar(id: string, plantilla: Plantilla): Promise<Documento> {
  return (
    await pedir<{ documento: Documento }>(`/datos/videos/${id}/ia/generar`, {
      method: 'POST',
      json: { plantilla },
    })
  ).documento;
}

export function documentoATexto(d: Documento, minuto: (s: number) => string): string {
  return [
    d.titulo,
    '',
    d.introduccion,
    '',
    ...d.pasos.map((p, i) => `${i + 1}. ${p.texto} (${minuto(p.segundo)})`),
    '',
    d.cierre,
  ]
    .join('\n')
    .trim();
}

/** Segundos que ahorra quitar las muletillas. */
export function ahorro(m: EstadoIA['muletillas']): number {
  return Math.round(m.reduce((a, x) => a + (x.fin - x.inicio), 0));
}
