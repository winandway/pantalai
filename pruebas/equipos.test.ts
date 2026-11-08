// CANDADO C-EQUIPOS: espacios de equipo. Se invita por correo (enlace de 7 días que solo sirve con ese correo), un
// miembro ve los videos compartidos con su equipo aunque sean privados, quien no es miembro recibe 404, el dueño no
// puede salirse y borrar el equipo nunca borra videos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import { almacenFalso, baseFalsa } from './falsos';

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

describe('CANDADO C-EQUIPOS', () => {
  it('crear: quien crea queda como admin y dueño, y el equipo sale en su lista', async () => {
    const ana = await cuenta('Ana', 'ana@example.com');
    const equipo = await crearEquipo(ana, 'Marketing');
    const lista = await json<{ equipos: { id: string; nombre: string; rol: string; es_dueno: boolean }[] }>(
      await ana('/datos/equipos'),
    );
    expect(lista.equipos).toEqual([{ id: equipo, nombre: 'Marketing', rol: 'admin', es_dueno: true }]);
    expect((await ana('/datos/equipos', { method: 'POST', json: { nombre: '  ' } })).status).toBe(400);
    expect(
      (await ana(`/datos/equipos/${equipo}`, { method: 'PATCH', json: { nombre: 'Ventas' } })).status,
    ).toBe(200);
    expect(
      (await json<{ equipo: { nombre: string } }>(await ana(`/datos/equipos/${equipo}`))).equipo.nombre,
    ).toBe('Ventas');
  });

  it('invitar: el enlace llega en el correo (en el idioma de quien invita) y también en la respuesta', async () => {
    const ana = await cuenta('Ana', 'ana@example.com');
    const equipo = await crearEquipo(ana);
    const antes = enviados.length;
    const { enlace } = await invitar(ana, equipo, 'nuevo@example.com');
    expect(enlace).toMatch(/^https:\/\/pantalay\.com\/join\?token=/);
    const correo = enviados.slice(antes).find((m) => m.subject.includes('invited you'));
    expect(correo).toBeTruthy();
    expect(tokenDe(correo!.html)).toBe(tokenDe(enlace));
    // El token se guarda como hash, nunca tal cual.
    const fila = env.DB.crudo.prepare('SELECT token_hash FROM invitaciones_equipo').get() as {
      token_hash: string;
    };
    expect(fila.token_hash).not.toBe(tokenDe(enlace));
    // La ve en la página del equipo como pendiente.
    const datos = await json<{ invitaciones: { correo: string }[] }>(await ana(`/datos/equipos/${equipo}`));
    expect(datos.invitaciones.map((i) => i.correo)).toEqual(['nuevo@example.com']);
  });

  it('unirse: sirve con el correo invitado, una sola vez; con otro correo da 403 y vencido da 400', async () => {
    const ana = await cuenta('Ana', 'ana@example.com');
    const beto = await cuenta('Beto', 'beto@example.com');
    const carla = await cuenta('Carla', 'carla@example.com');
    const equipo = await crearEquipo(ana);
    const token = tokenDe((await invitar(ana, equipo, 'beto@example.com')).enlace);
    const otro = await carla('/datos/equipos/unirse', { method: 'POST', json: { token } });
    expect(otro.status).toBe(403);
    expect((await json<{ error: string }>(otro)).error).toBe('invitacion_otro_correo');
    expect((await carla(`/datos/equipos/${equipo}`)).status).toBe(404);
    const ok = await beto('/datos/equipos/unirse', { method: 'POST', json: { token } });
    expect(ok.status).toBe(200);
    expect((await json<{ equipo_id: string }>(ok)).equipo_id).toBe(equipo);
    const usado = await beto('/datos/equipos/unirse', { method: 'POST', json: { token } });
    expect(usado.status).toBe(400);
    expect((await json<{ error: string }>(usado)).error).toBe('enlace_vencido');
    const miembros = await json<{ miembros: { nombre: string; rol: string }[] }>(
      await ana(`/datos/equipos/${equipo}`),
    );
    expect(miembros.miembros.map((m) => [m.nombre, m.rol])).toEqual([
      ['Ana', 'admin'],
      ['Beto', 'miembro'],
    ]);
    // Vencido a los 7 días.
    const token2 = tokenDe((await invitar(ana, equipo, 'carla@example.com')).enlace);
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 8 * 24 * 3600 * 1000 });
    const vencido = await carla('/datos/equipos/unirse', { method: 'POST', json: { token: token2 } });
    expect(vencido.status).toBe(400);
    // Sin sesión no se une nadie.
    expect(
      (await cliente()('/datos/equipos/unirse', { method: 'POST', json: { token: token2 } })).status,
    ).toBe(401);
  });

  it('un miembro ve el video privado compartido; quien no es del equipo recibe 404', async () => {
    const { ana, beto, equipo } = await equipoConBeto();
    const carla = await cuenta('Carla', 'carla@example.com');
    const video = await videoPrivado(ana);
    // Antes de compartir, Beto no lo ve.
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    // Beto no puede compartir un video que no es suyo.
    expect(
      (await beto(`/datos/equipos/${equipo}/videos`, { method: 'POST', json: { video_id: video } })).status,
    ).toBe(404);
    expect(
      (await ana(`/datos/equipos/${equipo}/videos`, { method: 'POST', json: { video_id: video } })).status,
    ).toBe(201);
    const visto = await beto(`/datos/videos/${video}`);
    expect(visto.status).toBe(200);
    expect((await json<{ video: { es_dueno: boolean } }>(visto)).video.es_dueno).toBe(false);
    expect((await beto(`/media/${video}/video`)).status).toBe(200);
    expect((await beto(`/media/${video}/miniatura`)).status).toBe(200);
    const pagina = await json<{ videos: { id: string; autor: string }[] }>(
      await beto(`/datos/equipos/${equipo}`),
    );
    expect(pagina.videos.map((v) => [v.id, v.autor])).toEqual([[video, 'Ana']]);
    // Solo el autor edita o borra.
    expect((await beto(`/datos/videos/${video}`, { method: 'PATCH', json: { titulo: 'X' } })).status).toBe(
      404,
    );
    expect((await beto(`/datos/videos/${video}`, { method: 'DELETE' })).status).toBe(404);
    // Los de fuera: nada.
    expect((await carla(`/datos/videos/${video}`)).status).toBe(404);
    expect((await carla(`/media/${video}/video`)).status).toBe(404);
    expect((await carla(`/media/${video}/miniatura`)).status).toBe(404);
    expect((await cliente()(`/datos/videos/${video}`)).status).toBe(404);
    expect((await carla(`/datos/equipos/${equipo}`)).status).toBe(404);
    // La ventanita de compartir dice dónde está.
    const donde = await json<{ equipos: { id: string; compartido: boolean }[] }>(
      await ana(`/datos/videos/${video}/equipos`),
    );
    expect(donde.equipos).toEqual([{ id: equipo, nombre: 'Ventas', compartido: true }]);
    // Al dejar de compartir, Beto deja de verlo.
    expect((await ana(`/datos/equipos/${equipo}/videos/${video}`, { method: 'DELETE' })).status).toBe(200);
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
  });

  it('quitar y salir: el admin quita, uno se sale solo, y el dueño no puede salirse ni ser quitado', async () => {
    const { ana, beto, equipo } = await equipoConBeto();
    const video = await videoPrivado(ana);
    await ana(`/datos/equipos/${equipo}/videos`, { method: 'POST', json: { video_id: video } });
    // Un miembro no quita a nadie, y al dueño no lo quita nadie.
    expect((await beto(`/datos/equipos/${equipo}/miembros/${ana.id}`, { method: 'DELETE' })).status).toBe(
      403,
    );
    const sale = await ana(`/datos/equipos/${equipo}/miembros/${ana.id}`, { method: 'DELETE' });
    expect(sale.status).toBe(403);
    expect((await json<{ error: string }>(sale)).error).toBe('es_dueno');
    // Beto se sale y deja de ver el video y el equipo.
    expect((await beto(`/datos/equipos/${equipo}/miembros/${beto.id}`, { method: 'DELETE' })).status).toBe(
      200,
    );
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    expect((await beto(`/datos/equipos/${equipo}`)).status).toBe(404);
    expect((await json<{ equipos: unknown[] }>(await beto('/datos/equipos'))).equipos).toEqual([]);
    // Vuelve a entrar y Ana (admin) lo quita.
    const { enlace } = await invitar(ana, equipo, 'beto@example.com');
    await beto('/datos/equipos/unirse', { method: 'POST', json: { token: tokenDe(enlace) } });
    expect((await beto(`/datos/videos/${video}`)).status).toBe(200);
    expect((await ana(`/datos/equipos/${equipo}/miembros/${beto.id}`, { method: 'DELETE' })).status).toBe(
      200,
    );
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
  });

  it('borrar el equipo: solo el dueño, y los videos siguen intactos', async () => {
    const { ana, beto, equipo } = await equipoConBeto();
    const video = await videoPrivado(ana);
    await ana(`/datos/equipos/${equipo}/videos`, { method: 'POST', json: { video_id: video } });
    expect((await beto(`/datos/equipos/${equipo}`, { method: 'DELETE' })).status).toBe(403);
    expect((await ana(`/datos/equipos/${equipo}`, { method: 'DELETE' })).status).toBe(200);
    expect((await ana(`/datos/equipos/${equipo}`)).status).toBe(404);
    expect((await beto(`/datos/videos/${video}`)).status).toBe(404);
    // El video y su archivo siguen ahí para su autora.
    expect((await ana(`/datos/videos/${video}`)).status).toBe(200);
    expect(env.BUCKET.objetos.has(`videos/${video}/video`)).toBe(true);
    for (const t of ['equipos', 'miembros_equipo', 'invitaciones_equipo', 'videos_equipo'])
      expect((env.DB.crudo.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n).toBe(0);
  });

  it('mirar no escribe en la base: ver el equipo y un video compartido no suma filas', async () => {
    const { ana, beto, equipo } = await equipoConBeto();
    const video = await videoPrivado(ana);
    await ana(`/datos/equipos/${equipo}/videos`, { method: 'POST', json: { video_id: video } });
    const cambios = () => (env.DB.crudo.prepare('SELECT total_changes() AS n').get() as { n: number }).n;
    const antes = cambios();
    await beto(`/datos/equipos/${equipo}`);
    await beto('/datos/equipos');
    await beto(`/datos/videos/${video}`);
    await beto(`/media/${video}/miniatura`);
    expect(cambios()).toBe(antes);
  });
});
