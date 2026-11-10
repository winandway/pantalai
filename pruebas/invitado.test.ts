// CANDADO C-INVITADO: invitado remoto en el Estudio. El anfitrión crea un enlace de 24 h; el invitado entra sin
// cuenta, manda UNA oferta completa y recibe UNA respuesta; un solo invitado a la vez; el enlace de otro anfitrión no
// sirve; esperar y consultar no escriben nada y una entrevista entra en su presupuesto de filas; el puente TURN pide
// credenciales de corta vida sin sacar la llave del servidor; y /datos/salud dice si TURN está puesto.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../servidor/app';
import { PRESUPUESTO_FILAS, servidoresIce, sinPuerto53, turnConfigurado } from '../servidor/invitado';
import { armarMascara } from '../web/src/logica/estudio';
import {
  ADIOS,
  LlamadaInvitado,
  SalaAnfitrion,
  codigoDeRuta,
  enlaceInvitado,
  esperarRutas,
  nuevoAsiento,
  pausaConsulta,
  pausaReintento,
  type Dependencias,
  type EstadoLlamada,
} from '../web/src/logica/llamada';
import { ErrorApi } from '../web/src/logica/api';
import { almacenFalso, baseFalsa } from './falsos';

type Env = {
  DB: ReturnType<typeof baseFalsa>;
  BUCKET: ReturnType<typeof almacenFalso>;
  TURN_LLAVE_ID?: string;
  TURN_LLAVE_TOKEN?: string;
};
let env: Env;

