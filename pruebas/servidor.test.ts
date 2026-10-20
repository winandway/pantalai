import { beforeEach, describe, expect, it } from 'vitest';
import app, { PARTE_MIN } from '../servidor/app';
import { almacenFalso, baseFalsa } from './falsos';

type Env = {
  DB: D1Database;
  BUCKET: ReturnType<typeof almacenFalso>;
  TURNSTILE_SECRET?: string;
  COBRO_ACTIVO?: string;
  SUPERADMIN_CORREOS?: string;
  SUPERADMIN_RUTA?: string;
};
let env: Env;

beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso() };
});

function cliente(ip = '1.1.1.1') {
  let cookie = '';
  return async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
    const h = new Headers(init.headers);
    h.set('cf-connecting-ip', ip);
    if (cookie) h.set('cookie', cookie);
    if (init.method && init.method !== 'GET' && !h.has('x-pantalai')) h.set('x-pantalai', '1');
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

async function registrado(nombre = 'Ana', correo = 'ana@example.com', ip = '1.1.1.1') {
  const c = cliente(ip);
  const r = await c('/datos/registro', { method: 'POST', json: { nombre, correo, clave: 'clave-segura-1' } });
  expect(r.status).toBe(201);
  return c;
}

async function videoListo(c: ReturnType<typeof cliente>, bytes = PARTE_MIN + 1000) {
  const r = await c('/datos/videos', {
    method: 'POST',
    json: { tipo: 'video/webm;codecs=vp9', ancho: 1280, alto: 720 },
  });
  const { id } = (await r.json()) as { id: string };
  const datos = new Uint8Array(bytes).map((_, i) => i % 251);
  const p1 = await (
    await c(`/datos/videos/${id}/partes/1`, { method: 'PUT', body: datos.slice(0, PARTE_MIN) })
  ).json();
  const p2 = await (
    await c(`/datos/videos/${id}/partes/2`, { method: 'PUT', body: datos.slice(PARTE_MIN) })
  ).json();
  const fin = await c(`/datos/videos/${id}/completar`, {
    method: 'POST',
    json: {
      partes: [(p2 as { parte: object }).parte, (p1 as { parte: object }).parte],
      duracion: 42,
      transcripcion: [{ inicio: 0, fin: 3, texto: 'Hello there.' }],
    },
  });
  expect(fin.status).toBe(200);
  return { id, datos };
}

describe('cuentas', () => {
  it('registra, entra, dice quién soy y cierra sesión de verdad', async () => {
    const c = await registrado();
    const yo = (await (await c('/datos/yo')).json()) as { usuario: { correo: string } };
    expect(yo.usuario.correo).toBe('ana@example.com');
    await c('/datos/salir', { method: 'POST' });
    const despues = (await (await c('/datos/yo')).json()) as { usuario: null };
    expect(despues.usuario).toBeNull();
    // La sesión se borró en la base, no solo la cookie.
    const filas = (
      env.DB as unknown as { crudo: { prepare: (s: string) => { get: () => { n: number } } } }
    ).crudo
      .prepare('SELECT COUNT(*) AS n FROM sesiones')
      .get();
    expect(filas.n).toBe(0);
  });

  it('nunca guarda la contraseña en claro', async () => {
    await registrado();
    const fila = (
      env.DB as unknown as { crudo: { prepare: (s: string) => { get: () => Record<string, string> } } }
    ).crudo
      .prepare('SELECT * FROM usuarios')
      .get();
    expect(JSON.stringify(fila)).not.toContain('clave-segura-1');
    expect(fila.clave_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rechaza correo repetido y contraseña equivocada', async () => {
    await registrado();
    const c = cliente('2.2.2.2');
    const otra = await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'B', correo: 'ana@example.com', clave: 'otra-clave-1' },
    });
    expect(otra.status).toBe(409);
    const mal = await c('/datos/entrar', {
      method: 'POST',
      json: { correo: 'ana@example.com', clave: 'equivocada' },
    });
    expect(mal.status).toBe(401);
    const bien = await c('/datos/entrar', {
      method: 'POST',
      json: { correo: 'ANA@example.com', clave: 'clave-segura-1' },
    });
    expect(bien.status).toBe(200);
  });

  it('limita los intentos de entrar', async () => {
    await registrado();
    const c = cliente('9.9.9.9');
    let ultimo = 0;
    for (let i = 0; i < 11; i++) {
      ultimo = (
        await c('/datos/entrar', { method: 'POST', json: { correo: 'ana@example.com', clave: 'mala' } })
      ).status;
    }
    expect(ultimo).toBe(429);
  });

  it('exige el escudo anti-robots cuando está configurado', async () => {
    env.TURNSTILE_SECRET = 'secreto';
    const c = cliente();
    const r = await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'A', correo: 'a@example.com', clave: 'clave-segura-1' },
    });
    expect(r.status).toBe(403);
  });

  it('bloquea escrituras sin la cabecera propia (otro sitio no puede mandar formularios)', async () => {
    const c = await registrado();
    const r = await c('/datos/carpetas', {
      method: 'POST',
      json: { nombre: 'X' },
      headers: { 'x-pantalai': '0' },
    });
    expect(r.status).toBe(403);
  });
});

