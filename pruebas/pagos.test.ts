import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import {
  firmaValida,
  formulario,
  ingresoMensual,
  leerAviso,
  leerFactura,
  llavePrecio,
} from '../servidor/pagos';
import { almacenFalso, baseFalsa } from './falsos';

const SECRETO = 'whsec_prueba';
let env: Record<string, unknown>;

async function firmar(cuerpo: string, t = Math.floor(Date.now() / 1000), secreto = SECRETO) {
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const f = await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(`${t}.${cuerpo}`));
  return `t=${t},v1=${[...new Uint8Array(f)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function cliente() {
  let cookie = '';
  return async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
    const h = new Headers(init.headers);
    h.set('cf-connecting-ip', '9.9.9.9');
    if (cookie) h.set('cookie', cookie);
    if (init.method && init.method !== 'GET' && !h.has('x-pantalai') && !ruta.endsWith('/aviso'))
      h.set('x-pantalai', '1');
    if (init.json !== undefined) h.set('content-type', 'application/json');
    const r = await app.request(
      `https://pantalay.com${ruta}`,
      { ...init, headers: h, body: init.json !== undefined ? JSON.stringify(init.json) : init.body },
      env,
    );
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0]!;
    return r;
  };
}

/** Stripe simulado: anota cada llamada y guarda las suscripciones como la API real. */
function stripeFalso() {
  const llamadas: {
    metodo: string;
    ruta: string;
    cuerpo: string;
    auth: string | null;
    idem: string | null;
  }[] = [];
  const subs = new Map<string, Record<string, unknown>>();
  let n = 0;
  const metadatos = (cuerpo: string) => {
    const m: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(cuerpo)) {
      const x = /^metadata\[(.+)\]$/.exec(k);
      if (x) m[x[1]!] = v;
    }
    return m;
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const u = new URL(url);
      const ruta = u.pathname.replace('/v1/', '');
      const cuerpo = String(init.body ?? u.search.slice(1));
      const metodo = init.method ?? 'GET';
      const h = new Headers(init.headers);
      llamadas.push({
        metodo,
        ruta,
        cuerpo: decodeURIComponent(cuerpo),
        auth: h.get('authorization'),
        idem: h.get('idempotency-key'),
      });
      const json = (x: unknown, s = 200) => new Response(JSON.stringify(x), { status: s });
      if (ruta === 'prices' && metodo === 'GET') return json({ data: [] });
      if (ruta === 'prices') return json({ id: 'price_1', lookup_key: 'x' });
      if (ruta === 'customers') return json({ id: 'cus_1' });
      if (ruta === 'subscriptions' && metodo === 'POST') {
        n++;
        const s = {
          id: `sub_${n}`,
          status: 'trialing',
          customer: 'cus_1',
          metadata: metadatos(cuerpo),
          items: {
            data: [{ id: `si_${n}`, price: { unit_amount: 12000, recurring: { interval: 'year' } } }],
          },
        };
        subs.set(s.id, s);
        return json({ ...s, latest_invoice: null, pending_setup_intent: { client_secret: 'seti_secreto' } });
      }
      const una = /^subscriptions\/(sub_\d+)$/.exec(ruta);
      const s = una ? subs.get(una[1]!) : undefined;
      if (s && metodo === 'GET') return json(s);
      if (s && metodo === 'POST') {
        s.metadata = { ...(s.metadata as object), ...metadatos(cuerpo) };
        return json(s);
      }
      if (s && metodo === 'DELETE') {
        s.status = 'canceled';
        return json(s);
      }
      return json({ error: { message: 'no' } }, 404);
    }),
  );
  return { llamadas, subs };
}

beforeEach(() => {
  env = {
    DB: baseFalsa(),
    BUCKET: almacenFalso(),
    STRIPE_SECRETA: 'rk_test_x',
    STRIPE_PUBLICABLE: 'pk_test_x',
    STRIPE_WEBHOOK_SECRETO: SECRETO,
  };
});
afterEach(() => vi.unstubAllGlobals());

