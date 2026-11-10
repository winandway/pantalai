// CANDADO C-CREDITO (servidor): el crédito al creador que manda el Estudio al terminar una reacción. El enlace solo
// acepta https de YouTube o TikTok (zod); solo el dueño del video lo lee; se borra con el video; y repetir el cierre o
// duplicar el video no deja dos filas para el mismo video.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app, { PARTE_MIN } from '../servidor/app';
import { almacenFalso, baseFalsa } from './falsos';

type Env = { DB: ReturnType<typeof baseFalsa>; BUCKET: ReturnType<typeof almacenFalso> };
let env: Env;

beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso() };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }));
});

type Cliente = (ruta: string, init?: RequestInit & { json?: unknown }) => Promise<Response>;

function cliente(ip = '1.1.1.1'): Cliente {
  let cookie = '';
  return async (ruta, init = {}) => {
    const h = new Headers(init.headers);
    h.set('cf-connecting-ip', ip);
    if (cookie) h.set('cookie', cookie);
    if (init.method && init.method !== 'GET') h.set('x-pantalai', '1');
    if (init.json !== undefined) h.set('content-type', 'application/json');
    const r = await app.request(
      `https://pantalai.test${ruta}`,
      { ...init, headers: h, body: init.json !== undefined ? JSON.stringify(init.json) : init.body },
      env,
      { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext,
    );
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0]!;
    return r;
  };
}

async function cuenta(nombre: string, correo: string, ip: string): Promise<Cliente> {
  const c = cliente(ip);
  const r = await c('/datos/registro', { method: 'POST', json: { nombre, correo, clave: 'clave-segura-1' } });
  expect(r.status).toBe(201);
  return c;
}

/** Sube un video y devuelve su id y cómo cerrarlo (con o sin crédito). */
async function videoSubido(c: Cliente) {
  const { id } = (await (
    await c('/datos/videos', { method: 'POST', json: { tipo: 'video/webm', ancho: 1280, alto: 720 } })
  ).json()) as { id: string };
  const p = (await (
    await c(`/datos/videos/${id}/partes/1`, { method: 'PUT', body: new Uint8Array(PARTE_MIN + 10) })
  ).json()) as { parte: object };
  const cerrar = (credito?: unknown) =>
    c(`/datos/videos/${id}/completar`, {
      method: 'POST',
      json: { partes: [p.parte], duracion: 30, ...(credito === undefined ? {} : { credito }) },
    });
  return { id, cerrar };
}

const filas = (id?: string) =>
  (
    (id
      ? env.DB.crudo.prepare('SELECT COUNT(*) AS n FROM video_credito WHERE video_id = ?').get(id)
      : env.DB.crudo.prepare('SELECT COUNT(*) AS n FROM video_credito').get()) as { n: number }
  ).n;

describe('crédito al creador (servidor)', () => {
  it('el enlace solo acepta https de YouTube o TikTok', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com', '1.1.1.1');
    for (const enlace of [
      'http://www.youtube.com/watch?v=abc',
      'https://youtube.com.evil.example/watch?v=abc',
      'https://youtube.com@evil.example/',
      'https://evil.example/https://www.youtube.com/',
      'javascript:alert(1)//https://www.youtube.com/',
      'https://vimeo.com/123',
      `https://www.youtube.com/watch?v=${'a'.repeat(300)}`,
    ]) {
      const v = await videoSubido(ana);
      expect((await v.cerrar({ creador: 'Beto', enlace })).status, enlace).toBe(400);
    }
    expect(filas()).toBe(0);
    // Un creador vacío tampoco: el crédito sin nombre no es crédito.
    expect((await (await videoSubido(ana)).cerrar({ creador: ' ', enlace: '' })).status).toBe(400);

    for (const enlace of [
      'https://www.youtube.com/watch?v=abc123',
      'https://youtube.com/shorts/abc123',
      'https://www.tiktok.com/@creador/video/123',
      '',
    ]) {
      const v = await videoSubido(ana);
      expect((await v.cerrar({ creador: 'Beto', enlace })).status, enlace).toBe(200);
      expect(filas(v.id)).toBe(1);
    }
  });

  it('solo el dueño lo lee; repetir el cierre o duplicar no deja dos filas; se borra con el video', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com', '1.1.1.1');
    const v = await videoSubido(ana);
    const credito = { creador: 'Beto Ruiz', enlace: 'https://www.youtube.com/watch?v=abc123' };
    expect((await v.cerrar(credito)).status).toBe(200);
    // Se cortó la red justo al cerrar y el navegador reintenta: misma respuesta, una sola fila.
    expect((await v.cerrar(credito)).status).toBe(200);
    expect(filas(v.id)).toBe(1);

    const suyo = (await (await ana(`/datos/videos/${v.id}`)).json()) as { video: { credito: unknown } };
    expect(suyo.video.credito).toEqual(credito);
    // Otra cuenta y un visitante sin cuenta ven el video (enlace) pero no el crédito.
    await ana(`/datos/videos/${v.id}`, { method: 'PATCH', json: { privacidad: 'enlace' } });
    const beto = await cuenta('Beto Ruiz', 'beto@example.com', '2.2.2.2');
    for (const otro of [beto, cliente('3.3.3.3')]) {
      const r = await otro(`/datos/videos/${v.id}`);
      expect(r.status).toBe(200);
      expect(((await r.json()) as { video: { credito: unknown } }).video.credito).toBeNull();
    }

    // Duplicar copia el crédito a la copia (una fila por video, no dos en el original).
    const copia = await ana(`/datos/videos/${v.id}/duplicar`, { method: 'POST' });
    expect(copia.status).toBe(201);
    const { id: idCopia } = (await copia.json()) as { id: string };
    expect(filas(v.id)).toBe(1);
    expect(filas(idCopia)).toBe(1);

    expect((await ana(`/datos/videos/${v.id}`, { method: 'DELETE' })).status).toBe(200);
    expect(filas(v.id)).toBe(0);
    expect((await ana(`/datos/videos/${idCopia}`, { method: 'DELETE' })).status).toBe(200);
    expect(filas()).toBe(0);
  });
});
