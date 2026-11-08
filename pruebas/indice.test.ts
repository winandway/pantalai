// CANDADO C-INDICE-MP4: el MP4 grabado queda con el índice al principio (saltar a cualquier minuto al instante),
// sin re-codificar y sin tocar el original si la copia no cuadra.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import app, { PARTE_MIN } from '../servidor/app';
import { cajasDeArriba, copiaIndiceValida, indiceAlPrincipio } from '../web/src/logica/cajasMp4';
import { comprobarCopia, necesitaIndice, reordenar } from '../web/src/logica/indice';
import { almacenFalso, baseFalsa } from './falsos';

const fragmentado = new Uint8Array(readFileSync(new URL('../e2e/datos/fragmentado.mp4', import.meta.url)));

function caja(tipo: string, tam: number): Uint8Array {
  const b = new Uint8Array(tam);
  new DataView(b.buffer).setUint32(0, tam);
  b.set(new TextEncoder().encode(tipo), 4);
  return b;
}
function unir(...p: Uint8Array[]): Uint8Array {
  const t = new Uint8Array(p.reduce((a, x) => a + x.length, 0));
  let i = 0;
  for (const x of p) {
    t.set(x, i);
    i += x.length;
  }
  return t;
}

describe('cajas del MP4', () => {
  it('el MP4 que graba Chrome viene en fragmentos: necesita índice', () => {
    const t = cajasDeArriba(fragmentado.slice(0, 64 * 1024));
    expect(t[0]).toBe('ftyp');
    expect(t).toContain('moof');
    expect(indiceAlPrincipio(fragmentado.slice(0, 64 * 1024))).toBe(false);
  });

  it('moov antes de mdat = índice al principio; mdat antes de moov = no', () => {
    expect(indiceAlPrincipio(unir(caja('ftyp', 24), caja('moov', 500), caja('mdat', 100)))).toBe(true);
    expect(indiceAlPrincipio(unir(caja('ftyp', 24), caja('mdat', 100), caja('moov', 500)))).toBe(false);
    expect(indiceAlPrincipio(unir(caja('ftyp', 24), caja('free', 8), caja('moov', 9_000_000)))).toBe(true);
    expect(indiceAlPrincipio(new Uint8Array(100))).toBe(false);
  });

  it('la copia solo vale con índice, peso parecido y la misma duración', () => {
    const buena = unir(caja('ftyp', 24), caja('moov', 500), caja('mdat', 100));
    expect(copiaIndiceValida(buena, 1000, 1050, 30, 30.4)).toBe(true);
    expect(copiaIndiceValida(buena, 400, 1050, 30, 30)).toBe(false); // falta la mitad
    expect(copiaIndiceValida(buena, 1000, 1050, 20, 30)).toBe(false); // dura menos
    expect(copiaIndiceValida(caja('mdat', 100), 1000, 1000, 30, 30)).toBe(false);
  });
});

describe('reordenar en el navegador', () => {
  it('el fragmentado sale con índice al principio, la misma duración y sin re-codificar', async () => {
    const original = new Blob([fragmentado], { type: 'video/mp4' });
    expect(await necesitaIndice(original)).toBe(true);
    const copia = await reordenar(original);
    expect(indiceAlPrincipio(new Uint8Array(await copia.slice(0, 64 * 1024).arrayBuffer()))).toBe(true);
    const dur = await comprobarCopia(original, copia);
    expect(dur).toBeGreaterThan(1);
    // Sin re-codificar: pesa casi lo mismo.
    expect(copia.size / original.size).toBeGreaterThan(0.9);
    expect(copia.size / original.size).toBeLessThan(1.05);
    expect(await necesitaIndice(copia)).toBe(false);
  });

  it('un WebM no se toca', async () => {
    expect(await necesitaIndice(new Blob([new Uint8Array(10)], { type: 'video/webm' }))).toBe(false);
  });
});