describe('CANDADO C-PAGOS: cobro con Stripe dentro de la página', () => {
  it('la firma del aviso: buena pasa; cambiada, vieja o con otro secreto, no', async () => {
    const cuerpo = '{"type":"x"}';
    expect(await firmaValida(cuerpo, await firmar(cuerpo), SECRETO)).toBe(true);
    expect(await firmaValida(cuerpo + ' ', await firmar(cuerpo), SECRETO)).toBe(false);
    expect(
      await firmaValida(cuerpo, await firmar(cuerpo, Math.floor(Date.now() / 1000) - 900), SECRETO),
    ).toBe(false);
    expect(await firmaValida(cuerpo, await firmar(cuerpo, undefined, 'otro'), SECRETO)).toBe(false);
    expect(await firmaValida(cuerpo, undefined, SECRETO)).toBe(false);
    expect(await firmaValida(cuerpo, await firmar(cuerpo), undefined)).toBe(false);
  });

  it('las facturas: pagada manda su enlace y monto; fallida avisa; lo demás se ignora', () => {
    const f = (type: string) => ({
      type,
      data: {
        object: {
          customer: 'cus_1',
          amount_paid: 1200,
          amount_due: 1200,
          hosted_invoice_url: 'https://invoice.stripe.com/i/1',
          number: 'A-1',
        },
      },
    });
    expect(leerFactura(f('invoice.paid'))).toMatchObject({
      tipo: 'pagada',
      cliente: 'cus_1',
      monto: 1200,
      numero: 'A-1',
    });
    expect(leerFactura(f('invoice.payment_failed'))!.tipo).toBe('fallida');
    expect(leerFactura(f('invoice.created'))).toBeNull();
    expect(
      ingresoMensual([
        { status: 'active', monto: 1200, intervalo: 'month' },
        { status: 'canceled', monto: 900, intervalo: 'month' },
        { status: 'active', monto: 12000, intervalo: 'year' },
      ]),
    ).toBe(2200);
  });

  it('el cuerpo va como formulario de Stripe', () => {
    expect(
      formulario({
        items: [{ price: 'p' }],
        expand: ['a', 'b'],
        metadata: { plan: 'business' },
        x: undefined,
      }),
    ).toBe('items%5B0%5D%5Bprice%5D=p&expand%5B%5D=a&expand%5B%5D=b&metadata%5Bplan%5D=business');
  });

  it('el aviso dice qué plan queda: activo, en prueba o cancelado', () => {
    const s = (status: string, type = 'customer.subscription.updated') => ({
      type,
      data: {
        object: {
          id: 'sub_1',
          status,
          customer: 'cus_1',
          metadata: { usuario_id: 'u1', plan: 'business_ia', ciclo: 'anual' },
        },
      },
    });
    expect(leerAviso(s('active'))).toMatchObject({ activa: true, plan: 'business_ia', ciclo: 'anual' });
    expect(leerAviso(s('trialing'))!.activa).toBe(true);
    expect(leerAviso(s('canceled'))!.activa).toBe(false);
    expect(leerAviso(s('active', 'customer.subscription.deleted'))!.activa).toBe(false);
    expect(leerAviso({ type: 'invoice.paid', data: { object: {} } })).toBeNull();
  });

  it('de punta a punta: suscribirse (la tarjeta se confirma en la página) y el aviso firmado enciende el plan', async () => {
    const { llamadas, subs } = stripeFalso();
    const c = cliente();
    expect(
      (
        await c('/datos/registro', {
          method: 'POST',
          json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
        })
      ).status,
    ).toBe(201);
    const cfg = (await (await c('/datos/pago/config')).json()) as { listo: boolean; publicable: string };
    expect(cfg).toMatchObject({ listo: true, publicable: 'pk_test_x' });

    const r = await c('/datos/pago/suscripcion', {
      method: 'POST',
      json: { plan: 'business_ia', ciclo: 'anual' },
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      tipo: 'tarjeta',
      secreto: 'seti_secreto',
      publicable: 'pk_test_x',
      dias_prueba: 14,
    });
    // Precio de fundador anual de Business + AI: 120 USD al año, con su llave para no repetirlo.
    const precio = llamadas.find((l) => l.ruta === 'prices' && l.metodo === 'POST')!;
    expect(precio.cuerpo).toContain('unit_amount=12000');
    expect(precio.cuerpo).toContain('recurring[interval]=year');
    expect(precio.cuerpo).toContain(`lookup_key=${llavePrecio('business_ia', 'anual')}`);
    expect(llamadas.every((l) => l.auth === 'Bearer rk_test_x')).toBe(true);
    const sus = llamadas.find((l) => l.ruta === 'subscriptions')!;
    expect(sus.cuerpo).toContain('payment_behavior=default_incomplete');
    expect(sus.cuerpo).toContain('trial_period_days=14');

    // Hasta que Stripe avise, el plan no cambia.
    const plan = async () =>
      (await (await c('/datos/plan')).json()) as { plan: string; ciclo: string | null };
    expect((await plan()).plan).toBe('starter');
    const yo = ((await (await c('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id;
    const aviso = JSON.stringify({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'trialing',
          customer: 'cus_1',
          metadata: { usuario_id: yo, plan: 'business_ia', ciclo: 'anual' },
        },
      },
    });
    // Sin firma (o con firma falsa) no se toca nada.
    expect((await c('/datos/pago/aviso', { method: 'POST', body: aviso })).status).toBe(400);
    expect(
      (
        await c('/datos/pago/aviso', {
          method: 'POST',
          body: aviso,
          headers: { 'stripe-signature': 't=1,v1=00' },
        })
      ).status,
    ).toBe(400);
    expect((await plan()).plan).toBe('starter');
    const ok = await c('/datos/pago/aviso', {
      method: 'POST',
      body: aviso,
      headers: { 'stripe-signature': await firmar(aviso) },
    });
    expect(ok.status).toBe(200);
    expect(await plan()).toMatchObject({ plan: 'business_ia', ciclo: 'anual' });

    // El mismo plan no se compra dos veces.
    expect(
      (await c('/datos/pago/suscripcion', { method: 'POST', json: { plan: 'business_ia', ciclo: 'anual' } }))
        .status,
    ).toBe(409);
    // Otro plan con uno vivo: se cambia sobre la MISMA suscripción, nunca se crea una segunda.
    const cambio = await c('/datos/pago/suscripcion', {
      method: 'POST',
      json: { plan: 'business', ciclo: 'mensual' },
    });
    expect(await cambio.json()).toMatchObject({ tipo: 'cambiado', suscripcion: 'sub_1' });
    expect(llamadas.filter((l) => l.ruta === 'subscriptions' && l.metodo === 'POST')).toHaveLength(1);
    expect(subs.get('sub_1')!.metadata).toMatchObject({ plan: 'business', ciclo: 'mensual' });
    // La primera suscripción llevó su llave para que dos clics seguidos no creen dos.
    expect(llamadas.find((l) => l.ruta === 'subscriptions')!.idem).toMatch(/^sus-.+-business_ia-anual-\d+$/);

    // Un aviso viejo (llega tarde y dice "en prueba") no pisa lo que Stripe dice AHORA: se lee la suscripción fresca.
    subs.get('sub_1')!.status = 'canceled';
    const tarde = JSON.stringify({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'trialing',
          customer: 'cus_1',
          metadata: { usuario_id: yo, plan: 'business_ia', ciclo: 'anual' },
        },
      },
    });
    expect(
      (
        await c('/datos/pago/aviso', {
          method: 'POST',
          body: tarde,
          headers: { 'stripe-signature': await firmar(tarde) },
        })
      ).status,
    ).toBe(200);
    expect((await plan()).plan).toBe('starter');

    // Avisos de una suscripción que no es la anotada no tocan el plan.
    const ajena = JSON.stringify({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_99',
          status: 'active',
          customer: 'cus_1',
          metadata: { usuario_id: yo, plan: 'business_ia', ciclo: 'anual' },
        },
      },
    });
    const r2 = await c('/datos/pago/aviso', {
      method: 'POST',
      body: ajena,
      headers: { 'stripe-signature': await firmar(ajena) },
    });
    expect(await r2.json()).toMatchObject({ ignorado: 'vieja' });
    expect((await plan()).plan).toBe('starter');

    // Ya cancelada, volver a suscribirse crea una nueva, sin repetir la prueba gratis.
    await c('/datos/pago/suscripcion', { method: 'POST', json: { plan: 'business', ciclo: 'mensual' } });
    const segunda = llamadas.filter((l) => l.ruta === 'subscriptions' && l.metodo === 'POST');
    expect(segunda).toHaveLength(2);
    expect(segunda[1]!.cuerpo).not.toContain('trial_period_days');
  });

  it('si Stripe no deja leer la suscripción, el aviso responde 502 para que Stripe lo reintente', async () => {
    stripeFalso();
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    const yo = ((await (await c('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id;
    const aviso = JSON.stringify({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_404',
          status: 'active',
          customer: 'cus_1',
          metadata: { usuario_id: yo, plan: 'business', ciclo: 'mensual' },
        },
      },
    });
    const r = await c('/datos/pago/aviso', {
      method: 'POST',
      body: aviso,
      headers: { 'stripe-signature': await firmar(aviso) },
    });
    expect(r.status).toBe(502);
    expect(((await (await c('/datos/plan')).json()) as { plan: string }).plan).toBe('starter');
  });

  it('con PAGO_DIAS_PRUEBA=0 se cobra al momento, sin días gratis', async () => {
    const { llamadas } = stripeFalso();
    env = { ...env, PAGO_DIAS_PRUEBA: '0' };
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    await c('/datos/pago/suscripcion', { method: 'POST', json: { plan: 'business_ia', ciclo: 'mensual' } });
    expect(llamadas.find((l) => l.ruta === 'subscriptions')!.cuerpo).not.toContain('trial_period_days');
  });

  it('borrar la cuenta cancela el plan en Stripe al momento (nadie queda pagando sin cuenta); cancelar y reanudar se ven en Mi cuenta', async () => {
    const { llamadas } = stripeFalso();
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    await c('/datos/pago/suscripcion', { method: 'POST', json: { plan: 'business', ciclo: 'mensual' } });
    const yo = ((await (await c('/datos/yo')).json()) as { usuario: { id: string } }).usuario.id;
    const aviso = JSON.stringify({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'trialing',
          customer: 'cus_1',
          metadata: { usuario_id: yo, plan: 'business', ciclo: 'mensual' },
        },
      },
    });
    await c('/datos/pago/aviso', {
      method: 'POST',
      body: aviso,
      headers: { 'stripe-signature': await firmar(aviso) },
    });
    const plan = async () =>
      (await (await c('/datos/plan')).json()) as { renovacion: { cancela_al_final: boolean } | null };
    expect((await plan()).renovacion).toMatchObject({ cancela_al_final: false });
    expect((await c('/datos/pago/cancelar', { method: 'POST' })).status).toBe(200);
    expect((await plan()).renovacion).toMatchObject({ cancela_al_final: true });
    expect((await c('/datos/pago/reanudar', { method: 'POST' })).status).toBe(200);
    expect((await plan()).renovacion).toMatchObject({ cancela_al_final: false });
    expect(
      (await c('/datos/cuenta/borrar', { method: 'POST', json: { clave: 'clave-segura-1' } })).status,
    ).toBe(200);
    expect(llamadas.some((l) => l.metodo === 'DELETE' && l.ruta === 'subscriptions/sub_1')).toBe(true);
  });

  it('sin las claves de Stripe el cobro está apagado y lo dice el canario', async () => {
    env = { DB: baseFalsa(), BUCKET: almacenFalso() };
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    expect(
      (await c('/datos/pago/suscripcion', { method: 'POST', json: { plan: 'business', ciclo: 'mensual' } }))
        .status,
    ).toBe(503);
    expect(((await (await c('/datos/salud')).json()) as { pago: { listo: boolean } }).pago.listo).toBe(false);
  });
});
