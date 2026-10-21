import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import { correoBienvenida, correoPagoRecibido, plantilla, REMITENTE } from '../servidor/correo';
import { almacenFalso, baseFalsa } from './falsos';

let env: Record<string, unknown>;
let enviados: {
  from: { address: string };
  to: { address: string }[];
  subject: string;
  text: string;
  html: string;
}[];

function cliente(ip = '5.5.5.5') {
  let cookie = '';
  return async (ruta: string, init: RequestInit & { json?: unknown } = {}) => {
    const h = new Headers(init.headers);
    h.set('cf-connecting-ip', ip);
    if (cookie) h.set('cookie', cookie);
    if (init.method && init.method !== 'GET') h.set('x-pantalai', '1');
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
const esperar = () => new Promise((ok) => setTimeout(ok, 20));

beforeEach(() => {
  env = {
    DB: baseFalsa(),
    BUCKET: almacenFalso(),
    CORREO_TOKEN: 'token-de-prueba',
    CORREO_SITIO: 'pantalai',
  };
  enviados = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://yapanel.yadominios.com/api/hosting/correo/enviar');
      const b = JSON.parse(String(init.body));
      expect(b).toMatchObject({ sitio: 'pantalai', token: 'token-de-prueba' });
      enviados.push(b);
      return new Response(JSON.stringify({ success: true, rebotados: [] }));
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('CANDADO C-CORREO: correos de Pantalay', () => {
  it('la plantilla trae texto y HTML, escapa lo que escribe la persona y sale de noreply@pantalay.com', () => {
    const p = plantilla('es', {
      titulo: 'Hola <b>',
      parrafos: ['uno'],
      boton: { texto: 'Ir', url: 'https://pantalay.com' },
    });
    expect(p.html).toContain('Hola &lt;b&gt;');
    expect(p.text).toContain('Ir: https://pantalay.com');
    expect(REMITENTE.address).toBe('noreply@pantalay.com');
    expect(correoBienvenida('en', 'Ana').asunto).toBe('Your Pantalay account is ready');
    const f = correoPagoRecibido('es', 'Ana', {
      monto: 1200,
      factura: 'https://invoice.stripe.com/i/x',
      numero: 'A-1',
    });
    expect(f.html).toContain('$12.00');
    expect(f.html).toContain('https://invoice.stripe.com/i/x');
  });

  it('al registrarse llega la bienvenida, en su idioma', async () => {
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1', idioma: 'es' },
    });
    await esperar();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({
      from: { address: 'noreply@pantalay.com' },
      to: [{ address: 'ana@example.com' }],
      subject: 'Tu cuenta de Pantalay está lista',
    });
  });

  it('recuperar la contraseña: el enlace llega, sirve una vez, cierra las sesiones y avisa del cambio', async () => {
    const c = cliente();
    await c('/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    await esperar();
    enviados = [];
    // Un correo que no existe responde igual y no manda nada (nadie averigua quién está registrado).
    expect(
      (
        await cliente('6.6.6.6')('/datos/recuperar', {
          method: 'POST',
          json: { correo: 'nadie@example.com' },
        })
      ).status,
    ).toBe(200);
    await esperar();
    expect(enviados).toHaveLength(0);
    expect(
      (await cliente('6.6.6.6')('/datos/recuperar', { method: 'POST', json: { correo: 'ana@example.com' } }))
        .status,
    ).toBe(200);
    await esperar();
    expect(enviados[0]!.subject).toBe('Reset your Pantalay password');
    const token = /token=([A-Za-z0-9]+)/.exec(enviados[0]!.text)![1]!;
    const r = await cliente('6.6.6.6')('/datos/restablecer', {
      method: 'POST',
      json: { token, clave: 'clave-nueva-123' },
    });
    expect(r.status).toBe(200);
    await esperar();
    expect(enviados[1]!.subject).toBe('Your Pantalay password changed');
    // La sesión vieja se cerró; la clave vieja ya no sirve y la nueva sí; el enlace no sirve dos veces.
    expect(((await (await c('/datos/yo')).json()) as { usuario: unknown }).usuario).toBeNull();
    const otra = cliente('7.7.7.7');
    expect(
      (
        await otra('/datos/entrar', {
          method: 'POST',
          json: { correo: 'ana@example.com', clave: 'clave-segura-1' },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await otra('/datos/entrar', {
          method: 'POST',
          json: { correo: 'ana@example.com', clave: 'clave-nueva-123' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await cliente('6.6.6.6')('/datos/restablecer', {
          method: 'POST',
          json: { token, clave: 'otra-clave-123' },
        })
      ).status,
    ).toBe(400);
  });

  it('si el envío falla, registrarse igual funciona', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"codigo":"dominio_sin_activar"}', { status: 400 })),
    );
    const r = await cliente().call(null, '/datos/registro', {
      method: 'POST',
      json: { nombre: 'Ana', correo: 'ana@example.com', clave: 'clave-segura-1' },
    });
    expect(r.status).toBe(201);
  });
});
