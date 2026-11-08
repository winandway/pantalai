// CANDADO C-REPORTE-ERROR: limpieza de los registros de consola y red, alineación con el minuto del video y los
// endpoints (solo el dueño sube, la privacidad del video manda, tope de tamaño).
import { beforeEach, describe, expect, it } from 'vitest';
import app, { PARTE_MIN } from '../servidor/app';
import { limpiarEnServidor, esquemaRegistros } from '../servidor/registros';
import {
  TOPES,
  aSegundo,
  ajustarATamano,
  alinear,
  esFallo,
  filaActual,
  filas,
  limpiarRegistros,
  limpiarTexto,
  limpiarUrl,
  type Tramo,
} from '../web/src/logica/registros';
import { almacenFalso, baseFalsa } from './falsos';

describe('limpiar registros', () => {
  it('tapa los valores sensibles de la dirección y quita usuario, contraseña y #', () => {
    const u = limpiarUrl('https://ana:clave@api.example.com/v1/items?id=7&token=abc123&Email=a@b.com#perfil');
    expect(u).toBe('https://api.example.com/v1/items?id=7&token=[hidden]&Email=[hidden]');
    expect(u).not.toContain('abc123');
    expect(limpiarUrl('/datos/salud?api_key=xyz', 'https://pantalay.com')).toBe(
      'https://pantalay.com/datos/salud?api_key=[hidden]',
    );
    expect(limpiarUrl('data:image/png;base64,AAAA')).toBe('data:…');
    expect(limpiarUrl('no es una dirección?token=1')).toBe('no es una dirección');
    expect(limpiarUrl(`https://a.com/${'x'.repeat(900)}`).length).toBeLessThanOrEqual(TOPES.url);
  });

  it('tapa tokens obvios en los mensajes de consola y corta los muy largos', () => {
    expect(limpiarTexto('Authorization: Bearer abcdefghijklmnop')).toBe('Authorization: Bearer [hidden]');
    expect(limpiarTexto('jwt eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4')).toBe('jwt [hidden]');
    expect(limpiarTexto('{"password":"hunter22","ok":1}')).toBe('{"password":"[hidden]","ok":1}');
    // Clave de mentira armada por partes (el escáner de secretos no distingue una falsa de una real).
    expect(limpiarTexto(`clave ${['sk', 'live', '1234567890abcdef'].join('_')}`)).toBe('clave [hidden]');
    expect(limpiarTexto('x'.repeat(5000)).length).toBe(TOPES.texto);
    expect(limpiarTexto(42)).toBe('42');
  });

  it('descarta lo inválido, ordena y se queda con las más recientes hasta el tope', () => {
    const consola = Array.from({ length: TOPES.consola + 50 }, (_, i) => ({
      t: i,
      nivel: 'log',
      texto: `m${i}`,
    }));
    const r = limpiarRegistros({
      consola: [...consola, null, { t: 1, nivel: 'raro', texto: 'nivel desconocido' }, { t: 2, texto: '' }],
      red: [
        { t: 5, metodo: 'post', url: 'https://x.com/a?password=1', estado: 500, ms: 12.6, tipo: 'fetch' },
        { t: 3, url: 42 },
        'basura',
      ],
    });
    expect(r.consola).toHaveLength(TOPES.consola);
    expect(r.consola.at(-1)!.texto).toBe(`m${TOPES.consola + 49}`);
    expect(r.red).toEqual([
      { t: 5, metodo: 'POST', url: 'https://x.com/a?password=[hidden]', estado: 500, ms: 13, tipo: 'fetch' },
    ]);
    expect(limpiarRegistros({}).consola).toEqual([]);
  });

  it('recorta al tamaño quitando lo más viejo', () => {
    const grande = {
      consola: Array.from({ length: 400 }, (_, i) => ({
        s: i,
        nivel: 'log' as const,
        texto: 'y'.repeat(900),
      })),
      red: [],
    };
    const r = ajustarATamano(grande, 50_000);
    expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThanOrEqual(50_000);
    expect(r.consola.at(-1)!.s).toBe(399);
    expect(r.consola[0]!.s).toBeGreaterThan(0);
  });
});