describe('reemplazo en el servidor', () => {
  let env: { DB: D1Database; BUCKET: ReturnType<typeof almacenFalso> };
  beforeEach(() => {
    env = { DB: baseFalsa(), BUCKET: almacenFalso() };
  });
  function cliente() {
    let cookie = '';
    return async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
      const h = new Headers(init.headers);
      h.set('cf-connecting-ip', '1.1.1.1');
      if (cookie) h.set('cookie', cookie);
      if (init.method && init.method !== 'GET') h.set('x-pantalai', '1');
      if (init.json !== undefined) h.set('content-type', 'application/json');
      const r = await app.request(
        `https://pantalai.test${ruta}`,
        { ...init, headers: h, body: init.json !== undefined ? JSON.stringify(init.json) : init.body },
        env,
      );
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0]!;
      return r;
    };
  }
  async function videoMp4(original: Uint8Array) {
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    const { id } = (await (
      await c('/datos/videos', { method: 'POST', json: { tipo: 'video/mp4', ancho: 1280, alto: 720 } })
    ).json()) as { id: string };
    const p = (await (
      await c(`/datos/videos/${id}/partes/1`, { method: 'PUT', body: original as BodyInit })
    ).json()) as {
      parte: object;
    };
    expect(
      (
        await c(`/datos/videos/${id}/completar`, {
          method: 'POST',
          json: { partes: [p.parte], duracion: 30 },
        })
      ).status,
    ).toBe(200);
    return { c, id };
  }
  async function subirCopia(c: ReturnType<typeof cliente>, id: string, copia: Uint8Array, duracion = 30) {
    const ini = (await (await c(`/datos/videos/${id}/indice`, { method: 'POST' })).json()) as {
      subida: string;
      parte_minima: number;
    };
    expect(ini.parte_minima).toBe(PARTE_MIN);
    const p = (await (
      await c(`/datos/videos/${id}/indice/partes/1?subida=${ini.subida}`, {
        method: 'PUT',
        body: copia as BodyInit,
      })
    ).json()) as { parte: object };
    return c(`/datos/videos/${id}/indice/completar`, {
      method: 'POST',
      json: { subida: ini.subida, partes: [p.parte], duracion },
    });
  }

  const original = unir(caja('ftyp', 24), caja('moov', 200), caja('moof', 100), caja('mdat', 9_676));
  const buena = unir(caja('ftyp', 24), caja('moov', 400), caja('mdat', 9_500));

  it('una copia buena reemplaza al original y no deja segunda copia', async () => {
    const { c, id } = await videoMp4(original);
    const r = await subirCopia(c, id, buena);
    expect(r.status).toBe(200);
    expect(env.BUCKET.objetos.get(`videos/${id}/video`)!.datos).toEqual(buena);
    expect(env.BUCKET.objetos.has(`videos/${id}/indice.mp4`)).toBe(false);
    const v = (await (await c(`/datos/videos/${id}`)).json()) as { video: { bytes: number } };
    expect(v.video.bytes).toBe(buena.length);
  });

  it('una copia sin índice o con otra duración se rechaza y el original queda intacto', async () => {
    const { c, id } = await videoMp4(original);
    expect((await subirCopia(c, id, original)).status).toBe(422);
    expect((await subirCopia(c, id, buena, 12)).status).toBe(422);
    expect(env.BUCKET.objetos.get(`videos/${id}/video`)!.datos).toEqual(original);
    expect(env.BUCKET.objetos.has(`videos/${id}/indice.mp4`)).toBe(false);
  });

  it('solo el dueño y solo para MP4', async () => {
    const { id } = await videoMp4(original);
    const otro = cliente();
    await otro('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Luis', correo: 'luis@example.com', clave: 'clave-segura-1' },
    });
    expect((await otro(`/datos/videos/${id}/indice`, { method: 'POST' })).status).toBe(404);
  });
});
