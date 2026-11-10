// CANDADO C-CARPETAS-EQUIPO: carpetas compartidas con un equipo. El dueño comparte su carpeta (una fila de relación,
// nada se copia); los miembros ven los videos de hoy y los que se agreguen después, con el mismo permiso que un video
// compartido (ver, nunca editar, mover ni borrar). Quien no es del equipo jamás los ve ni los lista, ni por la API ni
// por la dirección directa del archivo. Salir, ser quitado o dejar de compartir corta el acceso al instante, y borrar
// la carpeta, el equipo o la cuenta no deja filas huérfanas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import { almacenFalso, baseFalsa } from './falsos';
import { PRESUPUESTO_FILAS_CARPETA_EQUIPO as PRESUPUESTO } from '../servidor/carpetasEquipo';

type Env = {
  DB: ReturnType<typeof baseFalsa>;
  BUCKET: ReturnType<typeof almacenFalso>;
  CORREO_TOKEN?: string;
};
let env: Env;
let enviados: { html: string; subject: string; to?: unknown }[];

beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso(), CORREO_TOKEN: 'prueba' };
  enviados = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u, init) => {
    enviados.push(JSON.parse(String((init as RequestInit).body)) as { html: string; subject: string });
    return new Response('{"ok":true}', { status: 200 });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

type Cliente = ((ruta: string, init?: RequestInit & { json?: unknown }) => Promise<Response>) & {
  id: string;
};

function cliente(): Cliente {
  let cookie = '';
  const f = (async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
    const h = new Headers(init.headers);
    h.set('cf-connecting-ip', '1.1.1.1');
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
  }) as Cliente;
  f.id = '';
  return f;
}

async function cuenta(nombre: string, correo: string): Promise<Cliente> {
  const c = cliente();
  const r = await c('/datos/registro', { method: 'POST', json: { nombre, correo, clave: 'clave-segura-1' } });
  expect(r.status).toBe(201);
  c.id = ((await r.json()) as { usuario: { id: string } }).usuario.id;
  await new Promise((ok) => setTimeout(ok, 10)); // el correo de bienvenida sale «después»
  return c;
}

