// CANDADO C-VERIFICAR-CORREO: al registrarse llega un enlace para confirmar el correo. Sin confirmar no se paga, y
// pasados 7 días no se graban videos nuevos. Las cuentas de antes del corte cuentan como verificadas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app, { CORTE_VERIFICACION, DIAS_SIN_VERIFICAR } from '../servidor/app';
import { almacenFalso, baseFalsa } from './falsos';

type Env = { DB: D1Database; BUCKET: ReturnType<typeof almacenFalso>; CORREO_TOKEN?: string };
let env: Env;
let enviados: { html: string; subject: string }[];

beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso(), CORREO_TOKEN: 'prueba' };
  enviados = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u, init) => {
    const b = JSON.parse(String((init as RequestInit).body)) as { html: string; subject: string };
    enviados.push(b);
    return new Response('{"ok":true}', { status: 200 });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
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
      { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext,
    );
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0]!;
    return r;
  };
}

async function registrar(c: ReturnType<typeof cliente>) {
  const r = await c('/datos/registro', {
    method: 'POST',
    json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
  });
  expect(r.status).toBe(201);
  await new Promise((ok) => setTimeout(ok, 20)); // el correo sale «después»
}
const verificado = async (c: ReturnType<typeof cliente>) =>
  ((await (await c('/datos/yo')).json()) as { usuario: { correo_verificado: boolean } }).usuario
    .correo_verificado;
const enlaceDe = (html: string) => /verify-email\?token=([A-Za-z0-9_-]+)/.exec(html)?.[1];

describe('CANDADO C-VERIFICAR-CORREO', () => {
  it('el correo de bienvenida trae el enlace y el enlace confirma la cuenta (una sola vez)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: CORTE_VERIFICACION + 1000 });
    const c = cliente();
    await registrar(c);
    expect(await verificado(c)).toBe(false);
    const token = enlaceDe(enviados[0]?.html ?? '');
    expect(token).toBeTruthy();
    expect(enviados[0]!.subject).toMatch(/Confirm your Pantalay email/);
    expect((await c('/datos/verificar', { method: 'POST', json: { token } })).status).toBe(200);
    expect(await verificado(c)).toBe(true);
    expect((await c('/datos/verificar', { method: 'POST', json: { token } })).status).toBe(400);
    expect((await c('/datos/verificar', { method: 'POST', json: { token: 'x'.repeat(40) } })).status).toBe(
      400,
    );
  });

  it('sin confirmar: no se paga y a los 7 días no se graban videos nuevos', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: CORTE_VERIFICACION + 1000 });
    const c = cliente();
    await registrar(c);
    const nuevo = () =>
      c('/datos/videos', {
        method: 'POST',
        json: { tipo: 'video/webm', ancho: 1280, alto: 720, respaldo: true },
      });
    expect((await nuevo()).status).toBe(201);
    const pago = await c('/datos/pago/suscripcion', {
      method: 'POST',
      json: { plan: 'business', ciclo: 'mes' },
    });
    expect(pago.status).toBe(403);
    vi.setSystemTime(CORTE_VERIFICACION + 1000 + (DIAS_SIN_VERIFICAR + 1) * 24 * 3600 * 1000);
    const r = await nuevo();
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toBe('correo_sin_verificar');
    // Pedir otro enlace funciona (y tiene tope).
    expect((await c('/datos/verificar/reenviar', { method: 'POST' })).status).toBe(200);
    await new Promise((ok) => setTimeout(ok, 20));
    const token = enlaceDe(enviados.at(-1)?.html ?? '');
    expect((await c('/datos/verificar', { method: 'POST', json: { token } })).status).toBe(200);
    expect((await nuevo()).status).toBe(201);
  });

  it('las cuentas de antes del corte cuentan como verificadas', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: CORTE_VERIFICACION - 1000 });
    const c = cliente();
    await registrar(c);
    expect(await verificado(c)).toBe(true);
  });
});
