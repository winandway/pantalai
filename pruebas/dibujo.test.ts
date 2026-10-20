import { describe, expect, it } from 'vitest';
import {
  aCoordenadas,
  anchoLinea,
  APAGA_MS,
  opacidad,
  pintar,
  Pizarra,
  QUEDA_MS,
} from '../web/src/logica/dibujo';

/** Lienzo falso: anota lo que se le pide pintar. */
function lienzoFalso() {
  const llamadas: string[] = [];
  const ctx = {
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    save: () => llamadas.push('save'),
    restore: () => llamadas.push('restore'),
    beginPath: () => llamadas.push('beginPath'),
    moveTo: (x: number, y: number) => llamadas.push(`moveTo ${x},${y}`),
    lineTo: (x: number, y: number) => llamadas.push(`lineTo ${Math.round(x)},${Math.round(y)}`),
    stroke: () => llamadas.push(`stroke ${String(ctx.strokeStyle)} ${ctx.globalAlpha.toFixed(2)}`),
    fill: () => llamadas.push('fill'),
    closePath: () => llamadas.push('closePath'),
    ellipse: (x: number, y: number, rx: number, ry: number) => llamadas.push(`ellipse ${x},${y} ${rx},${ry}`),
    strokeRect: (x: number, y: number, w: number, h: number) => llamadas.push(`rect ${x},${y} ${w},${h}`),
    arc: () => llamadas.push('arc'),
  };
  return { ctx, llamadas };
}

describe('lápices (C-LAPICES)', () => {
  it('un trazo de lápiz se pinta en píxeles del video, con su color', () => {
    const p = new Pizarra();
    p.empezar('lapiz', '#ff3b30', 'medio', [0.1, 0.2]);
    p.mover([0.5, 0.5]);
    p.soltar(1000);
    const { ctx, llamadas } = lienzoFalso();
    pintar(ctx, p, 1920, 1080, 1000);
    expect(llamadas).toContain('moveTo 192,216');
    expect(llamadas).toContain('lineTo 960,540');
    expect(llamadas).toContain('stroke #ff3b30 1.00');
  });

  it('el resaltador es más ancho y transparente', () => {
    const p = new Pizarra();
    p.empezar('resaltador', '#ffcc00', 'medio', [0, 0]);
    p.mover([1, 1]);
    const { ctx, llamadas } = lienzoFalso();
    pintar(ctx, p, 1000, 1000, 0);
    expect(llamadas.some((l) => l.startsWith('stroke #ffcc00 0.38'))).toBe(true);
    expect(anchoLinea({ herramienta: 'resaltador', grosor: 'medio' }, 1000, 1000)).toBe(
      3 * anchoLinea({ herramienta: 'lapiz', grosor: 'medio' }, 1000, 1000),
    );
  });

  it('cuadro, círculo y flecha usan el punto de inicio y el de ahora', () => {
    const p = new Pizarra();
    p.empezar('cuadro', '#0a84ff', 'fino', [0.5, 0.5]);
    p.mover([0.4, 0.4]);
    p.mover([0.2, 0.3]);
    p.soltar(0);
    p.empezar('circulo', '#34c759', 'fino', [0, 0]);
    p.mover([0.5, 0.5]);
    p.soltar(0);
    p.empezar('flecha', '#ffffff', 'grueso', [0, 0]);
    p.mover([1, 0]);
    p.soltar(0);
    expect(p.trazos[0]!.puntos).toEqual([
      [0.5, 0.5],
      [0.2, 0.3],
    ]);
    const { ctx, llamadas } = lienzoFalso();
    pintar(ctx, p, 100, 100, 0);
    expect(llamadas).toContain('rect 20,30 30,20');
    expect(llamadas).toContain('ellipse 25,25 25,25');
    expect(llamadas.filter((l) => l === 'fill')).toHaveLength(1); // la punta de la flecha
  });

  it('deshacer quita el último y borrar quita todo', () => {
    const p = new Pizarra();
    for (const c of ['#ff3b30', '#0a84ff', '#34c759']) {
      p.empezar('lapiz', c, 'fino', [0, 0]);
      p.soltar(0);
    }
    p.deshacer();
    expect(p.trazos.map((t) => t.color)).toEqual(['#ff3b30', '#0a84ff']);
    p.borrar();
    expect(p.trazos).toHaveLength(0);
  });

  it('con «desvanecer» el trazo se queda 3 s, se apaga en 1 s y se olvida', () => {
    const p = new Pizarra();
    p.desvanecer = true;
    p.empezar('lapiz', '#ff3b30', 'fino', [0, 0]);
    expect(opacidad(p.trazos[0]!, 99_999, true)).toBe(1); // mientras se dibuja no se apaga
    p.soltar(1000);
    expect(p.visibles(1000 + QUEDA_MS)[0]!.alfa).toBe(1);
    expect(p.visibles(1000 + QUEDA_MS + APAGA_MS / 2)[0]!.alfa).toBeCloseTo(0.5);
    expect(p.visibles(1000 + QUEDA_MS + APAGA_MS + 1)).toHaveLength(0);
    expect(p.trazos).toHaveLength(0);
  });

  it('sin «desvanecer» el trazo se queda para siempre', () => {
    const p = new Pizarra();
    p.empezar('lapiz', '#ff3b30', 'fino', [0, 0]);
    p.soltar(0);
    expect(p.visibles(10 * 60_000)).toHaveLength(1);
  });

  it('el puntero se traduce a la imagen aunque el video tenga franjas negras', () => {
    // Caja de 1000×1000 con un video 16:9: la imagen ocupa 1000×562.5, centrada en vertical.
    const caja = { left: 0, top: 0, width: 1000, height: 1000 };
    expect(aCoordenadas(500, 500, caja, 1920, 1080)).toEqual([0.5, 0.5]);
    const [x, y] = aCoordenadas(0, 218.75, caja, 1920, 1080)!;
    expect(x).toBe(0);
    expect(y).toBeCloseTo(0);
    // Fuera de la imagen queda pegado al borde.
    expect(aCoordenadas(500, 0, caja, 1920, 1080)).toEqual([0.5, 0]);
    expect(aCoordenadas(1, 1, { left: 0, top: 0, width: 0, height: 0 }, 1, 1)).toBeNull();
  });
});