/** Un video ya grabado y PRIVADO de esa cuenta, con su archivo y su miniatura. */
async function videoPrivado(c: Cliente, id = 'video-privado-1'): Promise<string> {
  const ahora = Date.now();
  env.DB.crudo
    .prepare(
      `INSERT INTO videos (id, usuario_id, titulo, tipo, estado, privacidad, duracion, tiene_miniatura, creado, actualizado)
       VALUES (?, ?, 'Demo', 'video/webm', 'listo', 'privado', 12, 1, ?, ?)`,
    )
    .run(id, c.id, ahora, ahora);
  await env.BUCKET.put(`videos/${id}/video`, new Uint8Array([1, 2, 3]), {
    httpMetadata: { contentType: 'video/webm' },
  });
  await env.BUCKET.put(`videos/${id}/miniatura.jpg`, new Uint8Array([9]), {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  return id;
}

const json = async <T>(r: Response) => (await r.json()) as T;
const tokenDe = (texto: string) => /join\?token=([A-Za-z0-9_-]+)/.exec(texto)?.[1];

async function crearEquipo(c: Cliente, nombre = 'Ventas'): Promise<string> {
  const r = await c('/datos/equipos', { method: 'POST', json: { nombre } });
  expect(r.status).toBe(201);
  return (await json<{ equipo: { id: string } }>(r)).equipo.id;
}

async function invitar(c: Cliente, equipo: string, correo: string) {
  const r = await c(`/datos/equipos/${equipo}/invitar`, { method: 'POST', json: { correo } });
  expect(r.status).toBe(201);
  await new Promise((ok) => setTimeout(ok, 10));
  return json<{ enlace: string }>(r);
}

/** Ana crea el equipo, invita a Beto y Beto se une. */
async function equipoConBeto() {
  const ana = await cuenta('Ana', 'ana@example.com');
  const beto = await cuenta('Beto', 'beto@example.com');
  const equipo = await crearEquipo(ana);
  const { enlace } = await invitar(ana, equipo, 'Beto@Example.com');
  const r = await beto('/datos/equipos/unirse', { method: 'POST', json: { token: tokenDe(enlace) } });
  expect(r.status).toBe(200);
  return { ana, beto, equipo };
}

const cambios = () => (env.DB.crudo.prepare('SELECT total_changes() AS n').get() as { n: number }).n;
const filas = (t: string) =>
  (env.DB.crudo.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

async function crearCarpeta(c: Cliente, nombre = 'Clientes'): Promise<string> {
  const r = await c('/datos/carpetas', { method: 'POST', json: { nombre } });
  expect(r.status).toBe(201);
  return (await json<{ carpeta: { id: string } }>(r)).carpeta.id;
}

async function meter(c: Cliente, video: string, carpeta: string | null) {
  const r = await c(`/datos/videos/${video}`, { method: 'PATCH', json: { carpeta_id: carpeta } });
  expect(r.status).toBe(200);
}

async function compartir(c: Cliente, equipo: string, carpeta: string) {
  return c(`/datos/equipos/${equipo}/carpetas`, { method: 'POST', json: { carpeta_id: carpeta } });
}

/** Ana con su equipo y Beto adentro, una carpeta con un video privado y Carla, que no es del equipo. */
async function escena() {
  const base = await equipoConBeto();
  const carla = await cuenta('Carla', 'carla@example.com');
  const carpeta = await crearCarpeta(base.ana);
  const video = await videoPrivado(base.ana, 'video-en-carpeta');
  await meter(base.ana, video, carpeta);
  return { ...base, carla, carpeta, video };
}

describe('CANDADO C-CARPETAS-EQUIPO', () => {
  it('compartir: el miembro ve la carpeta (con equipo y autora) y sus videos, también los que se agregan después', async () => {
    const { ana, beto, equipo, carpeta, video } = await escena();
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect((await compartir(ana, equipo, carpeta)).status).toBe(201);
    const pagina = await json<{
      carpetas: { id: string; nombre: string; autor: string; videos: number; es_mia: boolean }[];
    }>(await beto(`/datos/equipos/${equipo}`));
    expect(pagina.carpetas).toEqual([
      expect.objectContaining({ id: carpeta, nombre: 'Clientes', autor: 'Ana', videos: 1, es_mia: false }),
    ]);
    const dentro = await json<{
      equipo: { nombre: string };
      carpeta: { autor: string };
      videos: { id: string }[];
    }>(await beto(`/datos/equipos/${equipo}/carpetas/${carpeta}`));
    expect(dentro.equipo.nombre).toBe('Ventas');
    expect(dentro.carpeta.autor).toBe('Ana');
    expect(dentro.videos.map((v) => v.id)).toEqual([video]);
    expect((await beto(`/datos/videos/${video}`)).status).toBe(200);
    expect((await beto(`/media/${video}/video`)).status).toBe(200);
    expect((await beto(`/media/${video}/miniatura`)).status).toBe(200);
    // Un video que Ana mete DESPUÉS también se ve, sin volver a compartir nada.
    const nuevo = await videoPrivado(ana, 'video-despues');
    expect((await beto(`/datos/videos/${nuevo}`)).status).toBe(404);
    const antes = cambios();
    await meter(ana, nuevo, carpeta);
    expect(cambios() - antes).toBe(1); // solo la fila del video; el equipo no escribe nada
    expect((await beto(`/datos/videos/${nuevo}`)).status).toBe(200);
    // Lo que sale de la carpeta o se archiva deja de verse.
    await meter(ana, nuevo, null);
    expect((await beto(`/datos/videos/${nuevo}`)).status).toBe(404);
    await ana(`/datos/videos/${video}`, { method: 'PATCH', json: { archivado: true } });
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect(
      (await json<{ videos: unknown[] }>(await beto(`/datos/equipos/${equipo}/carpetas/${carpeta}`))).videos,
    ).toEqual([]);
    // La ventanita de compartir dice dónde está, y la lista de carpetas lo cuenta.
    expect(
      (await json<{ equipos: unknown[] }>(await ana(`/datos/carpetas/${carpeta}/equipos`))).equipos,
    ).toEqual([{ id: equipo, nombre: 'Ventas', compartido: true }]);
    const mias = await json<{ carpetas: { id: string; equipos: number }[] }>(await ana('/datos/carpetas'));
    expect(mias.carpetas.find((k) => k.id === carpeta)?.equipos).toBe(1);
  });

  it('seguridad: quien no es del equipo jamás ve ni lista esos videos, ni por la API ni por el archivo', async () => {
    const { ana, carla, equipo, carpeta, video } = await escena();
    await compartir(ana, equipo, carpeta);
    for (const c of [carla, cliente()]) {
      expect((await c(`/datos/equipos/${equipo}`)).status).toBe(c === carla ? 404 : 401);
      expect((await c(`/datos/equipos/${equipo}/carpetas/${carpeta}`)).status).toBe(c === carla ? 404 : 401);
      expect((await c(`/datos/videos/${video}`)).status).toBe(404);
      expect((await c(`/media/${video}/video`)).status).toBe(404);
      expect((await c(`/media/${video}/miniatura`)).status).toBe(404);
    }
    const suyos = await json<{ videos: { id: string }[] }>(await carla('/datos/videos'));
    expect(suyos.videos).toEqual([]);
    expect((await json<{ carpetas: unknown[] }>(await carla('/datos/carpetas'))).carpetas).toEqual([]);
    // Carla no puede compartir la carpeta de Ana con un equipo suyo, ni mirar con qué equipos está.
    const suyo = await crearEquipo(carla, 'Otro');
    expect((await compartir(carla, suyo, carpeta)).status).toBe(404);
    expect((await carla(`/datos/carpetas/${carpeta}/equipos`)).status).toBe(404);
    // Ni pedir esa carpeta a través de SU equipo (no está compartida ahí).
    expect((await carla(`/datos/equipos/${suyo}/carpetas/${carpeta}`)).status).toBe(404);
    expect((await carla(`/datos/videos/${video}`)).status).toBe(404);
  });

  it('una carpeta compartida no deja colar videos ajenos: solo cuentan los del dueño de la carpeta', async () => {
    const { ana, beto, carla, equipo, carpeta } = await escena();
    await compartir(ana, equipo, carpeta);
    // Carla escribe a mano en su video el id de la carpeta de Ana: la API no la deja…
    const ajeno = await videoPrivado(carla, 'video-de-carla');
    expect(
      (await carla(`/datos/videos/${ajeno}`, { method: 'PATCH', json: { carpeta_id: carpeta } })).status,
    ).toBe(400);
    // …y aunque la fila quedara así, Beto no lo ve.
    env.DB.crudo.prepare('UPDATE videos SET carpeta_id = ? WHERE id = ?').run(carpeta, ajeno);
    expect((await beto(`/datos/videos/${ajeno}`)).status).toBe(404);
    const dentro = await json<{ videos: { id: string }[] }>(
      await beto(`/datos/equipos/${equipo}/carpetas/${carpeta}`),
    );
    expect(dentro.videos.map((v) => v.id)).not.toContain(ajeno);
  });

  it('el miembro no borra, no mueve ni edita lo que no es suyo, ni comparte la carpeta ajena', async () => {
    const { ana, beto, equipo, carpeta, video } = await escena();
    await compartir(ana, equipo, carpeta);
    const deBeto = await crearCarpeta(beto, 'Mía');
    expect(
      (await beto(`/datos/videos/${video}`, { method: 'PATCH', json: { carpeta_id: deBeto } })).status,
    ).toBe(404);
    expect((await beto(`/datos/videos/${video}`, { method: 'PATCH', json: { titulo: 'X' } })).status).toBe(
      404,
    );
    expect((await beto(`/datos/videos/${video}`, { method: 'DELETE' })).status).toBe(404);
    expect((await beto(`/datos/carpetas/${carpeta}`, { method: 'DELETE' })).status).toBe(404);
    expect(
      (await beto(`/datos/carpetas/${carpeta}`, { method: 'PATCH', json: { nombre: 'X' } })).status,
    ).toBe(404);
    expect((await compartir(beto, equipo, carpeta)).status).toBe(404);
    // Un miembro sin rol de admin no la saca del equipo.
    expect((await beto(`/datos/equipos/${equipo}/carpetas/${carpeta}`, { method: 'DELETE' })).status).toBe(
      404,
    );
    expect((await ana(`/datos/videos/${video}`)).status).toBe(200);
    expect(filas('carpetas_equipo')).toBe(1);
  });

  it('dejar de compartir, salir o ser quitado corta el acceso al instante', async () => {
    const { ana, beto, equipo, carpeta, video } = await escena();
    await compartir(ana, equipo, carpeta);
    expect((await ana(`/datos/equipos/${equipo}/carpetas/${carpeta}`, { method: 'DELETE' })).status).toBe(
      200,
    );
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect((await beto(`/datos/equipos/${equipo}/carpetas/${carpeta}`)).status).toBe(404);
    expect((await json<{ carpetas: unknown[] }>(await beto(`/datos/equipos/${equipo}`))).carpetas).toEqual(
      [],
    );
    // Otra vez compartida; Beto se sale y pierde el acceso.
    await compartir(ana, equipo, carpeta);
    expect((await beto(`/datos/videos/${video}`)).status).toBe(200);
    await beto(`/datos/equipos/${equipo}/miembros/${beto.id}`, { method: 'DELETE' });
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect((await beto(`/media/${video}/video`)).status).toBe(404);
    // Vuelve a entrar, la ve, y Ana lo quita.
    const { enlace } = await invitar(ana, equipo, 'beto@example.com');
    await beto('/datos/equipos/unirse', { method: 'POST', json: { token: tokenDe(enlace) } });
    expect((await beto(`/datos/videos/${video}`)).status).toBe(200);
    await ana(`/datos/equipos/${equipo}/miembros/${beto.id}`, { method: 'DELETE' });
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
  });

  it('un admin del equipo puede sacar la carpeta; si el dueño de la carpeta sale, deja de estar compartida', async () => {
    const { ana, beto, equipo } = await equipoConBeto();
    const carpetaBeto = await crearCarpeta(beto, 'De Beto');
    const video = await videoPrivado(beto, 'video-de-beto');
    await meter(beto, video, carpetaBeto);
    expect((await compartir(beto, equipo, carpetaBeto)).status).toBe(201);
    expect((await ana(`/datos/videos/${video}`)).status).toBe(200);
    expect((await ana(`/datos/equipos/${equipo}/carpetas/${carpetaBeto}`, { method: 'DELETE' })).status).toBe(
      200,
    );
    expect((await ana(`/datos/videos/${video}`)).status).toBe(404);
    await compartir(beto, equipo, carpetaBeto);
    await beto(`/datos/equipos/${equipo}/miembros/${beto.id}`, { method: 'DELETE' });
    expect(filas('carpetas_equipo')).toBe(0);
    expect((await ana(`/datos/videos/${video}`)).status).toBe(404);
  });

  it('borrar la carpeta, el equipo o la cuenta no deja filas huérfanas, y nunca borra videos', async () => {
    const { ana, beto, equipo, carpeta, video } = await escena();
    await compartir(ana, equipo, carpeta);
    expect((await ana(`/datos/carpetas/${carpeta}`, { method: 'DELETE' })).status).toBe(200);
    expect(filas('carpetas_equipo')).toBe(0);
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect((await ana(`/datos/videos/${video}`)).status).toBe(200);
    // Equipo borrado.
    const otra = await crearCarpeta(ana, 'Otra');
    await meter(ana, video, otra);
    await compartir(ana, equipo, otra);
    expect((await ana(`/datos/equipos/${equipo}`, { method: 'DELETE' })).status).toBe(200);
    expect(filas('carpetas_equipo')).toBe(0);
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect(env.BUCKET.objetos.has(`videos/${video}/video`)).toBe(true);
    // Cuenta borrada: lo que compartió desaparece del equipo de Beto.
    const eqBeto = await crearEquipo(beto, 'De Beto');
    const { enlace } = await invitar(beto, eqBeto, 'ana@example.com');
    await ana('/datos/equipos/unirse', { method: 'POST', json: { token: tokenDe(enlace) } });
    await compartir(ana, eqBeto, otra);
    expect(filas('carpetas_equipo')).toBe(1);
    expect(
      (await ana('/datos/cuenta/borrar', { method: 'POST', json: { clave: 'clave-segura-1' } })).status,
    ).toBe(200);
    expect(filas('carpetas_equipo')).toBe(0);
    expect((await json<{ carpetas: unknown[] }>(await beto(`/datos/equipos/${eqBeto}`))).carpetas).toEqual(
      [],
    );
  });

  it('presupuesto de escrituras: compartir es una fila, repetir no escribe y mirar tampoco', async () => {
    const { ana, beto, equipo, carpeta, video } = await escena();
    let antes = cambios();
    await compartir(ana, equipo, carpeta);
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO.compartir);
    antes = cambios();
    await compartir(ana, equipo, carpeta);
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO.compartirOtraVez);
    antes = cambios();
    for (let i = 0; i < 3; i++) {
      await beto(`/datos/equipos/${equipo}`);
      await beto(`/datos/equipos/${equipo}/carpetas/${carpeta}`);
      await beto(`/datos/videos/${video}`);
      await beto(`/media/${video}/miniatura`);
      await ana(`/datos/carpetas/${carpeta}/equipos`);
      await ana('/datos/carpetas');
    }
    expect(cambios() - antes).toBe(PRESUPUESTO.mirar);
    antes = cambios();
    await ana(`/datos/equipos/${equipo}/carpetas/${carpeta}`, { method: 'DELETE' });
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO.dejarDeCompartir);
  });

  it('valida lo que entra: sin carpeta o con un id raro da 400', async () => {
    const { ana, equipo } = await escena();
    expect((await ana(`/datos/equipos/${equipo}/carpetas`, { method: 'POST', json: {} })).status).toBe(400);
    expect(
      (
        await ana(`/datos/equipos/${equipo}/carpetas`, {
          method: 'POST',
          json: { carpeta_id: 'x'.repeat(80) },
        })
      ).status,
    ).toBe(400);
  });
});
