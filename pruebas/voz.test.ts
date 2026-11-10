// CANDADO C-HABLANDO (fase 4): el cartel «Hablando / Escuchando» se enciende con la voz, no parpadea entre sílabas y
// se apaga en el silencio; las barras siguen el nivel. CANDADO C-CREDITO: una reacción guarda el crédito del video
// original y «Para YouTube» lo pone solo en la descripción (solo el dueño lo recibe; zod no deja enlaces raros).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import { DetectorVoz, alturasBarras, nivelDeMuestras } from '../web/src/logica/voz';
import { descripcionYoutube, lineaCredito } from '../web/src/logica/youtube';
import { enlaceOriginal } from '../web/src/logica/estudio';
import { almacenFalso, baseFalsa } from './falsos';

describe('cartel «Hablando» (lo puro)', () => {
  it('el nivel sale del sonido: silencio 0, voz fuerte cerca de 1', () => {
    expect(nivelDeMuestras(new Uint8Array(512).fill(128))).toBe(0);
    const voz = Uint8Array.from({ length: 512 }, (_, i) => 128 + Math.round(60 * Math.sin(i / 4)));
    expect(nivelDeMuestras(voz)).toBeGreaterThan(0.9);
    const susurro = Uint8Array.from({ length: 512 }, (_, i) => 128 + Math.round(3 * Math.sin(i / 4)));
    expect(nivelDeMuestras(susurro)).toBeLessThan(0.07);
    expect(nivelDeMuestras(new Uint8Array(0))).toBe(0);
  });

  it('se enciende con la voz, aguanta entre sílabas y se apaga en el silencio', () => {
    const d = new DetectorVoz();
    expect(d.actualizar(0.02, 0)).toBe(false); // silencio: «Escuchando»
    expect(d.actualizar(0.3, 100)).toBe(true); // habla: «Hablando»
    expect(d.actualizar(0.08, 150)).toBe(true); // baja un poco: sigue
    expect(d.actualizar(0.01, 300)).toBe(true); // pausa corta entre palabras: sigue (no parpadea)
    expect(d.actualizar(0.01, 700)).toBe(false); // silencio de verdad: se apaga
    expect(d.actualizar(0.09, 800)).toBe(false); // un ruido suave no lo enciende
  });

  it('las barras siguen el nivel y en silencio quedan bajitas y quietas', () => {
    expect(alturasBarras(0, 4, 3)).toEqual([0.15, 0.15, 0.15, 0.15]);
    const fuertes = alturasBarras(0.9, 4, 0);
    expect(Math.max(...fuertes)).toBeGreaterThan(0.7);
    expect(fuertes.every((a) => a >= 0.15 && a <= 1)).toBe(true);
    expect(alturasBarras(2, 4).every((a) => a <= 1)).toBe(true);
  });
});

describe('crédito del video original en «Para YouTube»', () => {
  it('la línea del crédito, en los dos idiomas, va después del gancho', () => {
    const c = { creador: '@creadora', enlace: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' };
    expect(lineaCredito(c, 'en')).toBe(
      'Original video by @creadora: https://www.youtube.com/watch?v=aaaaaaaaaaa',
    );
    expect(lineaCredito({ creador: '@creadora', enlace: '' }, 'es-ES')).toBe('Video original de @creadora');
    expect(lineaCredito({ creador: ' ', enlace: '' }, 'en')).toBe('');
    const d = descripcionYoutube({
      gancho: 'My reaction',
      resumen: 'Summary',
      capitulos: [],
      duracion: 30,
      hashtags: ['#a'],
      idioma: 'en',
      credito: c,
    });
    expect(d.split('\n\n')).toEqual(['My reaction', lineaCredito(c, 'en'), 'Summary', '#a']);
    expect(
      descripcionYoutube({
        gancho: 'G',
        resumen: '',
        capitulos: [],
        duracion: 1,
        hashtags: [],
        idioma: 'en',
      }),
    ).toBe('G');
  });

  it('el enlace original de YouTube y TikTok pasa la regla del servidor', () => {
    expect(enlaceOriginal({ plataforma: 'youtube', id: 'aaaaaaaaaaa' })).toMatch(
      /^https:\/\/www\.youtube\.com\//,
    );
    expect(enlaceOriginal({ plataforma: 'tiktok', id: '123456789', creador: '@x' })).toMatch(
      /^https:\/\/www\.tiktok\.com\//,
    );
    expect(enlaceOriginal({ plataforma: 'archivo', id: 'blob:x' })).toBe('');
  });
});

describe('crédito (servidor)', () => {
  type Env = { DB: ReturnType<typeof baseFalsa>; BUCKET: ReturnType<typeof almacenFalso> };
  let env: Env;
  beforeEach(() => {
    env = { DB: baseFalsa(), BUCKET: almacenFalso() };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }));
  });
  afterEach(() => vi.restoreAllMocks());

  function cliente(ip: string) {
    let cookie = '';
    return async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
      const h = new Headers(init.headers);
      h.set('cf-connecting-ip', ip);
      if (cookie) h.set('cookie', cookie);
      if (init.method && init.method !== 'GET') h.set('x-pantalai', '1');
      if (init.json !== undefined) h.set('content-type', 'application/json');
      const r = await app.request(
        `https://pantalai.test${ruta}`,
        { ...init, headers: h, body: init.json !== undefined ? JSON.stringify(init.json) : init.body },
        env,
        {
          waitUntil: () => undefined,
          passThroughOnException: () => undefined,
        } as unknown as ExecutionContext,
      );
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0]!;
      return r;
    };
  }

  async function reaccion(credito: unknown) {
    const c = cliente(`5.5.5.${Math.floor(Math.random() * 250)}`);
    await c('/datos/registro', {
      method: 'POST',
      json: {
        nombre: 'Ana',
        correo: `ana.${Math.random().toString(36).slice(2)}@example.com`,
        clave: 'clave-segura-1',
      },
    });
    const { id } = (await (
      await c('/datos/videos', { method: 'POST', json: { tipo: 'video/webm', ancho: 1920, alto: 1080 } })
    ).json()) as { id: string };
    const p1 = (
      (await (
        await c(`/datos/videos/${id}/partes/1`, {
          method: 'PUT',
          body: new Uint8Array(100) as unknown as BodyInit,
        })
      ).json()) as { parte: object }
    ).parte;
    const fin = await c(`/datos/videos/${id}/completar`, {
      method: 'POST',
      json: { partes: [p1], duracion: 3, credito },
    });
    return { c, id, fin };
  }

  it('se guarda al terminar y lo recibe solo el dueño', async () => {
    const credito = { creador: '@creadora', enlace: 'https://www.tiktok.com/@creadora/video/1234567890' };
    const { c, id, fin } = await reaccion(credito);
    expect(fin.status).toBe(200);
    const yo = (await (await c(`/datos/videos/${id}`)).json()) as { video: { credito: unknown } };
    expect(yo.video.credito).toEqual(credito);
    const otro = cliente('6.6.6.6');
    const ajeno = await otro(`/datos/videos/${id}`);
    if (ajeno.status === 200)
      expect(((await ajeno.json()) as { video: { credito: unknown } }).video.credito).toBeNull();
  });

  it('zod: no acepta enlaces de otros sitios ni de «javascript:»', async () => {
    for (const enlace of [
      'javascript:alert(1)',
      'https://evil.example.com/x',
      'http://www.youtube.com/watch?v=1',
    ])
      expect((await reaccion({ creador: '@x', enlace })).fin.status).toBe(400);
    expect((await reaccion({ creador: '@x', enlace: '' })).fin.status).toBe(200);
  });
});