beforeEach(() => {
  env = { DB: baseFalsa(), BUCKET: almacenFalso() };
  // Ningún servicio real: el correo de bienvenida y Cloudflare quedan simulados.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }));
});
afterEach(() => {
  vi.restoreAllMocks();
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

async function anfitrion(nombre = 'Ana Pérez', correo = 'ana@example.com'): Promise<Cliente> {
  const c = cliente();
  const r = await c('/datos/registro', { method: 'POST', json: { nombre, correo, clave: 'clave-segura-1' } });
  expect(r.status).toBe(201);
  await new Promise((ok) => setTimeout(ok, 10));
  return c;
}

const OFERTA = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n';
const RESPUESTA = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\ns=-\r\n';
const cambios = () => (env.DB.crudo.prepare('SELECT total_changes() AS n').get() as { n: number }).n;

describe('salas del invitado (servidor)', () => {
  it('saludo completo: enlace, oferta del invitado, respuesta del anfitrión', async () => {
    const ana = await anfitrion();
    const r = await ana('/datos/estudio/invitado', { method: 'POST' });
    expect(r.status).toBe(201);
    const { codigo, vence } = (await r.json()) as { codigo: string; vence: number };
    expect(codigo).toMatch(/^[a-z0-9]{32}$/);
    expect(vence - Date.now()).toBeGreaterThan(23.9 * 3600 * 1000);
    // El código nunca se guarda tal cual: solo su huella.
    expect(env.DB.crudo.prepare('SELECT codigo_hash FROM salas_invitado').get()).not.toEqual({
      codigo_hash: codigo,
    });

    const invitado = cliente('2.2.2.2');
    const asiento = nuevoAsiento();
    const info = (await (await invitado(`/datos/invitado/${codigo}`)).json()) as Record<string, unknown>;
    expect(info).toMatchObject({ anfitrion: 'Ana', ocupada: false });
    const o = await invitado(`/datos/invitado/${codigo}/oferta`, {
      method: 'POST',
      json: { nombre: 'Beto', asiento, sdp: OFERTA },
    });
    expect(o.status).toBe(201);
    const { intento } = (await o.json()) as { intento: number };
    expect(intento).toBe(1);

    const visto = (await (await ana(`/datos/estudio/invitado/${codigo}`)).json()) as Record<string, unknown>;
    expect(visto).toMatchObject({ intento: 1, nombre: 'Beto', oferta: OFERTA });
    const pendiente = await invitado(`/datos/invitado/${codigo}/respuesta?intento=1`, {
      headers: { 'x-asiento': asiento },
    });
    expect(await pendiente.json()).toMatchObject({ respuesta: null });

    expect(
      (
        await ana(`/datos/estudio/invitado/${codigo}/respuesta`, {
          method: 'POST',
          json: { intento: 1, sdp: RESPUESTA },
        })
      ).status,
    ).toBe(200);
    const lista = await invitado(`/datos/invitado/${codigo}/respuesta?intento=1`, {
      headers: { 'x-asiento': asiento },
    });
    expect(await lista.json()).toMatchObject({ respuesta: RESPUESTA });
    // Respondida, la oferta ya no se le vuelve a mostrar al anfitrión.
    expect(await (await ana(`/datos/estudio/invitado/${codigo}`)).json()).toMatchObject({ oferta: null });
    // Una respuesta a un intento viejo no pisa nada.
    expect(
      (
        await ana(`/datos/estudio/invitado/${codigo}/respuesta`, {
          method: 'POST',
          json: { intento: 7, sdp: RESPUESTA },
        })
      ).status,
    ).toBe(409);
  });

  it('un invitado a la vez: otra persona con el mismo enlace no le quita el puesto; al salir queda libre', async () => {
    const ana = await anfitrion();
    const { codigo } = (await (await ana('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    const beto = cliente('2.2.2.2');
    const carla = cliente('3.3.3.3');
    const asientoBeto = nuevoAsiento();
    await beto(`/datos/invitado/${codigo}/oferta`, {
      method: 'POST',
      json: { nombre: 'Beto', asiento: asientoBeto, sdp: OFERTA },
    });
    const intruso = await carla(`/datos/invitado/${codigo}/oferta`, {
      method: 'POST',
      json: { nombre: 'Carla', asiento: nuevoAsiento(), sdp: OFERTA },
    });
    expect(intruso.status).toBe(409);
    expect(await (await carla(`/datos/invitado/${codigo}`)).json()).toMatchObject({ ocupada: true });
    // Carla no puede leer la respuesta de Beto.
    expect(
      (
        await carla(`/datos/invitado/${codigo}/respuesta?intento=1`, {
          headers: { 'x-asiento': nuevoAsiento() },
        })
      ).status,
    ).toBe(409);
    // Beto, con su asiento, vuelve a entrar si se le cae (otro intento).
    const otra = await beto(`/datos/invitado/${codigo}/oferta`, {
      method: 'POST',
      json: { nombre: 'Beto', asiento: asientoBeto, sdp: OFERTA },
    });
    expect(await otra.json()).toMatchObject({ intento: 2 });
    // Beto sale: el anfitrión libera el puesto y Carla puede entrar.
    expect((await ana(`/datos/estudio/invitado/${codigo}/liberar`, { method: 'POST' })).status).toBe(200);
    const ahora = await carla(`/datos/invitado/${codigo}/oferta`, {
      method: 'POST',
      json: { nombre: 'Carla', asiento: nuevoAsiento(), sdp: OFERTA },
    });
    expect(ahora.status).toBe(201);
  });

  it('el enlace de otro anfitrión no sirve, el vencido tampoco, y uno nuevo reemplaza al anterior', async () => {
    const ana = await anfitrion();
    const beto = await anfitrion('Beto', 'beto@example.com');
    const { codigo } = (await (await ana('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    expect((await beto(`/datos/estudio/invitado/${codigo}`)).status).toBe(404);
    expect(
      (
        await beto(`/datos/estudio/invitado/${codigo}/respuesta`, {
          method: 'POST',
          json: { intento: 1, sdp: RESPUESTA },
        })
      ).status,
    ).toBe(404);
    // Sin sesión no se crean enlaces.
    expect((await cliente()('/datos/estudio/invitado', { method: 'POST' })).status).toBe(401);
    // Un enlace nuevo deja sin efecto el anterior.
    const { codigo: nuevo } = (await (await ana('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    expect((await cliente('4.4.4.4')(`/datos/invitado/${codigo}`)).status).toBe(404);
    expect((await cliente('4.4.4.4')(`/datos/invitado/${nuevo}`)).status).toBe(200);
    // Vencido: 404 aunque la fila siga ahí (se borra sola cuando alguien crea otra sala).
    env.DB.crudo.prepare('UPDATE salas_invitado SET vence = ?').run(Date.now() - 1);
    expect((await cliente('4.4.4.4')(`/datos/invitado/${nuevo}`)).status).toBe(404);
    await beto('/datos/estudio/invitado', { method: 'POST' });
    expect((env.DB.crudo.prepare('SELECT COUNT(*) AS n FROM salas_invitado').get() as { n: number }).n).toBe(
      1,
    );
    // Cerrar la invitación la borra.
    const { codigo: deBeto } = (await (await beto('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    expect((await beto(`/datos/estudio/invitado/${deBeto}`, { method: 'DELETE' })).status).toBe(200);
    expect((await cliente('5.5.5.5')(`/datos/invitado/${deBeto}`)).status).toBe(404);
  });

  it('valida lo que entra: nombre, asiento y descripción (zod)', async () => {
    const ana = await anfitrion();
    const { codigo } = (await (await ana('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    const inv = cliente('2.2.2.2');
    for (const json of [
      { nombre: '', asiento: nuevoAsiento(), sdp: OFERTA },
      { nombre: 'Beto', asiento: 'corto', sdp: OFERTA },
      { nombre: 'Beto', asiento: nuevoAsiento(), sdp: '<script>' },
      { nombre: 'Beto', asiento: nuevoAsiento(), sdp: `v=0${'x'.repeat(31_000)}` },
    ])
      expect((await inv(`/datos/invitado/${codigo}/oferta`, { method: 'POST', json })).status).toBe(400);
    // Sin la cabecera propia, otro sitio no puede mandar ofertas.
    const sinCabecera = await app.request(
      `https://pantalai.test/datos/invitado/${codigo}/oferta`,
      { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } },
      env,
    );
    expect(sinCabecera.status).toBe(403);
  });

  it('límite de intentos: quien prueba códigos queda frenado; las ofertas tienen tope', async () => {
    const curioso = cliente('6.6.6.6');
    for (let i = 0; i < 30; i++) await curioso(`/datos/invitado/${'a'.repeat(32)}`);
    expect((await curioso(`/datos/invitado/${'b'.repeat(32)}`)).status).toBe(429);

    const ana = await anfitrion();
    const { codigo } = (await (await ana('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    const inv = cliente('7.7.7.7');
    const asiento = nuevoAsiento();
    let ultimo = 0;
    for (let i = 0; i < 21; i++)
      ultimo = (
        await inv(`/datos/invitado/${codigo}/oferta`, {
          method: 'POST',
          json: { nombre: 'Beto', asiento, sdp: OFERTA },
        })
      ).status;
    expect(ultimo).toBe(429);
  });

  it('presupuesto de escrituras: una entrevista entera escribe pocas filas y esperar no escribe nada', async () => {
    const ana = await anfitrion();
    const inv = cliente('2.2.2.2');
    const asiento = nuevoAsiento();
    const antes = cambios();
    const { codigo } = (await (await ana('/datos/estudio/invitado', { method: 'POST' })).json()) as {
      codigo: string;
    };
    await inv(`/datos/invitado/${codigo}`);
    await inv(`/datos/invitado/${codigo}/ice`);
    await inv(`/datos/invitado/${codigo}/oferta`, {
      method: 'POST',
      json: { nombre: 'Beto', asiento, sdp: OFERTA },
    });
    // Muchas consultas de los dos lados mientras se saludan: cero escrituras.
    const enMedio = cambios();
    for (let i = 0; i < 40; i++) {
      await ana(`/datos/estudio/invitado/${codigo}`);
      await inv(`/datos/invitado/${codigo}/respuesta?intento=1`, { headers: { 'x-asiento': asiento } });
    }
    await ana('/datos/estudio/ice');
    expect(cambios()).toBe(enMedio);
    await ana(`/datos/estudio/invitado/${codigo}/respuesta`, {
      method: 'POST',
      json: { intento: 1, sdp: RESPUESTA },
    });
    await ana(`/datos/estudio/invitado/${codigo}`, { method: 'DELETE' });
    const usadas = cambios() - antes;
    expect(usadas).toBeLessThanOrEqual(PRESUPUESTO_FILAS.entrevista);
    expect(usadas).toBeGreaterThan(0);
  });
});

describe('puente TURN y canario', () => {
  it('sin llave: solo STUN público y la salud dice turn:false', async () => {
    expect(turnConfigurado({})).toBe(false);
    expect(await servidoresIce({})).toEqual({
      iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }],
      turn: false,
    });
    const salud = (await (await app.request('https://pantalai.test/datos/salud', {}, env)).json()) as {
      invitado: { turn: boolean };
    };
    expect(salud.invitado).toEqual({ turn: false });
  });

  it('con llave: pide credenciales de corta vida, quita el puerto 53 y la llave no sale del servidor', async () => {
    env.TURN_LLAVE_ID = 'llave-id';
    env.TURN_LLAVE_TOKEN = 'token-secreto';
    const pedir = vi.fn<(u: RequestInfo | URL, i?: RequestInit) => Promise<Response>>(async () =>
      Response.json(
        {
          iceServers: [
            { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
            {
              urls: [
                'turn:turn.cloudflare.com:3478?transport=udp',
                'turn:turn.cloudflare.com:53?transport=udp',
              ],
              username: 'u',
              credential: 'c',
            },
          ],
        },
        { status: 201 },
      ),
    );
    const r = await servidoresIce(env, pedir as unknown as typeof fetch);
    expect(r.turn).toBe(true);
    expect(JSON.stringify(r)).not.toContain(':53');
    expect(JSON.stringify(r)).not.toContain('token-secreto');
    const [url, init] = pedir.mock.calls[0]!;
    expect(String(url)).toBe(
      'https://rtc.live.cloudflare.com/v1/turn/keys/llave-id/credentials/generate-ice-servers',
    );
    expect(new Headers(init!.headers).get('authorization')).toBe('Bearer token-secreto');
    expect(JSON.parse(String(init!.body))).toEqual({ ttl: 86400 });
    const salud = (await (await app.request('https://pantalai.test/datos/salud', {}, env)).json()) as {
      invitado: { turn: boolean };
    };
    expect(salud.invitado).toEqual({ turn: true });
  });

  it('si Cloudflare falla, se sigue con STUN (y queda en el registro de errores)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await servidoresIce(
      { TURN_LLAVE_ID: 'a', TURN_LLAVE_TOKEN: 'b' },
      (async () => new Response('no', { status: 500 })) as typeof fetch,
    );
    expect(r).toEqual({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }], turn: false });
    expect(error).toHaveBeenCalled();
    expect(sinPuerto53([{ urls: 'turn:x:53' }])).toEqual([]);
  });
});

// ---------- lado del navegador, con una conexión WebRTC de mentira ----------

class ConexionFalsa extends EventTarget {
  static todas: ConexionFalsa[] = [];
  iceGatheringState: RTCIceGatheringState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  pistas: MediaStreamTrack[] = [];
  canales: { readyState: string; enviados: string[]; send: (m: string) => void }[] = [];
  cerrada = false;
  ontrack: ((e: RTCTrackEvent) => void) | null = null;
  ondatachannel: ((e: RTCDataChannelEvent) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  constructor(public config: RTCConfiguration) {
    super();
    ConexionFalsa.todas.push(this);
  }
  addTrack(p: MediaStreamTrack) {
    this.pistas.push(p);
  }
  createDataChannel() {
    const c = {
      readyState: 'open',
      enviados: [] as string[],
      send(m: string) {
        this.enviados.push(m);
      },
    };
    this.canales.push(c);
    return c;
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: OFERTA };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: RESPUESTA };
  }
  async setLocalDescription(d: RTCSessionDescriptionInit) {
    this.localDescription = d;
    // Juntar las rutas termina enseguida.
    setTimeout(() => {
      this.iceGatheringState = 'complete';
      this.dispatchEvent(new Event('icegatheringstatechange'));
    }, 1);
  }
  async setRemoteDescription(d: RTCSessionDescriptionInit) {
    this.remoteDescription = d;
  }
  getSenders() {
    return this.pistas.map((track) => ({ track, replaceTrack: vi.fn(async () => undefined) }));
  }
  ponerEstado(s: RTCPeerConnectionState) {
    this.connectionState = s;
    this.onconnectionstatechange?.();
  }
  close() {
    this.cerrada = true;
  }
}

class FlujoFalso {
  constructor(public pistas: MediaStreamTrack[]) {}
  getTracks() {
    return this.pistas;
  }
}

const pista = (kind: string) => ({ kind }) as MediaStreamTrack;

/** Un servidor de mentira con la misma forma que el real (respuestas en memoria). */
function servidorFalso() {
  const sala = {
    intento: 0,
    oferta: null as string | null,
    respuesta: null as string | null,
    nombre: null as string | null,
    liberada: 0,
  };
  const llamadas: string[] = [];
  const pedir = (async (ruta: string, op: RequestInit & { json?: unknown } = {}) => {
    llamadas.push(`${op.method ?? 'GET'} ${ruta}`);
    const j = op.json as Record<string, string | number> | undefined;
    if (ruta.endsWith('/ice')) return { iceServers: [{ urls: ['stun:x'] }] };
    if (ruta.includes('/oferta')) {
      sala.intento++;
      sala.oferta = String(j!.sdp);
      sala.respuesta = null;
      sala.nombre = String(j!.nombre);
      return { intento: sala.intento };
    }
    if (ruta.includes('/respuesta?'))
      return { respuesta: ruta.endsWith(`intento=${sala.intento}`) ? sala.respuesta : null };
    if (ruta.endsWith('/respuesta')) {
      if (j!.intento !== sala.intento) throw new ErrorApi('intento_viejo', 409);
      sala.respuesta = String(j!.sdp);
      return { ok: true };
    }
    if (ruta.endsWith('/liberar')) {
      sala.liberada++;
      return { ok: true };
    }
    return { intento: sala.intento, nombre: sala.nombre, oferta: sala.respuesta ? null : sala.oferta };
  }) as Dependencias['pedir'];
  return { sala, llamadas, pedir };
}

const dormir = (ms = 5) => new Promise<void>((ok) => setTimeout(ok, ms));
async function hasta(cond: () => boolean, vueltas = 200) {
  for (let i = 0; i < vueltas && !cond(); i++) await dormir(2);
  expect(cond()).toBe(true);
}

describe('la llamada (navegador)', () => {
  beforeEach(() => {
    ConexionFalsa.todas = [];
  });

  it('se saludan con una oferta y una respuesta, se conectan, y conectados no consultan al servidor', async () => {
    const srv = servidorFalso();
    const d: Dependencias = {
      pedir: srv.pedir,
      Conexion: ConexionFalsa as unknown as Dependencias['Conexion'],
      esperar: () => dormir(1),
      Flujo: FlujoFalso as unknown as Dependencias['Flujo'],
    };
    const estadosAnf: EstadoLlamada[] = [];
    const estadosInv: EstadoLlamada[] = [];
    const remotos: unknown[] = [];
    const anf = new SalaAnfitrion(
      'c'.repeat(32),
      () => [pista('video'), pista('audio')],
      {
        estado: (e) => estadosAnf.push(e),
        remoto: (f) => remotos.push(f),
      },
      d,
    );
    await anf.iniciar();
    const local = new FlujoFalso([pista('video'), pista('audio')]) as unknown as MediaStream;
    const inv = new LlamadaInvitado(
      'c'.repeat(32),
      nuevoAsiento(),
      'Beto',
      local,
      {
        estado: (e) => estadosInv.push(e),
        remoto: () => undefined,
      },
      d,
    );
    await inv.unir();
    await hasta(() => srv.sala.respuesta !== null);
    await hasta(() => estadosInv.includes('conectando'));
    const [pcInv, pcAnf] = ConexionFalsa.todas;
    expect(pcInv!.localDescription?.type).toBe('offer');
    expect(pcAnf!.remoteDescription).toEqual({ type: 'offer', sdp: OFERTA });
    expect(pcAnf!.pistas.map((p) => p.kind)).toEqual(['video', 'audio']);
    expect(pcInv!.remoteDescription).toEqual({ type: 'answer', sdp: RESPUESTA });
    expect(anf.nombre).toBe('Beto');
    // Una sola oferta y una sola respuesta.
    expect(srv.llamadas.filter((l) => l.startsWith('POST')).length).toBe(2);

    pcAnf!.ontrack?.({ streams: [], track: pista('video') } as unknown as RTCTrackEvent);
    expect(remotos.at(-1)).toBeInstanceOf(FlujoFalso);
    pcAnf!.ponerEstado('connected');
    pcInv!.ponerEstado('connected');
    expect(estadosAnf.at(-1)).toBe('conectado');
    expect(estadosInv.at(-1)).toBe('conectado');
    const antes = srv.llamadas.length;
    await dormir(30);
    expect(srv.llamadas.length).toBe(antes);

    // Cambiar de cámara no corta la llamada.
    anf.cambiarPista(pista('video'));
    expect(ConexionFalsa.todas.length).toBe(2);

    // El invitado sale: se avisa por el canal directo y el anfitrión libera el puesto.
    inv.salir();
    expect(pcInv!.canales[0]!.enviados).toEqual([ADIOS]);
    expect(estadosInv.at(-1)).toBe('salio');
    pcAnf!.ondatachannel?.({ channel: {} } as unknown as RTCDataChannelEvent);
    // (el canal falso del anfitrión recibe el mensaje)
    const canal = { onmessage: null as ((m: MessageEvent) => void) | null };
    pcAnf!.ondatachannel?.({ channel: canal } as unknown as RTCDataChannelEvent);
    canal.onmessage?.({ data: ADIOS } as MessageEvent);
    await hasta(() => srv.sala.liberada === 1);
    expect(estadosAnf.at(-1)).toBe('salio');
    expect(remotos.at(-1)).toBeNull();
    anf.detener();
  });

  it('si se cae la conexión, el invitado vuelve a ofrecer solo y el anfitrión responde al intento nuevo', async () => {
    const srv = servidorFalso();
    const d: Dependencias = {
      pedir: srv.pedir,
      Conexion: ConexionFalsa as unknown as Dependencias['Conexion'],
      esperar: () => dormir(1),
      Flujo: FlujoFalso as unknown as Dependencias['Flujo'],
    };
    const estadosAnf: EstadoLlamada[] = [];
    const anf = new SalaAnfitrion(
      'c'.repeat(32),
      () => [],
      { estado: (e) => estadosAnf.push(e), remoto: () => undefined },
      d,
    );
    await anf.iniciar();
    const local = new FlujoFalso([]) as unknown as MediaStream;
    const estadosInv: EstadoLlamada[] = [];
    const inv = new LlamadaInvitado(
      'c'.repeat(32),
      nuevoAsiento(),
      'Beto',
      local,
      {
        estado: (e) => estadosInv.push(e),
        remoto: () => undefined,
      },
      d,
    );
    await inv.unir();
    await hasta(() => srv.sala.respuesta !== null && ConexionFalsa.todas.length === 2);
    ConexionFalsa.todas[0]!.ponerEstado('failed');
    ConexionFalsa.todas[1]!.ponerEstado('failed');
    expect(estadosAnf.at(-1)).toBe('caido');
    await hasta(() => srv.sala.intento === 2 && srv.sala.respuesta !== null);
    expect(estadosInv).toContain('caido');
    expect(ConexionFalsa.todas.length).toBe(4);
    anf.detener();
    inv.salir();
  });

  it('enlace vencido u ocupado: lo dice y deja de intentar', async () => {
    for (const [codigo, estado, esperado] of [
      ['ocupada', 409, 'ocupada'],
      ['sala_vencida', 404, 'vencida'],
    ] as const) {
      const estados: EstadoLlamada[] = [];
      const d: Dependencias = {
        pedir: (async (ruta: string) => {
          if (ruta.endsWith('/ice')) return { iceServers: [] };
          throw new ErrorApi(codigo, estado);
        }) as Dependencias['pedir'],
        Conexion: ConexionFalsa as unknown as Dependencias['Conexion'],
        esperar: () => dormir(1),
        Flujo: FlujoFalso as unknown as Dependencias['Flujo'],
      };
      const inv = new LlamadaInvitado(
        'c'.repeat(32),
        nuevoAsiento(),
        'Beto',
        new FlujoFalso([]) as unknown as MediaStream,
        {
          estado: (e) => estados.push(e),
          remoto: () => undefined,
        },
        d,
      );
      await inv.unir();
      expect(estados.at(-1)).toBe(esperado);
    }
    // El anfitrión con su enlace vencido también se entera.
    const estados: EstadoLlamada[] = [];
    const anf = new SalaAnfitrion(
      'c'.repeat(32),
      () => [],
      { estado: (e) => estados.push(e), remoto: () => undefined },
      {
        pedir: (async () => {
          throw new ErrorApi('sala_vencida', 404);
        }) as Dependencias['pedir'],
        Conexion: ConexionFalsa as unknown as Dependencias['Conexion'],
        esperar: () => dormir(1),
        Flujo: FlujoFalso as unknown as Dependencias['Flujo'],
      },
    );
    await anf.consultar();
    expect(estados.at(-1)).toBe('vencida');
  });

  it('esperarRutas no se queda colgada si nunca termina', async () => {
    const pc = new ConexionFalsa({}) as unknown as RTCPeerConnection;
    const t = Date.now();
    await esperarRutas(pc, 20);
    expect(Date.now() - t).toBeLessThan(500);
  });

  it('piezas sueltas: enlace, código, pausas y máscara del invitado', () => {
    const c = 'a1'.repeat(16);
    expect(enlaceInvitado('https://pantalay.com/', c)).toBe(`https://pantalay.com/join/${c}`);
    expect(codigoDeRuta(`/join/${c}`)).toBe(c);
    expect(codigoDeRuta('/join')).toBeNull();
    expect(codigoDeRuta('/join/abc')).toBeNull();
    expect(pausaConsulta(0)).toBe(1000);
    expect(pausaConsulta(50)).toBe(3000);
    expect(pausaReintento(1)).toBe(2000);
    expect(pausaReintento(99)).toBe(10_000);
    expect(nuevoAsiento()).toMatch(/^[a-f0-9]{32}$/);
    const m = armarMascara({ idioma: 'es', anfitrion: 'Ana', creador: 'Beto', invitado: true });
    expect(m).toMatchObject({ creador: 'Beto', rolCreador: 'Invitado', tema: 'Entrevista en vivo' });
    expect(armarMascara({ idioma: 'en', anfitrion: 'Ana', invitado: true })).toMatchObject({
      creador: 'Guest',
      rolCreador: 'Guest',
      tema: 'Live interview',
    });
  });
});