describe('alinear con el minuto del video', () => {
  // Grabó de 1000 a 5000 (4 s), pausó, siguió de 8000 a 10000.
  const tramos: Tramo[] = [
    { desde: 1000, hasta: 5000, video: 0 },
    { desde: 8000, hasta: null, video: 4 },
  ];
  it('pasa momentos del reloj a segundos del video, saltando las pausas', () => {
    expect(aSegundo(500, tramos)).toEqual({ s: 0, antes: true });
    expect(aSegundo(3000, tramos)).toEqual({ s: 2, antes: false });
    expect(aSegundo(6500, tramos)).toEqual({ s: 4, antes: false }); // en la pausa
    expect(aSegundo(9500, tramos)).toEqual({ s: 5.5, antes: false });
    expect(aSegundo(9500, [])).toEqual({ s: 0, antes: true });
  });
  it('alinea, junta y encuentra la fila del momento', () => {
    const r = alinear(
      {
        consola: [
          { t: 9000, nivel: 'error', texto: 'falló' },
          { t: 200, nivel: 'log', texto: 'antes' },
        ],
        red: [{ t: 2000, metodo: 'GET', url: 'https://a.com/x', estado: 200, ms: 5, tipo: 'fetch' }],
      },
      tramos,
    );
    expect(r.consola).toEqual([
      { s: 0, antes: true, nivel: 'log', texto: 'antes' },
      { s: 5, nivel: 'error', texto: 'falló' },
    ]);
    const lista = filas(r);
    expect(lista.map((f) => f.clase)).toEqual(['consola', 'red', 'consola']);
    expect(lista.map(esFallo)).toEqual([false, false, true]);
    expect(filaActual(lista, 1.5)).toBe(1);
    expect(filaActual(lista, -1)).toBe(-1);
    expect(esFallo({ clase: 'red', s: 0, metodo: 'GET', url: 'x', estado: 0, ms: 0, tipo: '' })).toBe(true);
  });
});

// ---------- endpoints ----------

type Env = { DB: D1Database; BUCKET: ReturnType<typeof almacenFalso> };
let env: Env;
beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso() };
});

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
    );
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0]!;
    return r;
  };
}

async function registrado(correo: string, ip: string) {
  const c = cliente(ip);
  const r = await c('/datos/registro', {
    method: 'POST',
    json: { nombre: 'Ana', correo, clave: 'clave-segura-1' },
  });
  expect(r.status).toBe(201);
  return c;
}

async function videoListo(c: ReturnType<typeof cliente>) {
  const { id } = (await (
    await c('/datos/videos', { method: 'POST', json: { tipo: 'video/webm', ancho: 1280, alto: 720 } })
  ).json()) as { id: string };
  const datos = new Uint8Array(PARTE_MIN + 10);
  const p1 = await (
    await c(`/datos/videos/${id}/partes/1`, { method: 'PUT', body: datos.slice(0, PARTE_MIN) })
  ).json();
  const p2 = await (
    await c(`/datos/videos/${id}/partes/2`, { method: 'PUT', body: datos.slice(PARTE_MIN) })
  ).json();
  const fin = await c(`/datos/videos/${id}/completar`, {
    method: 'POST',
    json: { partes: [(p1 as { parte: object }).parte, (p2 as { parte: object }).parte], duracion: 10 },
  });
  expect(fin.status).toBe(200);
  return id;
}

const ejemplo = {
  consola: [
    { s: 1.2, nivel: 'error', texto: 'TypeError: x is undefined · Bearer abcdefghijklmnop' },
    { s: 0, nivel: 'log', texto: 'arranque', antes: true },
  ],
  red: [
    {
      s: 2,
      metodo: 'post',
      url: 'https://api.example.com/pagar?token=secreto99',
      estado: 500,
      ms: 80,
      tipo: 'fetch',
    },
  ],
  pagina: { url: 'https://app.example.com/checkout?session=abc#x', titulo: 'Checkout' },
  navegador: 'Chrome 142 · macOS',
};

