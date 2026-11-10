// CANDADO C-MINIATURA: la miniatura para YouTube sale en 1280 × 720, por debajo de 2 MB, con el texto encima, el
// video vertical bien encuadrado y la marca de agua solo cuando el video la lleva.
import { describe, expect, it } from 'vitest';
import {
  ajustarLetra,
  ALTO,
  ANCHO,
  bajoElLimite,
  dibujarMiniatura,
  encuadrar,
  esPanoramica,
  letraLegible,
  MAX_BYTES,
  nombreMiniatura,
  partirLineas,
  pinturaDe,
  PINTURAS,
  textoCorto,
  yDelTexto,
} from '../web/src/logica/miniatura';

// Cada letra mide 0,6 del tamaño de la letra (aproximado, como una letra gruesa).
const medir = (s: string, px: number) => s.length * px * 0.6;

describe('CANDADO C-MINIATURA: medidas y peso', () => {
  it('mide lo que pide YouTube y el límite es menor a 2 MB', () => {
    expect([ANCHO, ALTO]).toEqual([1280, 720]);
    expect(MAX_BYTES).toBeLessThanOrEqual(2 * 1000 * 1000);
  });

  it('baja la calidad hasta quedar por debajo del límite', async () => {
    const vistas: number[] = [];
    const r = await bajoElLimite(async (q) => {
      vistas.push(q);
      return new Blob([new Uint8Array(Math.round(q * 3_000_000))]);
    });
    expect(r.archivo.size).toBeLessThan(MAX_BYTES);
    expect(r.calidad).toBeLessThan(0.67);
    // Empieza por la mejor calidad y no se salta la que ya alcanza.
    expect(vistas[0]).toBeGreaterThan(0.9);
    expect(vistas.at(-1)).toBe(r.calidad);
  });

  it('si ninguna calidad alcanza, lo dice (nunca entrega un archivo de 2 MB o más)', async () => {
    await expect(bajoElLimite(async () => new Blob([new Uint8Array(MAX_BYTES)]))).rejects.toThrow();
    await expect(bajoElLimite(async () => new Blob([]))).rejects.toThrow();
  });
});

describe('CANDADO C-MINIATURA: encuadre', () => {
  it('un video 16:9 llena todo sin fondo', () => {
    const e = encuadrar(1920, 1080, 'desenfocado');
    expect(e.fondo).toBeNull();
    expect(e.destino).toEqual({ x: 0, y: 0, w: ANCHO, h: ALTO });
    expect(e.origen).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(esPanoramica(1280, 720)).toBe(true);
    expect(esPanoramica(854, 480)).toBe(true);
  });

  it('un vertical con «desenfocado» va entero al medio, con fondo', () => {
    const e = encuadrar(1080, 1920, 'desenfocado');
    expect(e.fondo).not.toBeNull();
    expect(e.origen).toEqual({ x: 0, y: 0, w: 1080, h: 1920 });
    expect(e.destino.h).toBe(ALTO);
    expect(e.destino.w).toBeCloseTo(405, 0);
    expect(e.destino.x + e.destino.w / 2).toBeCloseTo(ANCHO / 2, 5);
    // El fondo es un pedazo 16:9 de la misma imagen (se agranda y se desenfoca).
    expect(e.fondo!.w / e.fondo!.h).toBeCloseTo(16 / 9, 3);
  });

  it('un vertical con «recorte» llena todo cortando al centro', () => {
    const e = encuadrar(1080, 1920, 'recorte');
    expect(e.fondo).toBeNull();
    expect(e.destino).toEqual({ x: 0, y: 0, w: ANCHO, h: ALTO });
    expect(e.origen.w).toBe(1080);
    expect(e.origen.h).toBeCloseTo(607.5, 1);
    expect(e.origen.y).toBeCloseTo((1920 - 607.5) / 2, 1);
  });

  it('una imagen más ancha que 16:9 se recorta a los lados', () => {
    const e = encuadrar(2560, 1080, 'desenfocado');
    expect(e.fondo).toBeNull();
    expect(e.origen.h).toBe(1080);
    expect(e.origen.w).toBeCloseTo(1920, 0);
  });
});

