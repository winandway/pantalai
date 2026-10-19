import { beforeEach, describe, expect, it, vi } from 'vitest';
import app, { PARTE_MIN } from '../servidor/app';
import { asegurarModelo, costoGemini, costoWhisper } from '../servidor/ia/guardia';
import { ErrorIA, analizar, anotarGasto, muletillas, topes, transcribir } from '../servidor/ia/motor';
import { aWav, partir } from '../web/src/logica/audio';
import { procesar } from '../web/src/logica/ia';
import { almacenFalso, baseFalsa } from './falsos';

const respuestaWhisper = (desplazar = 0) => ({
  success: true,
  result: {
    transcription_info: { language: 'es', duration: 10 },
    segments: [
      {
        start: 0 + desplazar,
        end: 3 + desplazar,
        text: ' Hola, eh, equipo.',
        words: [
          { word: 'Hola,', start: 0.2, end: 0.6 },
          { word: 'eh,', start: 0.7, end: 1.0 },
          { word: 'equipo.', start: 1.1, end: 1.6 },
        ],
      },
    ],
  },
});

const respuestaGemini = (json: object) => ({
  candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }],
  usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 500, thoughtsTokenCount: 0 },
});

function proveedorFalso(
  gemini: object = {
    titulo: 'Alta de clientes',
    resumen: 'Se explica el alta.',
    capitulos: [
      { segundo: 5, titulo: 'Inicio' },
      { segundo: 70, titulo: 'Datos' },
    ],
    tareas: ['Revisar el teléfono'],
  },
) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('api.cloudflare.com')) return Response.json(respuestaWhisper());
    if (u.includes('generativelanguage.googleapis.com')) {
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('clave-gemini');
      expect(u).not.toContain('key=');
      const cuerpo = JSON.parse(String(init?.body));
      expect(cuerpo.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
      return Response.json(respuestaGemini(gemini));
    }
    throw new Error(`llamada inesperada a ${u}`);
  });
}

let db: D1Database;
const envIA = () => ({
  DB: db,
  CF_ACCOUNT_ID: 'cuenta',
  CF_AI_TOKEN: 'token-cf',
  GEMINI_API_KEY: 'clave-gemini',
});
const wav = (segundos: number) => aWav(new Float32Array(16000 * segundos));

beforeEach(() => {
  db = baseFalsa();
  vi.unstubAllGlobals();
});

describe('CANDADO guardia de modelos', () => {
  it('solo deja pasar Whisper Turbo y Gemini 2.5 Flash / Flash-Lite', () => {
    expect(() => asegurarModelo('@cf/openai/whisper-large-v3-turbo')).not.toThrow();
    expect(() => asegurarModelo('gemini-2.5-flash')).not.toThrow();
    for (const caro of ['gemini-2.5-pro', 'gpt-4o', 'imagen-4', 'gemini-3.8-flash', '@cf/openai/whisper']) {
      expect(() => asegurarModelo(caro)).toThrow(/bloqueado/);
    }
  });

  it('calcula el costo con los precios aprobados', () => {
    expect(costoWhisper(600)).toBeCloseTo(0.00513, 5);
    expect(costoGemini('gemini-2.5-flash', 1_000_000, 1_000_000)).toBeCloseTo(2.8, 5);
  });

  it('el tope mensual nunca pasa de 10 dólares aunque se configure más', () => {
    expect(topes({ DB: db, IA_TOPE_USD_MES: '50' }).usdMes).toBe(10);
    expect(topes({ DB: db, IA_TOPE_USD_MES: '3' }).usdMes).toBe(3);
    expect(topes({ DB: db }).minutosDia).toBe(200);
  });
});

