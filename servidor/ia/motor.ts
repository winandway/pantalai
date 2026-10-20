// Motor de IA de PANTALAI: el «oído» (Whisper en Cloudflare) y el «cerebro» (Gemini).
// Toda llamada pasa por la guardia de modelos y por el tope de gasto.
import { asegurarModelo, costoGemini, costoWhisper } from './guardia';

export type EnvIA = {
  DB: D1Database;
  CF_ACCOUNT_ID?: string;
  CF_AI_TOKEN?: string;
  GEMINI_API_KEY?: string;
  IA_TOPE_USD_MES?: string;
  IA_TOPE_MINUTOS_DIA?: string;
};

export type Palabra = [inicio: number, fin: number, texto: string];
export type Segmento = { inicio: number; fin: number; texto: string };

export const MODELO_OIDO = '@cf/openai/whisper-large-v3-turbo';
export const MODELO_CEREBRO = 'gemini-2.5-flash';

export function iaConfigurada(env: EnvIA): { oido: boolean; cerebro: boolean } {
  return { oido: Boolean(env.CF_ACCOUNT_ID && env.CF_AI_TOKEN), cerebro: Boolean(env.GEMINI_API_KEY) };
}

// ---------- tope de gasto ----------

export const hoy = (ahora = Date.now()) => new Date(ahora).toISOString().slice(0, 10);
export const mes = (ahora = Date.now()) => new Date(ahora).toISOString().slice(0, 7);

export async function gastoDelMes(db: D1Database, ahora = Date.now()) {
  const fila = await db
    .prepare(
      `SELECT COALESCE(SUM(usd),0) AS usd,
         COALESCE(SUM(CASE WHEN proveedor = 'cloudflare' AND dia = ? THEN unidades END),0) AS minutos_hoy,
         COALESCE(SUM(llamadas),0) AS llamadas
       FROM ia_gasto WHERE dia LIKE ?`,
    )
    .bind(hoy(ahora), `${mes(ahora)}%`)
    .first<{ usd: number; minutos_hoy: number; llamadas: number }>();
  return { usd: fila?.usd ?? 0, minutosHoy: fila?.minutos_hoy ?? 0, llamadas: fila?.llamadas ?? 0 };
}

export function topes(env: EnvIA) {
  const usd = Number(env.IA_TOPE_USD_MES ?? 10);
  const minutos = Number(env.IA_TOPE_MINUTOS_DIA ?? 200);
  return {
    usdMes: Number.isFinite(usd) && usd > 0 ? Math.min(usd, 10) : 10, // nunca más de 10 USD (lo aprobado por Richard)
    minutosDia: Number.isFinite(minutos) && minutos > 0 ? minutos : 200,
  };
}

/** Lanza 'tope' si ya no se puede gastar más. Se llama ANTES de cada llamada a un proveedor. */
export async function revisarTope(env: EnvIA, minutosNuevos = 0) {
  const g = await gastoDelMes(env.DB);
  const t = topes(env);
  if (g.usd >= t.usdMes) throw new ErrorIA('tope_mes');
  if (minutosNuevos && g.minutosHoy + minutosNuevos > t.minutosDia) throw new ErrorIA('tope_dia');
}

export async function anotarGasto(db: D1Database, proveedor: string, usd: number, unidades: number) {
  await db
    .prepare(
      `INSERT INTO ia_gasto (dia, proveedor, usd, unidades, llamadas) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (dia, proveedor) DO UPDATE SET usd = usd + excluded.usd, unidades = unidades + excluded.unidades,
         llamadas = llamadas + 1`,
    )
    .bind(hoy(), proveedor, usd, unidades)
    .run();
}

export class ErrorIA extends Error {
  constructor(public codigo: string) {
    super(codigo);
  }
}

// ---------- el oído ----------

