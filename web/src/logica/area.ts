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
