import { describe, expect, it } from 'vitest';
import { restriccionesMicro } from '../web/src/logica/grabadora';
import {
  atrasoMusica,
  crearCadenaKaraoke,
  efectoValido,
  KARAOKE_DEFECTO,
  muestrasImpulso,
  MUSICA_KARAOKE,
  parametrosKaraoke,
  RETRO_MAXIMA,
  restriccionesKaraoke,
} from '../web/src/logica/karaoke';

const db = (g: number) => 20 * Math.log10(g);

// Web Audio simulado: cada nodo anota a quién se conecta y guarda sus valores.
type Nodo = {
  tipo: string;
  salidas: Nodo[];
  connect: (n: Nodo) => Nodo;
  [k: string]: unknown;
};
function parametro(v = 0) {
  return {
    value: v,
    destino: v,
    setTargetAtTime(x: number) {
      this.destino = x;
    },
  };
}
function contextoFalso() {
  const nodos: Nodo[] = [];
  const nodo = (tipo: string, extra: Record<string, unknown> = {}): Nodo => {
    const n: Nodo = {
      tipo,
      salidas: [],
      connect(d: Nodo) {
        n.salidas.push(d);
        return d;
      },
      ...extra,
    };
    nodos.push(n);
    return n;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 48000,
    createBiquadFilter: () =>
      nodo('filtro', { type: '', frequency: parametro(), Q: parametro(), gain: parametro() }),
    createDynamicsCompressor: () =>
      nodo('compresor', {
        threshold: parametro(),
        knee: parametro(),
        ratio: parametro(),
        attack: parametro(),
        release: parametro(),
      }),
    createGain: () => nodo('ganancia', { gain: parametro(1) }),
    createDelay: () => nodo('retardo', { delayTime: parametro() }),
    createConvolver: () => nodo('sala', { normalize: false, buffer: null }),
    createBuffer: (canales: number, largo: number) => ({
      canales,
      largo,
      copyToChannel() {},
    }),
  };
  return { ctx, nodos };
}
/** ¿Hay camino de «desde» a «hasta» pasando por un nodo del tipo pedido? */
function camino(desde: Nodo, hasta: Nodo, pasaPor?: string, visto = new Set<Nodo>(), paso = false): boolean {
  if (visto.has(desde)) return false;
  visto.add(desde);
  const ahora = paso || desde.tipo === pasaPor;
  if (desde === hasta) return pasaPor ? ahora : true;
  return desde.salidas.some((s) => camino(s, hasta, pasaPor, new Set(visto), ahora));
}

// CANDADO C-KARAOKE (9 nov 2026): el botón Karaoke del Estudio, con los valores de FICHA-KARAOKE.
describe('karaoke', () => {
  it('el efecto por defecto es el punto medio: reverb −14 dB, eco −20 dB, retroalimentación 0,235, ratio 3', () => {
    expect(KARAOKE_DEFECTO.efecto).toBe(50);
    const p = parametrosKaraoke(50);
    expect(db(p.reverb)).toBeCloseTo(-14, 5);
    expect(db(p.eco)).toBeCloseTo(-20, 5);
    expect(p.retro).toBeCloseTo(0.235, 5);
    expect(p.ratio).toBeCloseTo(3, 5);
    expect(p.brillo).toBeCloseTo(2, 5);
    expect(db(MUSICA_KARAOKE)).toBeCloseTo(-6, 0);
  });

  it('en 0 no hay reverb ni eco; en 100 es lo más fuerte; siempre crece; la retroalimentación nunca pasa de 0,4', () => {
    expect(parametrosKaraoke(0)).toMatchObject({ reverb: 0, eco: 0 });
    expect(db(parametrosKaraoke(100).reverb)).toBeCloseTo(-2, 5);
    let antes = parametrosKaraoke(0);
    for (let e = 5; e <= 100; e += 5) {
      const p = parametrosKaraoke(e);
      expect(p.reverb).toBeGreaterThan(antes.reverb);
      expect(p.eco).toBeGreaterThan(antes.eco);
      expect(p.retro).toBeGreaterThanOrEqual(antes.retro);
      expect(p.retro).toBeLessThanOrEqual(RETRO_MAXIMA);
      antes = p;
    }
    expect(efectoValido(250)).toBe(100);
    expect(efectoValido(-3)).toBe(0);
    expect(efectoValido(Number.NaN)).toBe(50);
  });

  it('el reverb es una cola que se apaga en 1,7 s, siempre igual y en estéreo', () => {
    const [izq, der] = muestrasImpulso(48000);
    expect(izq.length).toBe(Math.round(48000 * 1.7));
    const energia = (a: Float32Array, desde: number, hasta: number) => {
      let s = 0;
      for (let i = desde; i < hasta; i++) s += a[i]! * a[i]!;
      return s;
    };
    const decimo = Math.floor(izq.length / 10);
    expect(energia(izq, 0, decimo)).toBeGreaterThan(1000 * energia(izq, izq.length - decimo, izq.length));
    expect(izq).not.toEqual(der);
    expect(muestrasImpulso(48000)[0]).toEqual(izq);
  });

  it('la voz va seca + reverb + eco hasta la salida, y el control mueve los niveles en vivo', () => {
    const { ctx, nodos } = contextoFalso();
    const c = crearCadenaKaraoke(ctx as never) as unknown as {
      entrada: Nodo;
      salida: Nodo;
      ajustar: (e: number) => void;
    };
    expect(c.entrada.tipo).toBe('filtro');
    expect(camino(c.entrada, c.salida, 'compresor')).toBe(true);
    expect(camino(c.entrada, c.salida, 'sala')).toBe(true);
    expect(camino(c.entrada, c.salida, 'retardo')).toBe(true);
    const sala = nodos.find((n) => n.tipo === 'sala')!;
    expect(sala.normalize).toBe(true);
    expect(sala.buffer).not.toBeNull();
    // El lazo del eco: el retardo se alimenta a sí mismo con una ganancia de 0,4 como máximo.
    const retardoEco = nodos.find(
      (n) => n.tipo === 'retardo' && (n.delayTime as { value: number }).value === 0.12,
    )!;
    expect(camino(retardoEco.salidas[0]!, retardoEco)).toBe(true);
    c.ajustar(100);
    for (const g of nodos.filter((n) => n.tipo === 'ganancia' && n.salidas.includes(retardoEco)))
      expect((g.gain as { destino: number }).destino).toBeLessThanOrEqual(RETRO_MAXIMA);
    const niveles = nodos
      .filter((n) => n.tipo === 'ganancia' && n.salidas.includes(c.salida))
      .map((n) => (n.gain as { destino: number }).destino);
    expect(niveles.some((g) => Math.abs(db(g) + 2) < 0.01)).toBe(true); // reverb al máximo
  });

  it('para cantar: sin supresión de ruido ni ganancia automática; la cancelación de eco solo con parlantes', () => {
    expect(restriccionesKaraoke(true)).toEqual({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    expect(restriccionesKaraoke(false).echoCancellation).toBe(true);
    expect(restriccionesMicro('abc', false, { efecto: 50, audifonos: true })).toMatchObject({
      deviceId: { exact: 'abc' },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    // Sin karaoke, como siempre.
    expect(restriccionesMicro('abc', false, null).noiseSuppression).toBe(true);
  });

  it('la música se atrasa lo que tarda la salida, con tope de 0,3 s', () => {
    expect(atrasoMusica(0.04, 0.01)).toBeCloseTo(0.05, 5);
    expect(atrasoMusica(0.5, 0.2)).toBe(0.3);
    expect(atrasoMusica(Number.NaN, -1)).toBe(0);
  });
});