describe('CANDADO tope de gasto', () => {
  it('con el mes gastado no se llama a nadie', async () => {
    await anotarGasto(db, 'google', 10, 1);
    const f = proveedorFalso();
    await expect(transcribir(envIA(), wav(10), 0, 'es', f as unknown as typeof fetch)).rejects.toMatchObject({
      codigo: 'tope_mes',
    });
    await expect(
      analizar(envIA(), [{ inicio: 0, fin: 1, texto: 'hola' }], 'es', 60, f as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(ErrorIA);
    expect(f).not.toHaveBeenCalled();
  });

  it('respeta el límite de minutos por día', async () => {
    const f = proveedorFalso();
    const env = { ...envIA(), IA_TOPE_MINUTOS_DIA: '1' };
    await expect(transcribir(env, wav(90), 0, 'es', f as unknown as typeof fetch)).rejects.toMatchObject({
      codigo: 'tope_dia',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('sin llaves la IA está apagada', async () => {
    await expect(transcribir({ DB: db }, wav(2), 0, 'es')).rejects.toMatchObject({ codigo: 'ia_apagada' });
  });
});

describe('el oído', () => {
  it('manda el audio a Cloudflare, corre los tiempos y anota el gasto', async () => {
    const f = proveedorFalso();
    const r = await transcribir(envIA(), wav(10), 120, 'es', f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe(
      'https://api.cloudflare.com/client/v4/accounts/cuenta/ai/run/@cf/openai/whisper-large-v3-turbo',
    );
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token-cf');
    expect(JSON.parse(String(init?.body)).initial_prompt).toContain('mmm');
    expect(r.palabras[0]).toEqual([120.2, 120.6, 'Hola,']);
    expect(r.segmentos[0]).toEqual({ inicio: 120, fin: 123, texto: 'Hola, eh, equipo.' });
    const gasto = await db.prepare('SELECT * FROM ia_gasto').first<{ proveedor: string; llamadas: number }>();
    expect(gasto).toMatchObject({ proveedor: 'cloudflare', llamadas: 1 });
  });

  it('encuentra las muletillas sin tocar palabras de verdad', () => {
    const m = muletillas([
      [0, 0.5, 'Bueno,'],
      [0.6, 0.9, 'eh,'],
      [1, 1.2, 'Umm'],
      [1.3, 1.8, 'este'],
    ]);
    expect(m.map((x) => x.palabra)).toEqual(['eh', 'Umm']);
    expect(m[0]!.inicio).toBeCloseTo(0.55);
  });
});

describe('el cerebro', () => {
  it('devuelve título, resumen, capítulos que arrancan en cero y tareas', async () => {
    const f = proveedorFalso();
    const a = await analizar(
      envIA(),
      [{ inicio: 0, fin: 3, texto: 'Hola equipo' }],
      'es',
      120,
      f as unknown as typeof fetch,
    );
    expect(a.titulo).toBe('Alta de clientes');
    expect(a.capitulos[0]!.segundo).toBe(0);
    expect(a.tareas).toEqual(['Revisar el teléfono']);
    const prompt = JSON.parse(String(f.mock.calls[0]![1]?.body)).contents[0].parts[0].text as string;
    expect(prompt).toContain('Spanish');
    expect(prompt).toContain('[0s] Hola equipo');
  });

  it('descarta capítulos fuera del video', async () => {
    const f = proveedorFalso({
      titulo: 'T',
      resumen: 'R',
      capitulos: [
        { segundo: 0, titulo: 'A' },
        { segundo: 999, titulo: 'B' },
      ],
      tareas: [],
    });
    const a = await analizar(
      envIA(),
      [{ inicio: 0, fin: 3, texto: 'x' }],
      'en',
      120,
      f as unknown as typeof fetch,
    );
    expect(a.capitulos).toEqual([]);
  });
});

describe('rutas de IA de punta a punta (con proveedores simulados)', () => {
  it('transcribe por pedazos, reemplaza la transcripción y no pisa un título cambiado', async () => {
    const env = { ...envIA(), BUCKET: almacenFalso() };
    let cookie = '';
    const pedir = async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
      const h = new Headers(init.headers);
      if (cookie) h.set('cookie', cookie);
      if (init.method && init.method !== 'GET') h.set('x-pantalai', '1');
      if (init.json !== undefined) h.set('content-type', 'application/json');
      const r = await app.request(
        `https://p.test${ruta}`,
        { ...init, headers: h, body: init.json !== undefined ? JSON.stringify(init.json) : init.body },
        env,
      );
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0]!;
      return r;
    };
    vi.stubGlobal('fetch', proveedorFalso());
    await pedir('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    const { id } = (await (
      await pedir('/datos/videos', { method: 'POST', json: { idioma: 'es' } })
    ).json()) as { id: string };
    const p1 = (
      (await (
        await pedir(`/datos/videos/${id}/partes/1`, { method: 'PUT', body: new Uint8Array(PARTE_MIN) })
      ).json()) as { parte: object }
    ).parte;
    await pedir(`/datos/videos/${id}/completar`, { method: 'POST', json: { partes: [p1], duracion: 200 } });

    // Sin dueño no se puede.
    const ajeno = await app.request(
      `https://p.test/datos/videos/${id}/ia/transcribir?primero=1`,
      { method: 'POST', headers: { 'x-pantalai': '1' }, body: wav(2) },
      env,
    );
    expect(ajeno.status).toBe(401);

    expect(
      (await pedir(`/datos/videos/${id}/ia/transcribir?desde=0&primero=1`, { method: 'POST', body: wav(5) }))
        .status,
    ).toBe(200);
    // La persona cambia el título mientras la IA trabaja: no se pisa.
    await pedir(`/datos/videos/${id}`, { method: 'PATCH', json: { titulo: 'Mi título' } });
    expect(
      (await pedir(`/datos/videos/${id}/ia/transcribir?desde=120&ultimo=1`, { method: 'POST', body: wav(5) }))
        .status,
    ).toBe(200);
    expect((await pedir(`/datos/videos/${id}/ia/analizar`, { method: 'POST' })).status).toBe(200);

    const v = (
      (await (await pedir(`/datos/videos/${id}`)).json()) as {
        video: {
          titulo: string;
          descripcion: string;
          capitulos: unknown[];
          transcripcion: { inicio: number }[];
        };
      }
    ).video;
    expect(v.titulo).toBe('Mi título');
    expect(v.descripcion).toBe('Se explica el alta.');
    expect(v.capitulos).toHaveLength(2);
    expect(v.transcripcion.map((s) => s.inicio)).toEqual([0, 120]);
    const ia = (
      (await (await pedir(`/datos/videos/${id}/ia`)).json()) as {
        ia: { estado: string; tareas: string[]; muletillas: unknown[] };
      }
    ).ia;
    expect(ia.estado).toBe('listo');
    expect(ia.tareas).toEqual(['Revisar el teléfono']);
    expect(ia.muletillas).toHaveLength(2);
    const gen = await pedir(`/datos/videos/${id}/ia/generar`, {
      method: 'POST',
      json: { plantilla: 'nada' },
    });
    expect(gen.status).toBe(400);
    const salud = (await (await pedir('/datos/salud')).json()) as { ia: { oido: boolean; usd_mes: number } };
    expect(salud.ia.oido).toBe(true);
    expect(salud.ia.usd_mes).toBeGreaterThan(0);
  });
});

describe('audio en el navegador', () => {
  it('arma un WAV válido de 16 kHz y lo parte cada 2 minutos', () => {
    const w = new DataView(aWav(new Float32Array([0, 0.5, -1])));
    expect(String.fromCharCode(w.getUint8(0), w.getUint8(1), w.getUint8(2), w.getUint8(3))).toBe('RIFF');
    expect(w.getUint32(24, true)).toBe(16000);
    expect(w.getInt16(46, true)).toBe(16383);
    const p = partir(new Float32Array(16000 * 300));
    expect(p.map((x) => x.desde)).toEqual([0, 120, 240]);
    expect(p[2]!.wav.byteLength).toBe(44 + 16000 * 60 * 2);
  });

  it('procesar manda los pedazos en orden y después pide el análisis', async () => {
    const llamadas: string[] = [];
    const fases: string[] = [];
    await procesar('v1', 'es', (f) => fases.push(f.fase), {
      audio: async () => new Float32Array(16000 * 130),
      llamar: (async (ruta: string) => {
        llamadas.push(ruta);
        return { idioma: 'es', palabras: 3 };
      }) as never,
    });
    expect(llamadas).toEqual([
      '/datos/videos/v1/ia/transcribir?desde=0&primero=1&idioma=es',
      '/datos/videos/v1/ia/transcribir?desde=120&ultimo=1&idioma=es',
      '/datos/videos/v1/ia/analizar',
    ]);
    expect(fases).toEqual(['audio', 'oido', 'oido', 'cerebro']);
  });

  it('sin la llave del cerebro, solo transcribe', async () => {
    const llamadas: string[] = [];
    await procesar('v1', 'es', () => undefined, {
      cerebro: false,
      audio: async () => new Float32Array(16000 * 10),
      llamar: (async (ruta: string) => (llamadas.push(ruta), { idioma: 'es', palabras: 1 })) as never,
    });
    expect(llamadas.some((r) => r.includes('analizar'))).toBe(false);
  });
});