describe('videos', () => {
  it('sube por partes en desorden y arma el archivo exacto', async () => {
    const c = await registrado();
    const { id, datos } = await videoListo(c);
    const guardado = env.BUCKET.objetos.get(`videos/${id}/video`)!;
    expect(guardado.datos.length).toBe(datos.length);
    expect(guardado.datos[PARTE_MIN + 10]).toBe(datos[PARTE_MIN + 10]);
    expect(guardado.tipo).toBe('video/webm');
    const v = (await (await c(`/datos/videos/${id}`)).json()) as {
      video: { estado: string; duracion: number; transcripcion: unknown[] };
    };
    expect(v.video.estado).toBe('listo');
    expect(v.video.duracion).toBe(42);
    expect(v.video.transcripcion).toHaveLength(1);
  });

  it('sirve el video por rangos (para poder adelantar)', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const r = await c(`/media/${id}/video`, { headers: { range: 'bytes=0-99' } });
    expect(r.status).toBe(206);
    expect(r.headers.get('content-range')).toBe(`bytes 0-99/${PARTE_MIN + 1000}`);
    expect((await r.arrayBuffer()).byteLength).toBe(100);
  });

  it('CANDADO privacidad: un video privado no lo ve nadie más, ni sus datos ni el archivo', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    await c(`/datos/videos/${id}`, { method: 'PATCH', json: { privacidad: 'privado' } });
    const ajeno = cliente('3.3.3.3');
    expect((await ajeno(`/datos/videos/${id}`)).status).toBe(404);
    expect((await ajeno(`/media/${id}/video`)).status).toBe(404);
    expect((await ajeno(`/datos/videos/${id}/actividad`)).status).toBe(404);
    expect((await c(`/media/${id}/video`)).status).toBe(200);
    // Y el video nunca queda guardado en memorias compartidas.
    expect((await c(`/media/${id}/video`)).headers.get('cache-control')).toContain('no-store');
  });

  it('CANDADO dueño: nadie más puede editar, borrar ni ver estadísticas', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const otro = await registrado('Beto', 'beto@example.com', '4.4.4.4');
    expect((await otro(`/datos/videos/${id}`, { method: 'PATCH', json: { titulo: 'robado' } })).status).toBe(
      404,
    );
    expect((await otro(`/datos/videos/${id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await otro(`/datos/videos/${id}/estadisticas`)).status).toBe(404);
    expect(
      (await otro(`/datos/videos/${id}/partes/3`, { method: 'PUT', body: new Uint8Array(10) })).status,
    ).toBe(404);
  });

  it('edita con lista cerrada de campos y valida lo que entra', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const ok = await c(`/datos/videos/${id}`, {
      method: 'PATCH',
      json: {
        titulo: 'Nuevo',
        cortes: [{ inicio: 1, fin: 2 }],
        cta_texto: 'Book',
        cta_url: 'https://example.com',
        permitir_descarga: false,
      },
    });
    expect(ok.status).toBe(200);
    const v = (
      (await ok.json()) as { video: { titulo: string; cortes: unknown[]; permitir_descarga: boolean } }
    ).video;
    expect(v.titulo).toBe('Nuevo');
    expect(v.cortes).toHaveLength(1);
    expect(v.permitir_descarga).toBe(false);
    expect(
      (await c(`/datos/videos/${id}`, { method: 'PATCH', json: { cta_url: 'javascript:alert(1)' } })).status,
    ).toBe(400);
    expect((await c(`/datos/videos/${id}`, { method: 'PATCH', json: { usuario_id: 'otro' } })).status).toBe(
      200,
    );
    const fila = (await (await c(`/datos/videos/${id}`)).json()) as { video: { es_dueno: boolean } };
    expect(fila.video.es_dueno).toBe(true);
  });

  it('CANDADO MP4: la copia MP4 se sube por partes, se reproduce primero y es la que se descarga', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    let v = ((await (await c(`/datos/videos/${id}`)).json()) as { video: { tiene_mp4: boolean } }).video;
    expect(v.tiene_mp4).toBe(false);
    expect((await c(`/media/${id}/video?formato=mp4`)).status).toBe(404);
    // Sin MP4, descargar entrega el original.
    expect((await c(`/media/${id}/video?descargar=1`)).headers.get('content-disposition')).toContain('.webm');
    const ini = (await (await c(`/datos/videos/${id}/mp4`, { method: 'POST' })).json()) as { ya: boolean };
    expect(ini.ya).toBe(false);
    const datos = new Uint8Array(PARTE_MIN + 10).fill(7);
    const p1 = (
      (await (
        await c(`/datos/videos/${id}/mp4/partes/1`, { method: 'PUT', body: datos.slice(0, PARTE_MIN) })
      ).json()) as { parte: object }
    ).parte;
    const p2 = (
      (await (
        await c(`/datos/videos/${id}/mp4/partes/2`, { method: 'PUT', body: datos.slice(PARTE_MIN) })
      ).json()) as { parte: object }
    ).parte;
    expect(
      (await c(`/datos/videos/${id}/mp4/completar`, { method: 'POST', json: { partes: [p2, p1] } })).status,
    ).toBe(200);
    v = ((await (await c(`/datos/videos/${id}`)).json()) as { video: { tiene_mp4: boolean } }).video;
    expect(v.tiene_mp4).toBe(true);
    const mp4 = await c(`/media/${id}/video?formato=mp4`, { headers: { range: 'bytes=0-9' } });
    expect(mp4.status).toBe(206);
    expect(mp4.headers.get('content-range')).toBe(`bytes 0-9/${PARTE_MIN + 10}`);
    const desc = await c(`/media/${id}/video?descargar=1`);
    expect(desc.headers.get('content-type')).toBe('video/mp4');
    expect(desc.headers.get('content-disposition')).toMatch(/filename="[^"]+\.mp4"; filename\*=UTF-8''/);
    // El original sigue disponible.
    expect(
      (await c(`/media/${id}/video?descargar=1&formato=webm`)).headers.get('content-disposition'),
    ).toContain('.webm');
    // Una segunda vez no rehace nada; y nadie más puede subir la copia.
    expect(
      ((await (await c(`/datos/videos/${id}/mp4`, { method: 'POST' })).json()) as { ya: boolean }).ya,
    ).toBe(true);
    const otro = await registrado('Beto', 'beto@example.com', '4.4.4.4');
    expect((await otro(`/datos/videos/${id}/mp4`, { method: 'POST' })).status).toBe(404);
    // Borrar el video borra también la copia.
    await c(`/datos/videos/${id}`, { method: 'DELETE' });
    expect(env.BUCKET.objetos.has(`videos/${id}/video.mp4`)).toBe(false);
  });

  it('CANDADO C-RECORTE-DESCARGA: si el dueño corta las puntas, la copia MP4 se vuelve a armar con ese recorte', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const subirCopia = async () => {
      const ini = (await (await c(`/datos/videos/${id}/mp4`, { method: 'POST' })).json()) as {
        ya: boolean;
        recorte_inicio?: number;
        recorte_fin?: number;
      };
      if (ini.ya) return ini;
      const p1 = (
        (await (
          await c(`/datos/videos/${id}/mp4/partes/1`, { method: 'PUT', body: new Uint8Array(10).fill(1) })
        ).json()) as { parte: object }
      ).parte;
      await c(`/datos/videos/${id}/mp4/completar`, { method: 'POST', json: { partes: [p1] } });
      return ini;
    };
    const tiene = async () =>
      ((await (await c(`/datos/videos/${id}`)).json()) as { video: { tiene_mp4: boolean } }).video.tiene_mp4;
    expect((await subirCopia()).recorte_inicio).toBe(0);
    expect(await tiene()).toBe(true);
    // Cortar las puntas deja la copia vieja sin valor: no se descarga, y el navegador la rehace con el recorte nuevo.
    const r = await c(`/datos/videos/${id}`, {
      method: 'PATCH',
      json: { recorte_inicio: 1.5, recorte_fin: 4 },
    });
    expect(((await r.json()) as { video: { tiene_mp4: boolean } }).video.tiene_mp4).toBe(false);
    expect((await c(`/media/${id}/video?formato=mp4`)).status).toBe(404);
    const ini = await subirCopia();
    expect(ini).toMatchObject({ ya: false, recorte_inicio: 1.5, recorte_fin: 4 });
    expect(await tiene()).toBe(true);
    expect((await c(`/media/${id}/video?descargar=1`)).headers.get('content-type')).toBe('video/mp4');
    // Sin cambios, no se rehace.
    expect((await subirCopia()).ya).toBe(true);
  });

  it('CANDADO C-PLANES: con el cobro apagado nada limita; encendido, Starter tiene 25 videos, sin IA y con marca', async () => {
    const c = await registrado();
    const nuevo = () => c('/datos/videos', { method: 'POST', json: { tipo: 'video/webm' } });
    const plan = async () =>
      (await (await c('/datos/plan')).json()) as {
        plan: string;
        cobro_activo: boolean;
        limites: { videos: number | null; ia: boolean; marca: boolean; calidad: string };
      };
    // Apagado (como hoy): todo permitido.
    expect(await plan()).toMatchObject({
      plan: 'starter',
      cobro_activo: false,
      limites: { videos: null, ia: true },
    });
    for (let i = 0; i < 26; i++) expect((await nuevo()).status).toBe(201);
    // Encendido: Starter.
    env.COBRO_ACTIVO = '1';
    expect((await plan()).limites).toMatchObject({ videos: 25, ia: false, marca: true, calidad: '720' });
    const r = await nuevo();
    expect(r.status).toBe(402);
    expect(((await r.json()) as { error: string }).error).toBe('limite_videos');
    // La IA de análisis pide Business + AI.
    env.COBRO_ACTIVO = '';
    const v = await videoListo(c);
    env.COBRO_ACTIVO = '1';
    expect((await c(`/datos/videos/${v.id}/ia/analizar`, { method: 'POST' })).status).toBe(402);
    const pagina = (await (await c(`/datos/videos/${v.id}`)).json()) as { video: { marca: boolean } };
    expect(pagina.video.marca).toBe(true);
    // Con Business + AI pagado: sin límites ni marca.
    const yo = (await (await c('/datos/yo')).json()) as { usuario: { id: string } };
    await env.DB.prepare('INSERT INTO suscripciones (usuario_id, plan, actualizado) VALUES (?, ?, ?)')
      .bind(yo.usuario.id, 'business_ia', Date.now())
      .run();
    expect((await plan()).limites).toMatchObject({ videos: null, ia: true, marca: false, calidad: '2160' });
    expect((await nuevo()).status).toBe(201);
  });

  it('el nombre del archivo descargado aguanta tildes y letras de otros idiomas', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    await c(`/datos/videos/${id}`, { method: 'PATCH', json: { titulo: 'Grabación de 日本 ñandú' } });
    const r = await c(`/media/${id}/video?descargar=1`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-disposition')).toContain(
      encodeURIComponent('Grabación de 日本 ñandú.webm'),
    );
  });

  it('descarga solo si el dueño la permite', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    await c(`/datos/videos/${id}`, { method: 'PATCH', json: { permitir_descarga: false } });
    const ajeno = cliente('5.5.5.5');
    expect((await ajeno(`/media/${id}/video?descargar=1`)).status).toBe(403);
    const propia = await c(`/media/${id}/video?descargar=1`);
    expect(propia.headers.get('content-disposition')).toContain('attachment');
  });

  it('borra el video, su archivo y su actividad', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    await c(`/datos/videos/${id}/comentarios`, { method: 'POST', json: { texto: 'Hola', segundo: 1 } });
    expect((await c(`/datos/videos/${id}`, { method: 'DELETE' })).status).toBe(200);
    expect(env.BUCKET.objetos.has(`videos/${id}/video`)).toBe(false);
    expect((await c(`/datos/videos/${id}`)).status).toBe(404);
  });

  it('cancelar una grabación borra el video a medias', async () => {
    const c = await registrado();
    const { id } = (await (await c('/datos/videos', { method: 'POST', json: {} })).json()) as { id: string };
    expect((await c(`/datos/videos/${id}/cancelar`, { method: 'POST' })).status).toBe(200);
    expect((await c(`/datos/videos/${id}`)).status).toBe(404);
  });

  it('duplica con su archivo', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const r = (await (await c(`/datos/videos/${id}/duplicar`, { method: 'POST' })).json()) as { id: string };
    expect(env.BUCKET.objetos.has(`videos/${r.id}/video`)).toBe(true);
    const v = (await (await c(`/datos/videos/${r.id}`)).json()) as { video: { titulo: string } };
    expect(v.video.titulo).toContain('(copy)');
  });

  it('biblioteca: busca en la transcripción, filtra por carpeta y por archivo', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const { carpeta } = (await (
      await c('/datos/carpetas', { method: 'POST', json: { nombre: 'Clientes' } })
    ).json()) as { carpeta: { id: string } };
    await c(`/datos/videos/${id}`, { method: 'PATCH', json: { carpeta_id: carpeta.id } });
    const lista = async (q: string) =>
      ((await (await c(`/datos/videos?${q}`)).json()) as { videos: unknown[] }).videos.length;
    expect(await lista('q=hello')).toBe(1);
    expect(await lista('q=nada')).toBe(0);
    expect(await lista(`carpeta=${carpeta.id}`)).toBe(1);
    await c(`/datos/videos/${id}`, { method: 'PATCH', json: { archivado: true } });
    expect(await lista('')).toBe(0);
    expect(await lista('archivo=1')).toBe(1);
    // Borrar la carpeta no borra sus videos.
    await c(`/datos/carpetas/${carpeta.id}`, { method: 'DELETE' });
    expect(await lista('archivo=1')).toBe(1);
  });

  it('no deja mover un video a la carpeta de otro', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const otro = await registrado('Beto', 'beto@example.com', '4.4.4.4');
    const { carpeta } = (await (
      await otro('/datos/carpetas', { method: 'POST', json: { nombre: 'Suya' } })
    ).json()) as { carpeta: { id: string } };
    expect(
      (await c(`/datos/videos/${id}`, { method: 'PATCH', json: { carpeta_id: carpeta.id } })).status,
    ).toBe(400);
  });
});

describe('actividad y estadísticas', () => {
  it('cuenta vistas únicas, completas y clics; el dueño no suma', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const visitante = cliente('6.6.6.6');
    await visitante(`/datos/videos/${id}/vista`, {
      method: 'POST',
      json: { visitante: 'abcdefgh01', segundos: 40, completado: true, cta: true },
    });
    await visitante(`/datos/videos/${id}/vista`, {
      method: 'POST',
      json: { visitante: 'abcdefgh01', segundos: 10 },
    });
    await visitante(`/datos/videos/${id}/vista`, {
      method: 'POST',
      json: { visitante: 'abcdefgh02', segundos: 20 },
    });
    await c(`/datos/videos/${id}/vista`, { method: 'POST', json: { visitante: 'duenoxxxx1', segundos: 42 } });
    const e = (
      (await (await c(`/datos/videos/${id}/estadisticas`)).json()) as { estadisticas: Record<string, number> }
    ).estadisticas;
    expect(e.vistas).toBe(2);
    expect(e.promedio_segundos).toBe(30);
    expect(e.completado_pct).toBe(50);
    expect(e.cta_clics).toBe(1);
  });

  it('comentarios: anónimo con nombre, se pueden apagar, y solo el dueño o el autor borran', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    const anon = cliente('7.7.7.7');
    expect(
      (await anon(`/datos/videos/${id}/comentarios`, { method: 'POST', json: { texto: 'sin nombre' } }))
        .status,
    ).toBe(400);
    const r = await anon(`/datos/videos/${id}/comentarios`, {
      method: 'POST',
      json: { nombre: 'Ana', texto: 'Hola', segundo: 3 },
    });
    expect(r.status).toBe(201);
    const { comentario } = (await r.json()) as { comentario: { id: string } };
    const otro = await registrado('Beto', 'beto@example.com', '4.4.4.4');
    expect(
      (await otro(`/datos/videos/${id}/comentarios/${comentario.id}`, { method: 'DELETE' })).status,
    ).toBe(404);
    expect((await c(`/datos/videos/${id}/comentarios/${comentario.id}`, { method: 'DELETE' })).status).toBe(
      200,
    );
    await c(`/datos/videos/${id}`, { method: 'PATCH', json: { permitir_comentarios: false } });
    expect(
      (
        await anon(`/datos/videos/${id}/comentarios`, {
          method: 'POST',
          json: { nombre: 'Ana', texto: 'Hola' },
        })
      ).status,
    ).toBe(403);
  });

  it('reacciones solo con los emojis de la lista', async () => {
    const c = await registrado();
    const { id } = await videoListo(c);
    expect(
      (await c(`/datos/videos/${id}/reacciones`, { method: 'POST', json: { emoji: '🔥', segundo: 2 } }))
        .status,
    ).toBe(201);
    expect(
      (await c(`/datos/videos/${id}/reacciones`, { method: 'POST', json: { emoji: '<b>', segundo: 2 } }))
        .status,
    ).toBe(400);
  });
});

describe('páginas y salud', () => {
  it('salud dice ok con base y almacén', async () => {
    const r = await cliente()('/datos/salud');
    expect(r.status).toBe(200);
    expect(((await r.json()) as { ok: boolean }).ok).toBe(true);
  });

  it('salud dice error si la base falla', async () => {
    env.DB = {
      prepare: () => ({ first: async () => Promise.reject(new Error('caída')) }),
    } as unknown as D1Database;
    const r = await cliente()('/datos/salud');
    expect(r.status).toBe(500);
  });

  it('pone cabeceras de seguridad y deja insertar solo el reproductor', async () => {
    const pagina = await cliente()('/library');
    expect(pagina.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(pagina.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
    const embebido = await cliente()('/embed/abc');
    expect(embebido.headers.get('x-frame-options')).toBeNull();
    expect(embebido.headers.get('content-security-policy')).toContain('frame-ancestors *');
  });

  it('CANDADO portada segura: la portada pasa por el programa y lleva las cabeceras, aunque la página base redirija', async () => {
    const pedidos: string[] = [];
    (env as unknown as { ASSETS: Fetcher }).ASSETS = {
      fetch: async (r: Request | string) => {
        const u = new URL(typeof r === 'string' ? r : r.url);
        pedidos.push(u.pathname);
        if (u.pathname === '/app.html')
          return new Response(null, { status: 307, headers: { location: '/app' } });
        if (u.pathname === '/app') return new Response('<html><title>PANTALAI</title></html>');
        return new Response('no', { status: 404 });
      },
    } as unknown as Fetcher;
    const r = await cliente()('/');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('<title>PANTALAI');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(r.headers.get('strict-transport-security')).toContain('max-age');
    expect(pedidos).toEqual(['/', '/app.html', '/app']);
  });

  it('las rutas de datos desconocidas dan 404 en JSON', async () => {
    const r = await cliente()('/datos/nada');
    expect(r.status).toBe(404);
  });
});

describe('CANDADO C-SUPERADMIN: panel en dirección secreta, solo para las cuentas de la lista', () => {
  const RUTA = '/panel/prueba-secreta-1234567';
  const conPanel = { headers: { 'x-panel': RUTA } };

  it('sin la dirección secreta, el panel no existe para nadie (ni para el superadmin)', async () => {
    env = { ...env, SUPERADMIN_CORREOS: 'soporte@example.com' } as typeof env;
    const admin = await registrado('Soporte Pantalay', 'soporte@example.com', '2.2.2.2');
    expect((await admin('/datos/admin/resumen', conPanel)).status).toBe(404);
    expect(((await (await admin('/datos/yo')).json()) as { panel: string | null }).panel).toBeNull();
  });

  it('la puerta: dirección secreta + cuenta de la lista + cabecera; todo lo demás es 404 y queda anotado', async () => {
    env = { ...env, SUPERADMIN_CORREOS: 'soporte@example.com', SUPERADMIN_RUTA: RUTA } as typeof env;
    const ana = await registrado('Ana', 'ana@example.com', '1.1.1.1');
    const { id } = await videoListo(ana);
    await ana(`/datos/videos/${id}`, { method: 'PATCH', json: { privacidad: 'privado' } });

    // La vieja /admin y cualquier otra dirección bajo /panel: 404, como una página que no existe.
    expect((await cliente('7.7.7.7')('/admin')).status).toBe(404);
    expect((await cliente('7.7.7.7')('/panel/otra-cosa-cualquiera')).status).toBe(404);
    expect((await cliente('7.7.7.7')(RUTA)).status).toBe(404);
    expect((await ana(RUTA)).status).toBe(404);
    // Los datos: sin sesión, cuenta normal, o superadmin sin la cabecera correcta → 404.
    expect((await cliente('7.7.7.7')('/datos/admin/resumen', conPanel)).status).toBe(404);
    expect((await ana('/datos/admin/resumen', conPanel)).status).toBe(404);
    expect(((await (await ana('/datos/yo')).json()) as { panel: string | null }).panel).toBeNull();

    const admin = await registrado('Soporte Pantalay', 'Soporte@Example.com', '2.2.2.2');
    expect((await admin('/datos/admin/resumen')).status).toBe(404);
    expect((await admin('/datos/admin/resumen', { headers: { 'x-panel': '/admin' } })).status).toBe(404);
    // Al entrar, el servidor le dice adónde ir.
    const entrar = await cliente('2.2.2.3')('/datos/entrar', {
      method: 'POST',
      json: { correo: 'soporte@example.com', clave: 'clave-segura-1' },
    });
    expect(((await entrar.json()) as { panel: string }).panel).toBe(RUTA);
    const pagina = await admin(RUTA);
    expect(pagina.status).toBe(200);
    expect(pagina.headers.get('referrer-policy')).toBe('no-referrer');
    expect(pagina.headers.get('x-robots-tag')).toContain('noindex');

    const r = (await (await admin('/datos/admin/resumen', conPanel)).json()) as {
      usuarios: number;
      videos: number;
      planes: Record<string, number>;
      registro: { accion: string; objetivo: string }[];
    };
    expect(r).toMatchObject({ usuarios: 2, videos: 1, planes: { starter: 2 } });
    // Los intentos de antes quedaron anotados.
    expect(r.registro.filter((x) => x.accion === 'intento').length).toBeGreaterThanOrEqual(6);
    // …y la dirección secreta nunca queda escrita en el registro.
    expect(JSON.stringify(r.registro)).not.toContain(RUTA);

    const u = (await (await admin('/datos/admin/usuarios?q=ana', conPanel)).json()) as {
      usuarios: { correo: string; plan: string; videos: number }[];
    };
    expect(u.usuarios).toEqual([
      expect.objectContaining({ correo: 'ana@example.com', plan: 'starter', videos: 1 }),
    ]);
    const v = (await (await admin('/datos/admin/videos', conPanel)).json()) as {
      videos: { id: string; privacidad: string; firma: string }[];
    };
    expect(v.videos[0]).toMatchObject({ id, privacidad: 'privado' });
    // El video privado se ve SOLO con la firma del panel; la sesión sola no alcanza.
    expect((await admin(`/media/${id}/video`)).status).toBe(404);
    expect((await admin(`/media/${id}/video?panel=${v.videos[0]!.firma}`)).status).toBe(200);
    expect((await cliente('8.8.8.8')(`/media/${id}/video?panel=${v.videos[0]!.firma}`)).status).toBe(404);

    await admin(`/datos/admin/videos/${id}/visto`, { method: 'POST', ...conPanel });
    await ana(`/datos/videos/${id}`, { method: 'PATCH', json: { privacidad: 'enlace' } });
    expect((await admin(`/datos/admin/videos/${id}/privado`, { method: 'POST', ...conPanel })).status).toBe(
      200,
    );
    const fin = (await (await admin('/datos/admin/resumen', conPanel)).json()) as {
      registro: { accion: string }[];
    };
    expect(fin.registro.slice(0, 2).map((x) => x.accion)).toEqual(['hacer_privado', 'ver_video']);
  });
});
