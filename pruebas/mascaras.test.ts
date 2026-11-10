// CANDADO C-MASCARAS (fase 3): máscaras del Estudio guardadas por cuenta. Solo el dueño las ve y las cambia; zod cuida
// cada campo; el logo se guarda en el almacén solo si sus bytes son de verdad PNG, JPEG o WebP y no pesa de más; hay un
// tope por cuenta; mirar no escribe y guardar entra en su presupuesto de filas; y lo puro (colores, letras legibles,
// el podcast de siempre intacto) hace lo que dice.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import {
  CAMBIOS_MASCARA_MAX,
  LOGO_MAX,
  MAX_MASCARAS,
  PRESUPUESTO_FILAS_MASCARA,
  claveLogo,
  tipoDeImagen,
} from '../servidor/mascaras';
import { armarMascara } from '../web/src/logica/estudio';
import {
  ELECCION_DEFECTO,
  claseMascara,
  contraste,
  datosParaGuardar,
  letraSobre,
  pocoContraste,
  variablesEscenario,
  vistaDeDatos,
  vistaDePlantilla,
  vistaElegida,
  type MascaraGuardada,
} from '../web/src/logica/mascaras';
import { almacenFalso, baseFalsa } from './falsos';

type Env = { DB: ReturnType<typeof baseFalsa>; BUCKET: ReturnType<typeof almacenFalso> };
let env: Env;

beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso() };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }));
});
afterEach(() => vi.restoreAllMocks());

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

async function cuenta(nombre: string, correo: string, ip = '1.1.1.1'): Promise<Cliente> {
  const c = cliente(ip);
  const r = await c('/datos/registro', { method: 'POST', json: { nombre, correo, clave: 'clave-segura-1' } });
  expect(r.status).toBe(201);
  await new Promise((ok) => setTimeout(ok, 10));
  return c;
}

