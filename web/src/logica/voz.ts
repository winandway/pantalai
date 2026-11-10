// Cartel «Hablando / Escuchando» y barras de sonido del Estudio (CANDADO C-HABLANDO, fase 4): lo puro.
// El cartel se enciende cuando la voz pasa un umbral y se apaga solo cuando baja de otro más bajo y pasó un rato
// (histéresis): así no parpadea entre sílabas ni con un ruido suelto.

/** Nivel (0 a 1) de un trozo de sonido en el tiempo (bytes 0-255 del analizador, 128 = silencio). */
export function nivelDeMuestras(m: Uint8Array): number {
  if (!m.length) return 0;
  let suma = 0;
  for (const v of m) {
    const x = (v - 128) / 128;
    suma += x * x;
  }
  // La raíz del promedio (RMS) de una voz normal anda en 0,05 a 0,3: se estira para que las barras se muevan bien.
  return Math.min(1, Math.sqrt(suma / m.length) * 3.2);
}

export class DetectorVoz {
  private encendido = false;
  private ultimaVoz = -Infinity;
  constructor(
    private readonly umbral = 0.12,
    private readonly umbralApagar = 0.07,
    private readonly sostenerMs = 450,
  ) {}

  /** Recibe el nivel de ahora y dice si está hablando. */
  actualizar(nivel: number, ahora: number): boolean {
    if (nivel >= this.umbral || (this.encendido && nivel >= this.umbralApagar)) {
      this.encendido = true;
      this.ultimaVoz = ahora;
    } else if (this.encendido && ahora - this.ultimaVoz > this.sostenerMs) {
      this.encendido = false;
    }
    return this.encendido;
  }
}

/**
 * Alturas (0,15 a 1) de las barras de sonido: la del medio sigue la voz y las de los lados un poco menos, con un leve
 * vaivén para que parezca un ecualizador. En silencio quedan bajitas y quietas.
 */
export function alturasBarras(nivel: number, n = 4, fase = 0): number[] {
  const v = Math.min(1, Math.max(0, nivel));
  return Array.from({ length: n }, (_, i) => {
    const centro = 1 - Math.abs(i - (n - 1) / 2) / n;
    const vaiven = v > 0.05 ? 0.15 * Math.sin(fase + i * 1.7) : 0;
    return Math.round(Math.min(1, Math.max(0.15, 0.15 + v * centro + vaiven)) * 100) / 100;
  });
}