/** Frase de arranque para que Whisper escriba las muletillas en vez de borrarlas (así se pueden quitar luego). */
const ARRANQUE: Record<string, string> = {
  en: 'Umm, let me think like, hmm... Okay, here is what I, uh, mean. Pantalay.',
  es: 'Eh, a ver, mmm... bueno, este, lo que quiero decir es, eh, esto. Pantalay.',
};

type RespuestaWhisper = {
  success?: boolean;
  errors?: { message: string }[];
  result?: {
    transcription_info?: { language?: string; duration?: number };
    segments?: {
      start: number;
      end: number;
      text: string;
      words?: { word: string; start: number; end: number }[];
    }[];
  };
};

export async function transcribir(
  env: EnvIA,
  wav: ArrayBuffer,
  desde: number,
  idioma: string | undefined,
  pedir: typeof fetch = fetch,
): Promise<{ palabras: Palabra[]; segmentos: Segmento[]; idioma: string; segundos: number }> {
  asegurarModelo(MODELO_OIDO);
  if (!env.CF_ACCOUNT_ID || !env.CF_AI_TOKEN) throw new ErrorIA('ia_apagada');
  const segundos = Math.max(1, (wav.byteLength - 44) / 32000); // WAV de 16 kHz, mono, 16 bits
  await revisarTope(env, segundos / 60);
  const r = await pedir(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/${MODELO_OIDO}`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CF_AI_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        audio: aBase64(wav),
        task: 'transcribe',
        ...(idioma ? { language: idioma } : {}),
        initial_prompt: ARRANQUE[idioma ?? 'en'] ?? ARRANQUE.en,
        vad_filter: true,
        condition_on_previous_text: false,
      }),
    },
  );
  const datos = (await r.json().catch(() => ({}))) as RespuestaWhisper;
  if (!r.ok || !datos.result) {
    console.error('whisper falló', r.status, JSON.stringify(datos.errors ?? datos).slice(0, 300));
    throw new ErrorIA(r.status === 429 ? 'proveedor_ocupado' : 'proveedor');
  }
  await anotarGasto(env.DB, 'cloudflare', costoWhisper(segundos), segundos / 60);
  const redondo = (n: number) => Math.round((n + desde) * 100) / 100;
  const segmentos: Segmento[] = [];
  const palabras: Palabra[] = [];
  for (const s of datos.result.segments ?? []) {
    const texto = s.text.trim();
    if (texto) segmentos.push({ inicio: redondo(s.start), fin: redondo(s.end), texto });
    for (const w of s.words ?? []) palabras.push([redondo(w.start), redondo(w.end), w.word.trim()]);
  }
  const frases = palabras.length ? frasesDesdePalabras(palabras) : segmentos;
  return {
    palabras,
    segmentos: frases,
    idioma: datos.result.transcription_info?.language ?? idioma ?? '',
    segundos,
  };
}

/** Arma frases cortas a partir de las palabras: corta en el punto, en una pausa o a las 14 palabras. Mejores subtítulos. */
export function frasesDesdePalabras(palabras: Palabra[]): Segmento[] {
  const salida: Segmento[] = [];
  let actual: Palabra[] = [];
  const cerrar = () => {
    if (!actual.length) return;
    salida.push({
      inicio: actual[0]![0],
      fin: actual[actual.length - 1]![1],
      texto: actual
        .map((p) => p[2])
        .join(' ')
        .trim(),
    });
    actual = [];
  };
  for (let i = 0; i < palabras.length; i++) {
    const p = palabras[i]!;
    const siguiente = palabras[i + 1];
    actual.push(p);
    const fin = /[.!?…]$/.test(p[2]);
    const pausa = siguiente ? siguiente[0] - p[1] > 1 : true;
    if (fin || pausa || actual.length >= 14) cerrar();
  }
  cerrar();
  return salida;
}

function aBase64(datos: ArrayBuffer): string {
  const bytes = new Uint8Array(datos);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

// ---------- muletillas (sin IA de pago: lista cerrada de sonidos que nunca son palabras de verdad) ----------

const MULETILLAS = new Set([
  'um',
  'umm',
  'uh',
  'uhh',
  'er',
  'erm',
  'ah',
  'hmm',
  'mm',
  'mmm',
  'eh',
  'ehh',
  'em',
  'emm',
  'ehm',
]);

export function muletillas(palabras: Palabra[]): { inicio: number; fin: number; palabra: string }[] {
  return palabras
    .filter(([, , p]) => MULETILLAS.has(p.toLowerCase().replace(/[^\p{L}]/gu, '')))
    .map(([inicio, fin, palabra]) => ({
      inicio: Math.max(0, inicio - 0.05),
      fin: fin + 0.05,
      palabra: palabra.replace(/[,.…]/g, ''),
    }));
}

// ---------- el cerebro ----------

type RespuestaGemini = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { message?: string };
};

async function preguntarGemini(
  env: EnvIA,
  prompt: string,
  esquema: object,
  pedir: typeof fetch,
): Promise<unknown> {
  asegurarModelo(MODELO_CEREBRO);
  if (!env.GEMINI_API_KEY) throw new ErrorIA('ia_apagada');
  await revisarTope(env);
  const r = await pedir(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_CEREBRO}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: esquema,
          temperature: 0.3,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 }, // sin «pensar»: más barato y suficiente para resumir
        },
      }),
    },
  );
  const datos = (await r.json().catch(() => ({}))) as RespuestaGemini;
  const u = datos.usageMetadata;
  if (u) {
    const salida = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    await anotarGasto(env.DB, 'google', costoGemini(MODELO_CEREBRO, u.promptTokenCount ?? 0, salida), salida);
  }
  if (!r.ok) {
    console.error('gemini falló', r.status, datos.error?.message?.slice(0, 300));
    throw new ErrorIA(r.status === 429 ? 'proveedor_ocupado' : 'proveedor');
  }
  const texto = datos.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(texto);
  } catch {
    console.error('gemini devolvió algo que no es JSON', texto.slice(0, 200));
    throw new ErrorIA('proveedor');
  }
}

export function textoConMinutos(segmentos: Segmento[]): string {
  return segmentos.map((s) => `[${Math.floor(s.inicio)}s] ${s.texto}`).join('\n');
}

const NOMBRE_IDIOMA: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
};

export type Analisis = {
  titulo: string;
  resumen: string;
  capitulos: { segundo: number; titulo: string }[];
  tareas: string[];
};

export async function analizar(
  env: EnvIA,
  segmentos: Segmento[],
  idioma: string,
  duracion: number,
  pedir: typeof fetch = fetch,
): Promise<Analisis> {
  const lengua = NOMBRE_IDIOMA[idioma.slice(0, 2)] ?? 'the same language as the transcript';
  const prompt = [
    'You receive the transcript of a screen recording. Each line starts with the second where it is said.',
    `Write everything in ${lengua}. Never invent facts that are not in the transcript.`,
    '- titulo: a clear, specific title of at most 8 words, no quotes, no emojis. Sentence case: capitalize only the first word and proper names (never Title Case).',
    '- resumen: 2 to 4 sentences describing what the video shows and explains, written for the viewer.',
    `- capitulos: only if the video is longer than 60 seconds; 3 to 8 chapters, the first at second 0, each with the second where it starts (integer, below ${Math.floor(duracion)}) and a short title in sentence case. Empty list otherwise.`,
    '- tareas: pending work that someone still has to do AFTER this video: things to fix, change, add, review or follow up on (for example "we need to fix…", "remember to…", "someone should…", "two things to fix: …"). Write each one as a short imperative sentence. Do NOT include the steps of the process being demonstrated or instructions to the viewer on how to use something; those are not tasks. Empty list if nothing is pending.',
    '',
    'TRANSCRIPT:',
    textoConMinutos(segmentos).slice(0, 120_000),
  ].join('\n');
  const esquema = {
    type: 'OBJECT',
    properties: {
      titulo: { type: 'STRING' },
      resumen: { type: 'STRING' },
      capitulos: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { segundo: { type: 'INTEGER' }, titulo: { type: 'STRING' } },
          required: ['segundo', 'titulo'],
        },
      },
      tareas: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['titulo', 'resumen', 'capitulos', 'tareas'],
  };
  const r = (await preguntarGemini(env, prompt, esquema, pedir)) as Partial<Analisis>;
  const capitulos = (r.capitulos ?? [])
    .filter((c) => Number.isFinite(c.segundo) && c.segundo >= 0 && c.segundo < duracion && c.titulo?.trim())
    .map((c) => ({ segundo: Math.floor(c.segundo), titulo: c.titulo.trim().slice(0, 120) }))
    .sort((a, b) => a.segundo - b.segundo);
  if (capitulos.length && capitulos[0]!.segundo !== 0) capitulos[0]!.segundo = 0;
  return {
    titulo: (r.titulo ?? '')
      .trim()
      .replace(/^["“]|["”]$/g, '')
      .slice(0, 200),
    resumen: (r.resumen ?? '').trim().slice(0, 5000),
    capitulos: capitulos.length >= 2 ? capitulos.slice(0, 20) : [],
    tareas: (r.tareas ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 30),
  };
}

// ---------- «Generar»: documentos a partir del video ----------

export const PLANTILLAS = {
  procedimiento: 'a step-by-step standard operating procedure (SOP) for a teammate',
  guia: 'a friendly step-by-step guide for a customer',
  error: 'a bug report: summary, steps to reproduce, expected result, actual result, and notes',
  cambio: 'a pull request description: what changed, why, how to test',
  pruebas: 'QA test steps with the expected result of each step',
  mensaje: 'a short message to share this video by email or chat, with the 3 key points',
} as const;
export type Plantilla = keyof typeof PLANTILLAS;

export type Documento = {
  titulo: string;
  introduccion: string;
  pasos: { segundo: number; texto: string }[];
  cierre: string;
};

export async function generar(
  env: EnvIA,
  segmentos: Segmento[],
  idioma: string,
  plantilla: Plantilla,
  pedir: typeof fetch = fetch,
): Promise<Documento> {
  const lengua = NOMBRE_IDIOMA[idioma.slice(0, 2)] ?? 'the same language as the transcript';
  const prompt = [
    `From this screen-recording transcript, write ${PLANTILLAS[plantilla]}.`,
    `Write in ${lengua}. Use only what is said in the transcript; never invent steps, names or numbers.`,
    'Each step must include the second of the video where it is shown (integer). Keep steps short and in order.',
    '',
    'TRANSCRIPT:',
    textoConMinutos(segmentos).slice(0, 120_000),
  ].join('\n');
  const esquema = {
    type: 'OBJECT',
    properties: {
      titulo: { type: 'STRING' },
      introduccion: { type: 'STRING' },
      pasos: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { segundo: { type: 'INTEGER' }, texto: { type: 'STRING' } },
          required: ['segundo', 'texto'],
        },
      },
      cierre: { type: 'STRING' },
    },
    required: ['titulo', 'introduccion', 'pasos', 'cierre'],
  };
  const r = (await preguntarGemini(env, prompt, esquema, pedir)) as Partial<Documento>;
  return {
    titulo: (r.titulo ?? '').trim().slice(0, 200),
    introduccion: (r.introduccion ?? '').trim().slice(0, 3000),
    pasos: (r.pasos ?? [])
      .filter((p) => p.texto?.trim())
      .map((p) => ({
        segundo: Math.max(0, Math.floor(p.segundo || 0)),
        texto: p.texto.trim().slice(0, 1000),
      }))
      .slice(0, 40),
    cierre: (r.cierre ?? '').trim().slice(0, 2000),
  };
}