describe('CANDADO C-MINIATURA: texto', () => {
  it('el texto por defecto son pocas palabras y no termina en una de unión', () => {
    expect(textoCorto('Nadie te cuenta esto sobre grabar tu pantalla en 2026')).toBe(
      'Nadie te cuenta esto sobre',
    );
    expect(textoCorto('The one trick of the year')).toBe('The one trick');
    expect(textoCorto('  Hola   mundo  ')).toBe('Hola mundo');
    expect(textoCorto('a'.repeat(80)).length).toBe(40);
    expect(textoCorto('Esto: sí')).toBe('Esto: sí');
    expect(textoCorto('Antes y después:', 2)).toBe('Antes');
  });

  it('parte en líneas que caben, y avisa si no caben', () => {
    const lineas = partirLineas('UNO DOS TRES CUATRO', (s) => s.length * 10, 90, 3);
    expect(lineas).toEqual(['UNO DOS', 'TRES', 'CUATRO']);
    expect(partirLineas('UNO DOS TRES CUATRO', (s) => s.length * 10, 90, 2)).toBeNull();
    expect(partirLineas('LARGUISIMA', (s) => s.length * 10, 50, 3)).toBeNull();
    expect(partirLineas('', (s) => s.length, 10, 3)).toEqual([]);
  });

  it('usa la letra más grande que cabe, y achica cuando el texto es largo', () => {
    const corto = ajustarLetra('GRATIS', medir, 1100, 450);
    const largo = ajustarLetra('ESTO CAMBIA TODO LO QUE SABÍAS DE GRABAR', medir, 1100, 450);
    expect(corto.px).toBe(160);
    expect(corto.lineas).toEqual(['GRATIS']);
    expect(largo.px).toBeLessThan(corto.px);
    expect(largo.lineas.length).toBeLessThanOrEqual(3);
    for (const l of largo.lineas) expect(medir(l, largo.px)).toBeLessThanOrEqual(1100);
    expect(largo.lineas.length * largo.px * 1.12).toBeLessThanOrEqual(450);
    expect(largo.lineas.join(' ')).toBe('ESTO CAMBIA TODO LO QUE SABÍAS DE GRABAR');
  });

  it('la posición pone el bloque arriba, al centro o abajo, dentro de la imagen', () => {
    expect(yDelTexto('arriba', 200)).toBe(56);
    expect(yDelTexto('centro', 200)).toBe(260);
    expect(yDelTexto('abajo', 200)).toBe(ALTO - 56 - 200);
  });

  it('los estilos son de alto contraste y la máscara usa su color con letra legible', () => {
    expect(PINTURAS.amarillo.letra).toBe('#111111');
    expect(PINTURAS.contorno.contorno).toBe('#000000');
    expect(letraLegible('#ffd60a')).toBe('#111111');
    expect(letraLegible('#0b0a1a')).toBe('#ffffff');
    expect(pinturaDe('mascara', { principal: '#d7263d' })).toEqual({
      franja: '#d7263d',
      letra: '#ffffff',
      contorno: null,
    });
    // Sin máscara guardada, «mascara» cae en un estilo listo (nunca sin pintura).
    expect(pinturaDe('mascara', null)).toEqual(PINTURAS.amarillo);
  });

  it('el archivo se llama miniatura-<título>.jpg sin acentos ni símbolos', () => {
    expect(nombreMiniatura('¿Cómo grabar tu pantalla?')).toBe('miniatura-como-grabar-tu-pantalla.jpg');
    expect(nombreMiniatura('!!!')).toBe('miniatura-video.jpg');
  });
});

/** Un lienzo de mentira que anota lo que se pinta (jsdom no dibuja). */
function lienzoFalso() {
  const llamadas: { fn: string; args: unknown[] }[] = [];
  const canvas = { width: 300, height: 150 };
  const ctx = new Proxy({ canvas, font: '', filter: 'none' } as Record<string, unknown>, {
    get(o, k: string) {
      if (k in o) return o[k];
      if (k === 'measureText') return (s: string) => ({ width: s.length * 40 });
      return (...args: unknown[]) => llamadas.push({ fn: k, args });
    },
    set(o, k: string, v) {
      o[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, llamadas, canvas };
}

describe('CANDADO C-MINIATURA: dibujo', () => {
  const base = {
    fuente: null,
    idioma: 'es',
    pintura: PINTURAS.amarillo,
    posicion: 'abajo' as const,
    encuadre: 'desenfocado' as const,
  };

  it('pinta en 1280 × 720 el texto en mayúsculas, y sin imagen igual hay fondo (nunca en blanco)', () => {
    const { ctx, llamadas, canvas } = lienzoFalso();
    dibujarMiniatura(ctx, { ...base, texto: 'Hola mundo', marca: false });
    expect([canvas.width, canvas.height]).toEqual([ANCHO, ALTO]);
    expect(llamadas.find((l) => l.fn === 'fillRect')?.args).toEqual([0, 0, ANCHO, ALTO]);
    const textos = llamadas.filter((l) => l.fn === 'fillText').map((l) => l.args[0]);
    expect(textos.join(' ')).toBe('HOLA MUNDO');
    expect(textos).not.toContain('pantalay.com');
  });

  it('con marca (plan gratis) lleva «pantalay.com» arriba a la derecha', () => {
    const { ctx, llamadas } = lienzoFalso();
    dibujarMiniatura(ctx, { ...base, texto: 'Hola', marca: true });
    const marca = llamadas.find((l) => l.fn === 'fillText' && l.args[0] === 'pantalay.com');
    expect(marca).toBeTruthy();
    expect(marca!.args[1] as number).toBeGreaterThan(ANCHO / 2);
    expect(marca!.args[2] as number).toBeLessThan(ALTO / 4);
  });

  it('un vertical con fondo desenfocado se dibuja dos veces (fondo y frente)', () => {
    const { ctx, llamadas } = lienzoFalso();
    const imagen = {} as CanvasImageSource;
    dibujarMiniatura(ctx, { ...base, fuente: { imagen, ancho: 1080, alto: 1920 }, texto: '', marca: false });
    expect(llamadas.filter((l) => l.fn === 'drawImage')).toHaveLength(2);
    const { ctx: c2, llamadas: l2 } = lienzoFalso();
    dibujarMiniatura(c2, {
      ...base,
      encuadre: 'recorte',
      fuente: { imagen, ancho: 1080, alto: 1920 },
      texto: '',
      marca: false,
    });
    expect(l2.filter((l) => l.fn === 'drawImage')).toHaveLength(1);
  });
});
