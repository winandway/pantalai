// Cuentas para marcar con el mouse qué parte de la pantalla se graba. Todo en fracciones (0 a 1).
import type { Area } from './grabadora';

const limitar = (n: number) => Math.min(1, Math.max(0, n));
/** Lo mínimo que puede medir el área (un 8 % de la pantalla de cada lado). */
export const MINIMA = 0.08;

/** El rectángulo entre dos puntos (se puede arrastrar hacia cualquier lado). */
export function areaEntre(a: { x: number; y: number }, b: { x: number; y: number }): Area {
  const x = limitar(Math.min(a.x, b.x));
  const y = limitar(Math.min(a.y, b.y));
  return { x, y, ancho: limitar(Math.max(a.x, b.x)) - x, alto: limitar(Math.max(a.y, b.y)) - y };
}

/** Mover el área entera sin que se salga de la pantalla. */
export function moverArea(area: Area, dx: number, dy: number): Area {
  return {
    ...area,
    x: Math.min(1 - area.ancho, Math.max(0, area.x + dx)),
    y: Math.min(1 - area.alto, Math.max(0, area.y + dy)),
  };
}

export type Esquina = 'no' | 'ne' | 'so' | 'se';

/** Estirar el área desde una esquina; la esquina opuesta queda fija. */
export function estirarArea(area: Area, esquina: Esquina, punto: { x: number; y: number }): Area {
  const fija = {
    x: esquina === 'no' || esquina === 'so' ? area.x + area.ancho : area.x,
    y: esquina === 'no' || esquina === 'ne' ? area.y + area.alto : area.y,
  };
  return areaEntre(fija, punto);
}

/** ¿Sirve para grabar? (no puede ser una rayita). */
export function areaValida(area: Area | null | undefined): area is Area {
  return !!area && area.ancho >= MINIMA && area.alto >= MINIMA;
}

/**
 * Rectángulo con una forma fija (r = ancho / alto, en fracciones de la pantalla) entre un punto fijo y el mouse,
 * hacia el lado que se arrastre y sin salirse de la pantalla.
 */
export function rectConProporcion(
  fija: { x: number; y: number },
  punto: { x: number; y: number },
  r: number,
): Area {
  const dx = punto.x >= fija.x ? 1 : -1;
  const dy = punto.y >= fija.y ? 1 : -1;
  const libreX = dx > 0 ? 1 - fija.x : fija.x;
  const libreY = dy > 0 ? 1 - fija.y : fija.y;
  // Manda el lado que más se estiró, sin pasarse del espacio libre.
  let ancho = Math.max(Math.abs(punto.x - fija.x), Math.abs(punto.y - fija.y) * r);
  ancho = Math.min(ancho, libreX, libreY * r);
  const alto = ancho / r;
  return { x: dx > 0 ? fija.x : fija.x - ancho, y: dy > 0 ? fija.y : fija.y - alto, ancho, alto };
}

/** Lleva un área a la forma pedida (r = ancho / alto en fracciones), con el mismo centro y dentro de la pantalla. */
export function ajustarProporcion(area: Area | null | undefined, r: number): Area {
  const base = areaValida(area) ? area : { x: 0, y: 0, ancho: 1, alto: 1 };
  const cx = base.x + base.ancho / 2;
  const cy = base.y + base.alto / 2;
  let ancho = Math.min(base.ancho, base.alto * r);
  if (!areaValida(area)) ancho = Math.min(0.9, 0.9 * r);
  ancho = Math.min(ancho, 1, r);
  const alto = ancho / r;
  return moverArea({ x: cx - ancho / 2, y: cy - alto / 2, ancho, alto }, 0, 0);
}

/** La esquina que queda quieta al estirar desde «esquina». */
export function esquinaOpuesta(area: Area, esquina: Esquina): { x: number; y: number } {
  return {
    x: esquina === 'no' || esquina === 'so' ? area.x + area.ancho : area.x,
    y: esquina === 'no' || esquina === 'ne' ? area.y + area.alto : area.y,
  };
}
