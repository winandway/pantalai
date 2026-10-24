import { describe, expect, it } from 'vitest';
import {
  marcasRegla,
  MINIMO,
  moverAgarradera,
  recorteParaGuardar,
  segundoEn,
  segundosDeFotos,
} from '../web/src/logica/recorte';
import { opcionesRecorte } from '../web/src/logica/mp4';
import { firmaRecorte } from '../servidor/app';

describe('recortador de puntas (C-RECORTE-DESCARGA)', () => {
  it('de píxeles a segundos, sin salirse del video', () => {
    expect(segundoEn(250, 1000, 60)).toBe(15);
    expect(segundoEn(-30, 1000, 60)).toBe(0);
    expect(segundoEn(5000, 1000, 60)).toBe(60);
    expect(segundoEn(10, 0, 60)).toBe(0);
  });

  it('las agarraderas no se cruzan y dejan al menos un segundo', () => {
    expect(moverAgarradera('inicio', 3.27, 0, 50, 60)).toEqual({ inicio: 3.3, fin: 50 });
    expect(moverAgarradera('inicio', 55, 0, 50, 60)).toEqual({ inicio: 50 - MINIMO, fin: 50 });
    expect(moverAgarradera('fin', 2, 5, 50, 60)).toEqual({ inicio: 5, fin: 5 + MINIMO });
    expect(moverAgarradera('fin', 99, 5, 50, 60)).toEqual({ inicio: 5, fin: 60 });
    expect(moverAgarradera('inicio', -4, 5, 50, 60).inicio).toBe(0);
  });

  it('la regla elige un paso cómodo', () => {
    expect(marcasRegla(53)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(marcasRegla(10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marcasRegla(600).length).toBeLessThanOrEqual(15);
    expect(marcasRegla(0)).toEqual([0]);
  });

  it('las fotos de la tira van en el medio de cada casilla', () => {
    expect(segundosDeFotos(40, 4)).toEqual([5, 15, 25, 35]);
    expect(segundosDeFotos(0, 4)).toEqual([]);
  });

  it('lo que se guarda: 0 en el final quiere decir «hasta el final»', () => {
    expect(recorteParaGuardar(2, 60, 60)).toEqual({ recorte_inicio: 2, recorte_fin: 0 });
    expect(recorteParaGuardar(2, 41.5, 60)).toEqual({ recorte_inicio: 2, recorte_fin: 41.5 });
    expect(recorteParaGuardar(-1, 30, 60).recorte_inicio).toBe(0);
  });

  it('el MP4 se arma sin las puntas cortadas', () => {
    expect(opcionesRecorte()).toBeUndefined();
    expect(opcionesRecorte({ inicio: 0, fin: 0 })).toBeUndefined();
    expect(opcionesRecorte({ inicio: 2, fin: 0 })).toEqual({ start: 2, end: undefined });
    expect(opcionesRecorte({ inicio: 0, fin: 30 })).toEqual({ start: undefined, end: 30 });
    expect(firmaRecorte({ recorte_inicio: 1.234, recorte_fin: 0 })).toBe('1.2|0');
  });
});

describe('CANDADO C-RECORTE-ACELERADO: las puntas se preparan cuadro por cuadro', () => {
  it('prepara 20 s de cada punta, o el video entero si es corto', async () => {
    const { tramosPuntas } = await import('../web/src/logica/cuadros');
    expect(tramosPuntas(99.4)).toEqual([
      [0, 20],
      [79.4, 99.4],
    ]);
    expect(tramosPuntas(30)).toEqual([[0, 30]]);
    expect(tramosPuntas(0)).toEqual([]);
  });

  it('usa el cuadro guardado más cercano solo si está a menos de un cuarto de segundo', async () => {
    const { cuadroCercano } = await import('../web/src/logica/cuadros');
    const cuadros = [{ s: 0 }, { s: 0.25 }, { s: 0.5 }, { s: 80 }];
    expect(cuadroCercano(cuadros, 0.3)).toEqual({ s: 0.25 });
    expect(cuadroCercano(cuadros, 80.1)).toEqual({ s: 80 });
    expect(cuadroCercano(cuadros, 40)).toBeNull();
    expect(cuadroCercano([], 1)).toBeNull();
  });
});

describe('CANDADO C-AREA: grabar solo una parte de la pantalla', () => {
  it('el área se marca hacia cualquier lado, se mueve y se estira sin salirse de la pantalla', async () => {
    const { areaEntre, moverArea, estirarArea, areaValida } = await import('../web/src/logica/area');
    const casi = (a: Record<string, number>, b: Record<string, number>) =>
      Object.keys(b).forEach((k) => expect(a[k]).toBeCloseTo(b[k]!, 6));
    casi(areaEntre({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.1 }), { x: 0.2, y: 0.1, ancho: 0.6, alto: 0.8 });
    casi(moverArea({ x: 0.5, y: 0.5, ancho: 0.4, alto: 0.4 }, 0.5, -1), {
      x: 0.6,
      y: 0,
      ancho: 0.4,
      alto: 0.4,
    });
    casi(estirarArea({ x: 0.2, y: 0.2, ancho: 0.4, alto: 0.4 }, 'se', { x: 0.9, y: 0.7 }), {
      x: 0.2,
      y: 0.2,
      ancho: 0.7,
      alto: 0.5,
    });
    casi(estirarArea({ x: 0.2, y: 0.2, ancho: 0.4, alto: 0.4 }, 'no', { x: 0.1, y: 0.1 }), {
      x: 0.1,
      y: 0.1,
      ancho: 0.5,
      alto: 0.5,
    });
    expect(areaValida({ x: 0, y: 0, ancho: 0.02, alto: 0.5 })).toBe(false);
    expect(areaValida(null)).toBe(false);
  });

  it('en píxeles queda dentro de la pantalla, con medidas pares y de al menos 160 px', async () => {
    const { areaEnPixeles } = await import('../web/src/logica/grabadora');
    expect(areaEnPixeles({ x: 0.1, y: 0.1, ancho: 0.5, alto: 0.5 }, 1921, 1081)).toEqual({
      sx: 192,
      sy: 108,
      sw: 960,
      sh: 540,
    });
    const r = areaEnPixeles({ x: 0.99, y: 0.99, ancho: 0.01, alto: 0.01 }, 1920, 1080);
    expect(r).toEqual({ sx: 1760, sy: 920, sw: 160, sh: 160 });
  });
});