const DATOS = {
  nombre: 'Friday show',
  estilo: 'noticiero',
  programa: 'Morning Show',
  anfitrion: 'Alex',
  rol: 'Presenter',
  principal: '#ff7a00',
  secundario: '#1d4ed8',
  fondo: '#1030a0',
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const cambios = () => (env.DB.crudo.prepare('SELECT total_changes() AS n').get() as { n: number }).n;

async function crear(c: Cliente, datos: unknown = DATOS) {
  const r = await c('/datos/estudio/mascaras', { method: 'POST', json: datos });
  return { r, m: r.ok ? ((await r.json()) as { mascara: MascaraGuardada }).mascara : null };
}

describe('máscaras del Estudio (servidor)', () => {
  it('se guardan por cuenta, vuelven en la lista y se cambian', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    const { r, m } = await crear(ana);
    expect(r.status).toBe(201);
    expect(m).toMatchObject({ ...DATOS, logo: null });
    expect(m!.id).toMatch(/^[a-z0-9]{12}$/);

    const lista = (await (await ana('/datos/estudio/mascaras')).json()) as {
      mascaras: MascaraGuardada[];
      maximo: number;
    };
    expect(lista.maximo).toBe(MAX_MASCARAS);
    expect(lista.mascaras).toHaveLength(1);
    expect(lista.mascaras[0]).toMatchObject(DATOS);

    const p = await ana(`/datos/estudio/mascaras/${m!.id}`, {
      method: 'PUT',
      json: { ...DATOS, programa: 'Night Show', estilo: 'minimal' },
    });
    expect(p.status).toBe(200);
    expect(((await p.json()) as { mascara: MascaraGuardada }).mascara).toMatchObject({
      programa: 'Night Show',
      estilo: 'minimal',
    });
  });

  it('pide sesión, y otra cuenta no ve, no cambia ni borra la máscara ajena', async () => {
    const sin = cliente('3.3.3.3');
    expect((await sin('/datos/estudio/mascaras')).status).toBe(401);
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    const { m } = await crear(ana);
    const beto = await cuenta('Beto Ruiz', 'beto@example.com', '2.2.2.2');
    const suyas = (await (await beto('/datos/estudio/mascaras')).json()) as { mascaras: unknown[] };
    expect(suyas.mascaras).toHaveLength(0);
    expect((await beto(`/datos/estudio/mascaras/${m!.id}`, { method: 'PUT', json: DATOS })).status).toBe(404);
    expect((await beto(`/datos/estudio/mascaras/${m!.id}`, { method: 'DELETE' })).status).toBe(404);
    expect(
      (
        await beto(`/datos/estudio/mascaras/${m!.id}/logo`, {
          method: 'PUT',
          body: PNG as unknown as BodyInit,
          headers: { 'content-type': 'image/png' },
        })
      ).status,
    ).toBe(404);
  });

  it('zod: colores, estilo y largos fuera de regla se rechazan', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    for (const malo of [
      { ...DATOS, principal: 'red' },
      { ...DATOS, fondo: '#12345' },
      { ...DATOS, estilo: 'otro' },
      { ...DATOS, nombre: '' },
      { ...DATOS, programa: 'x'.repeat(41) },
      { ...DATOS, principal: 'url(javascript:alert(1))' },
    ])
      expect((await crear(ana, malo)).r.status).toBe(400);
  });

  it(`tope de ${MAX_MASCARAS} máscaras por cuenta`, async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    for (let i = 0; i < MAX_MASCARAS; i++) expect((await crear(ana)).r.status).toBe(201);
    const r = await crear(ana);
    expect(r.r.status).toBe(409);
    expect(await r.r.json()).toEqual({ error: 'demasiadas_mascaras' });
  });

  it('el logo: solo PNG, JPEG o WebP de verdad, con tope de peso; lo ve solo el dueño; se quita y se borra', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    const { m } = await crear(ana);
    const subir = (body: Uint8Array, tipo = 'image/png') =>
      ana(`/datos/estudio/mascaras/${m!.id}/logo`, {
        method: 'PUT',
        body: body as unknown as BodyInit,
        headers: { 'content-type': tipo },
      });
    // Un SVG o un HTML disfrazado de PNG no entra (se miran los bytes, no la cabecera).
    expect((await subir(new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).status).toBe(400);
    expect((await subir(new TextEncoder().encode('<html><script>1</script>'))).status).toBe(400);
    expect((await subir(new Uint8Array(0))).status).toBe(413);
    const grande = new Uint8Array(LOGO_MAX + 1);
    grande.set(PNG);
    expect((await subir(grande)).status).toBe(413);

    const r = await subir(PNG, 'text/html');
    expect(r.status).toBe(200);
    const con = ((await r.json()) as { mascara: MascaraGuardada }).mascara;
    expect(con.logo).toMatch(new RegExp(`^/media/mascaras/${m!.id}/logo\\?v=\\d+$`));
    const clave = claveLogo(
      ((await (await ana('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id,
      m!.id,
    );
    // Se guarda con el tipo REAL, no con el que dijo la petición.
    expect(env.BUCKET.objetos.get(clave)?.tipo).toBe('image/png');

    const ver = await ana(con.logo!);
    expect(ver.status).toBe(200);
    expect(ver.headers.get('content-type')).toBe('image/png');
    expect(ver.headers.get('x-content-type-options')).toBe('nosniff');
    const beto = await cuenta('Beto Ruiz', 'beto@example.com', '2.2.2.2');
    expect((await beto(con.logo!)).status).toBe(404);
    expect((await cliente('4.4.4.4')(con.logo!)).status).toBe(404);

    const q = await ana(`/datos/estudio/mascaras/${m!.id}/logo`, { method: 'DELETE' });
    expect(((await q.json()) as { mascara: MascaraGuardada }).mascara.logo).toBeNull();
    expect(env.BUCKET.objetos.has(clave)).toBe(false);

    await subir(PNG);
    expect(env.BUCKET.objetos.has(clave)).toBe(true);
    expect((await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'DELETE' })).status).toBe(200);
    expect(env.BUCKET.objetos.has(clave)).toBe(false);
    expect(((await (await ana('/datos/estudio/mascaras')).json()) as { mascaras: [] }).mascaras).toHaveLength(
      0,
    );
  });

  it('borrar la cuenta se lleva sus máscaras y sus logos', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    const { m } = await crear(ana);
    const id = ((await (await ana('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id as string;
    await ana(`/datos/estudio/mascaras/${m!.id}/logo`, {
      method: 'PUT',
      body: PNG as unknown as BodyInit,
      headers: { 'content-type': 'image/png' },
    });
    const r = await ana('/datos/cuenta/borrar', { method: 'POST', json: { clave: 'clave-segura-1' } });
    expect(r.status).toBe(200);
    expect(env.BUCKET.objetos.has(claveLogo(id, m!.id))).toBe(false);
    expect(env.DB.crudo.prepare('SELECT COUNT(*) AS n FROM mascaras_estudio').get()).toEqual({ n: 0 });
  });

  it('presupuesto de escrituras: mirar no escribe; guardar, cambiar, logo y borrar entran en su tope', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    let antes = cambios();
    const { m } = await crear(ana);
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO_FILAS_MASCARA.crear);
    antes = cambios();
    await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'PUT', json: DATOS });
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO_FILAS_MASCARA.cambiar);
    antes = cambios();
    const con = (await (
      await ana(`/datos/estudio/mascaras/${m!.id}/logo`, {
        method: 'PUT',
        body: PNG as unknown as BodyInit,
        headers: { 'content-type': 'image/png' },
      })
    ).json()) as { mascara: MascaraGuardada };
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO_FILAS_MASCARA.logo);
    antes = cambios();
    for (let i = 0; i < 5; i++) {
      await ana('/datos/estudio/mascaras');
      await ana(con.mascara.logo!);
    }
    expect(cambios() - antes).toBe(0);
    await ana(`/datos/estudio/mascaras/${m!.id}/logo`, { method: 'DELETE' });
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO_FILAS_MASCARA.quitarLogo);
    antes = cambios();
    await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'DELETE' });
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO_FILAS_MASCARA.borrar);
  });
});

