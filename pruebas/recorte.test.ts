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
