// Lápices para dibujar encima de lo que se graba: los trazos se guardan en coordenadas de 0 a 1
// (así sirven igual en la vista previa y en el video de 4K) y el compositor los pinta en cada cuadro.

export type Herramienta = 'lapiz' | 'resaltador' | 'flecha' | 'cuadro' | 'circulo';
export type Grosor = 'fino' | 'medio' | 'grueso';
export type Punto = [number, number];

export type Trazo = {
  herramienta: Herramienta;
  color: string;
  grosor: Grosor;
  puntos: Punto[];
  /** Cuándo se terminó de dibujar (ms de performance.now()); null mientras se dibuja. */
  fin: number | null;
};

export const COLORES = ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ffffff', '#111111'] as const;
export const NOMBRE_COLOR: Record<string, { en: string; es: string }> = {
  '#ff3b30': { en: 'Red', es: 'Rojo' },
  '#ffcc00': { en: 'Yellow', es: 'Amarillo' },
  '#34c759': { en: 'Green', es: 'Verde' },
  '#0a84ff': { en: 'Blue', es: 'Azul' },
  '#ffffff': { en: 'White', es: 'Blanco' },
  '#111111': { en: 'Black', es: 'Negro' },
};

/** Grosor como fracción del lado corto del video. */
const GROSOR: Record<Grosor, number> = { fino: 0.004, medio: 0.008, grueso: 0.016 };

/** Con «desvanecer», cada trazo se queda 3 segundos y se apaga en 1. */
export const QUEDA_MS = 3000;
export const APAGA_MS = 1000;

/** Opacidad del trazo en este instante (0 = ya no se ve). */
export function opacidad(t: Trazo, ahora: number, desvanecer: boolean): number {
  if (!desvanecer || t.fin === null) return 1;
  const pasado = ahora - t.fin;
  if (pasado <= QUEDA_MS) return 1;
  return Math.max(0, 1 - (pasado - QUEDA_MS) / APAGA_MS);
}

/** Ancho de la línea en píxeles para un lienzo de ancho × alto. */
export function anchoLinea(t: Pick<Trazo, 'grosor' | 'herramienta'>, ancho: number, alto: number): number {
  const base = Math.max(2, Math.min(ancho, alto) * GROSOR[t.grosor]);
  return t.herramienta === 'resaltador' ? base * 3 : base;
}

/** Convierte una posición del puntero sobre el video (que se ve «contain») a coordenadas 0..1. */
export function aCoordenadas(
  x: number,
  y: number,
  caja: { left: number; top: number; width: number; height: number },
  videoAncho: number,
  videoAlto: number,
): Punto | null {
  if (!caja.width || !caja.height) return null;
  const proporcion = videoAncho && videoAlto ? videoAncho / videoAlto : caja.width / caja.height;
  let w = caja.width;
  let h = caja.width / proporcion;
  if (h > caja.height) {
    h = caja.height;
    w = caja.height * proporcion;
  }
  const izq = caja.left + (caja.width - w) / 2;
  const arr = caja.top + (caja.height - h) / 2;
  const nx = (x - izq) / w;
  const ny = (y - arr) / h;
  return [Math.min(1, Math.max(0, nx)), Math.min(1, Math.max(0, ny))];
}

/** La pizarra: guarda los trazos, deshace, borra y quita los que ya se apagaron. */
export class Pizarra {
  trazos: Trazo[] = [];
  desvanecer = false;
  private actual: Trazo | null = null;

  empezar(herramienta: Herramienta, color: string, grosor: Grosor, p: Punto) {
    this.actual = { herramienta, color, grosor, puntos: [p], fin: null };
    this.trazos.push(this.actual);
  }

  mover(p: Punto) {
    const t = this.actual;
    if (!t) return;
    // Las figuras solo necesitan el punto de inicio y el de ahora.
    if (t.herramienta === 'lapiz' || t.herramienta === 'resaltador') t.puntos.push(p);
    else t.puntos[1] = p;
  }

  soltar(ahora: number) {
    if (!this.actual) return;
    this.actual.fin = ahora;
    this.actual = null;
  }

  deshacer() {
    this.actual = null;
    this.trazos.pop();
  }

  borrar() {
    this.actual = null;
    this.trazos = [];
  }

  /** Los trazos que todavía se ven; los apagados se olvidan. */
  visibles(ahora: number): { trazo: Trazo; alfa: number }[] {
    const lista = this.trazos.map((trazo) => ({ trazo, alfa: opacidad(trazo, ahora, this.desvanecer) }));
    this.trazos = lista.filter((x) => x.alfa > 0).map((x) => x.trazo);
    return lista.filter((x) => x.alfa > 0);
  }
}

type Lienzo2D = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'stroke'
  | 'fill'
  | 'closePath'
  | 'ellipse'
  | 'strokeRect'
  | 'arc'
> & {
  globalAlpha: number;
  strokeStyle: CanvasRenderingContext2D['strokeStyle'];
  fillStyle: CanvasRenderingContext2D['fillStyle'];
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
};

/** Pinta los trazos visibles encima de lo que ya hay en el lienzo. */
export function pintar(ctx: Lienzo2D, pizarra: Pizarra, ancho: number, alto: number, ahora: number) {
  for (const { trazo: t, alfa } of pizarra.visibles(ahora)) {
    const p = t.puntos.map(([x, y]) => [x * ancho, y * alto] as const);
    const a = p[0];
    if (!a) continue;
    const b = p[p.length - 1]!;
    const lw = anchoLinea(t, ancho, alto);
    ctx.save();
    ctx.globalAlpha = alfa * (t.herramienta === 'resaltador' ? 0.38 : 1);
    ctx.strokeStyle = t.color;
    ctx.fillStyle = t.color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (t.herramienta === 'lapiz' || t.herramienta === 'resaltador') {
      if (p.length === 1) {
        // Un toque suelto deja un punto.
        ctx.arc(a[0], a[1], lw / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(a[0], a[1]);
        for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      }
    } else if (t.herramienta === 'cuadro') {
      ctx.strokeRect(
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.abs(b[0] - a[0]),
        Math.abs(b[1] - a[1]),
      );
    } else if (t.herramienta === 'circulo') {
      ctx.ellipse(
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
        Math.abs(b[0] - a[0]) / 2,
        Math.abs(b[1] - a[1]) / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else {
      // Flecha: la línea y una punta rellena.
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const punta = lw * 4;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0] - Math.cos(ang) * punta * 0.6, b[1] - Math.sin(ang) * punta * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - Math.cos(ang - 0.45) * punta, b[1] - Math.sin(ang - 0.45) * punta);
      ctx.lineTo(b[0] - Math.cos(ang + 0.45) * punta, b[1] - Math.sin(ang + 0.45) * punta);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