describe('endpoints de registros', () => {
  it('el dueño sube; quien ve el video los lee, ya limpios', async () => {
    const ana = await registrado('ana@example.com', '1.1.1.1');
    const id = await videoListo(ana);
    const r = await ana(`/datos/videos/${id}/registros`, { method: 'PUT', json: ejemplo });
    expect(r.status).toBe(200);
    const otro = cliente('2.2.2.2');
    const g = await otro(`/datos/videos/${id}/registros`);
    expect(g.status).toBe(200);
    const d = (await g.json()) as {
      consola: { texto: string }[];
      red: { url: string; metodo: string }[];
      pagina: { url: string; titulo: string };
      navegador: string;
    };
    expect(d.consola[0]!.texto).toBe('TypeError: x is undefined · Bearer [hidden]');
    expect(d.red[0]).toMatchObject({ metodo: 'POST', url: 'https://api.example.com/pagar?token=[hidden]' });
    expect(d.pagina).toEqual({
      url: 'https://app.example.com/checkout?session=[hidden]',
      titulo: 'Checkout',
    });
    expect(d.navegador).toBe('Chrome 142 · macOS');
    expect(JSON.stringify(d)).not.toMatch(/secreto99|abcdefghijklmnop/);
  });

  it('otra persona no puede subir registros al video de otro', async () => {
    const ana = await registrado('ana@example.com', '1.1.1.1');
    const id = await videoListo(ana);
    const beto = await registrado('beto@example.com', '3.3.3.3');
    expect((await beto(`/datos/videos/${id}/registros`, { method: 'PUT', json: ejemplo })).status).toBe(404);
    expect(
      (await cliente('4.4.4.4')(`/datos/videos/${id}/registros`, { method: 'PUT', json: ejemplo })).status,
    ).toBe(401);
    expect((await ana(`/datos/videos/${id}/registros`)).status).toBe(404); // nadie subió nada
  });

  it('respeta la privacidad: video privado = 404 para los demás, el dueño sí los ve', async () => {
    const ana = await registrado('ana@example.com', '1.1.1.1');
    const id = await videoListo(ana);
    await ana(`/datos/videos/${id}/registros`, { method: 'PUT', json: ejemplo });
    await ana(`/datos/videos/${id}`, { method: 'PATCH', json: { privacidad: 'privado' } });
    expect((await cliente('5.5.5.5')(`/datos/videos/${id}/registros`)).status).toBe(404);
    expect((await ana(`/datos/videos/${id}/registros`)).status).toBe(200);
    // Al borrar el video se borran sus registros.
    await ana(`/datos/videos/${id}`, { method: 'DELETE' });
    const fila = await env.DB.prepare('SELECT COUNT(*) AS n FROM registros_video').first<{ n: number }>();
    expect(fila!.n).toBe(0);
  });

  it('rechaza lo que pasa del tope de tamaño o no cumple el esquema', async () => {
    const ana = await registrado('ana@example.com', '1.1.1.1');
    const id = await videoListo(ana);
    const enorme = {
      ...ejemplo,
      consola: Array.from({ length: 450 }, (_, i) => ({ s: i, nivel: 'log', texto: 'z'.repeat(1500) })),
    };
    expect((await ana(`/datos/videos/${id}/registros`, { method: 'PUT', json: enorme })).status).toBe(413);
    const muchas = { ...ejemplo, red: Array.from({ length: TOPES.red + 1 }, () => ejemplo.red[0]) };
    expect((await ana(`/datos/videos/${id}/registros`, { method: 'PUT', json: muchas })).status).toBe(400);
    expect(
      (await ana(`/datos/videos/${id}/registros`, { method: 'PUT', json: { consola: 'no', red: [] } }))
        .status,
    ).toBe(400);
    expect(
      (
        await ana(`/datos/videos/${id}/registros`, {
          method: 'PUT',
          body: '{roto',
          headers: { 'content-type': 'application/json' },
        })
      ).status,
    ).toBe(400);
  });

  it('la segunda limpieza del servidor descarta campos de más (cookies, cabeceras, cuerpos)', () => {
    const d = esquemaRegistros.parse({
      ...ejemplo,
      red: [{ ...ejemplo.red[0], cabeceras: { cookie: 'a=1' }, cuerpo: '{"tarjeta":"4242"}' }],
    });
    const limpio = limpiarEnServidor(d);
    expect(JSON.stringify(limpio)).not.toMatch(/cookie|tarjeta|4242/);
  });
});