describe('máscaras: cambios, límite y logo huérfano', () => {
  it('guardar sin cambios no escribe nada; cambiar escribe; y los cambios tienen límite por hora', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    const { m } = await crear(ana);
    let antes = cambios();
    for (let i = 0; i < 5; i++) {
      const r = await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'PUT', json: DATOS });
      expect(r.status).toBe(200);
      expect(((await r.json()) as { mascara: MascaraGuardada }).mascara).toMatchObject(DATOS);
    }
    expect(cambios() - antes).toBe(PRESUPUESTO_FILAS_MASCARA.sinCambios);
    antes = cambios();
    await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'PUT', json: { ...DATOS, programa: 'Otro' } });
    expect(cambios() - antes).toBeGreaterThan(0);
    expect(cambios() - antes).toBeLessThanOrEqual(PRESUPUESTO_FILAS_MASCARA.cambiar);
    // Un robot que cambia sin parar queda frenado (los intentos ya contados en esta hora se simulan).
    const yo = ((await (await ana('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id;
    const ins = env.DB.crudo.prepare('INSERT INTO intentos (clave, momento) VALUES (?, ?)');
    for (let i = 0; i < CAMBIOS_MASCARA_MAX; i++) ins.run(`mascara_cambio:${yo}`, Date.now());
    const frenado = await ana(`/datos/estudio/mascaras/${m!.id}`, {
      method: 'PUT',
      json: { ...DATOS, programa: 'Uno más' },
    });
    expect(frenado.status).toBe(429);
    // Lo que no cambia sigue respondiendo bien aunque esté frenado (no gasta nada).
    expect(
      (await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'PUT', json: { ...DATOS, programa: 'Otro' } }))
        .status,
    ).toBe(200);
  });

  it('si la máscara se borra mientras sube su logo, el archivo no queda en el almacén', async () => {
    const ana = await cuenta('Ana Pérez', 'ana@example.com');
    const { m } = await crear(ana);
    const yo = ((await (await ana('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id;
    const clave = claveLogo(yo, m!.id);
    // Mientras el almacén guarda el logo, la persona borra la máscara desde otra pestaña.
    const putReal = env.BUCKET.put.bind(env.BUCKET);
    env.BUCKET.put = (async (...a: Parameters<typeof putReal>) => {
      const r = await putReal(...a);
      expect((await ana(`/datos/estudio/mascaras/${m!.id}`, { method: 'DELETE' })).status).toBe(200);
      return r;
    }) as typeof env.BUCKET.put;
    const r = await ana(`/datos/estudio/mascaras/${m!.id}/logo`, {
      method: 'PUT',
      body: PNG as unknown as BodyInit,
      headers: { 'content-type': 'image/png' },
    });
    expect(r.status).toBe(404);
    expect(env.BUCKET.objetos.has(clave)).toBe(false);

    // Al revés: se borra la máscara cuando la fila todavía dice «sin logo» pero el archivo ya está: se borra igual.
    env.BUCKET.put = putReal;
    const { m: otra } = await crear(ana);
    await env.BUCKET.put(claveLogo(yo, otra!.id), PNG);
    expect((await ana(`/datos/estudio/mascaras/${otra!.id}`, { method: 'DELETE' })).status).toBe(200);
    expect(env.BUCKET.objetos.has(claveLogo(yo, otra!.id))).toBe(false);
  });
});

describe('máscaras (lo puro)', () => {
  it('reconoce PNG, JPEG y WebP por sus bytes y nada más', () => {
    expect(tipoDeImagen(PNG)).toBe('image/png');
    expect(tipoDeImagen(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(tipoDeImagen(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(tipoDeImagen(new TextEncoder().encode('GIF89a'))).toBeNull();
    expect(tipoDeImagen(new TextEncoder().encode('<svg'))).toBeNull();
  });

  it('el podcast de siempre no toca el escenario; las demás llevan sus variables y su clase', () => {
    const podcast = vistaElegida(ELECCION_DEFECTO, []);
    expect(variablesEscenario(podcast)).toEqual({});
    expect(claseMascara(podcast)).toBe('');
    const noticiero = vistaElegida('plantilla:noticiero', []);
    expect(claseMascara(noticiero)).toBe(' mascara-propia estilo-noticiero');
    expect(variablesEscenario(noticiero)['--neon-a']).toBe('#d7263d');
    // Una elegida que ya no existe (borrada en otra pestaña) vuelve al podcast, sin romperse.
    expect(vistaElegida('abcdefghijkl', [])).toEqual(vistaDePlantilla('podcast'));
  });

  it('una guardada se pinta con sus colores, su logo y sus textos', () => {
    const g: MascaraGuardada = {
      id: 'abcdefghijkl',
      ...DATOS,
      estilo: 'noticiero',
      logo: '/media/mascaras/abcdefghijkl/logo?v=1',
      actualizado: 1,
    };
    const v = vistaElegida(g.id, [g]);
    expect(v).toMatchObject({ propia: true, principal: '#ff7a00', fondo: '#1030a0', logo: g.logo });
    expect(variablesEscenario(v)).toMatchObject({ '--neon-a': '#ff7a00', '--fondo-mascara': '#1030a0' });
    const m = armarMascara({
      idioma: 'en',
      anfitrion: 'Ana Pérez',
      programa: v.programa,
      nombreCartel: v.anfitrion,
      rolAnfitrion: v.rol,
    });
    expect(m).toMatchObject({ programa: 'Morning Show', anfitrion: 'Alex', rolAnfitrion: 'Presenter' });
    // Sin textos propios queda lo de siempre.
    expect(armarMascara({ idioma: 'es', anfitrion: 'Ana Pérez' })).toMatchObject({
      anfitrion: 'Ana',
      rolAnfitrion: 'Anfitrión',
    });
  });

  it('colores rotos de un borrador viejo vuelven a los del estilo; las letras se leen sobre cualquier color', () => {
    const v = vistaDeDatos({ estilo: 'minimal', principal: 'rojo', secundario: null, fondo: '#FFFFFF' });
    expect(v.principal).toBe('#f8fafc');
    expect(v.fondo).toBe('#ffffff');
    expect(letraSobre('#ffffff')).toBe('#111827');
    expect(letraSobre('#0b0a1a')).toBe('#ffffff');
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(pocoContraste({ principal: '#111111', secundario: '#222222', fondo: '#121212' })).toBe(true);
    expect(pocoContraste({ principal: '#ff7a00', secundario: '#222222', fondo: '#1030a0' })).toBe(false);
    expect(datosParaGuardar({ ...DATOS, nombre: '  Uno  ', programa: 'x'.repeat(60) })).toMatchObject({
      nombre: 'Uno',
      programa: 'x'.repeat(40),
    });
  });
});
