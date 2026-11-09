// Probador de micrófono: dice claro cuándo NO llega señal (micrófono apagado, sin batería, desconectado o mal
// elegido). Pedido de Richard el 9 nov 2026: su micrófono se quedó sin batería y lo único que lo delataba era una
// barrita que no se movía. Candado C-PROBADOR-MICROFONO en CANDADOS.md.

/**
 * Por debajo de esto no hay señal: un micrófono vivo siempre trae un poco de ruido de fondo (la escucha se hace SIN
 * los filtros de voz, que sí dejan todo en cero cuando hay silencio). Uno apagado o sin batería entrega ceros.
 */
export const PICO_SIN_SENAL = 0.0008;
/** Cuántos segundos seguidos sin señal antes de avisar (que un silencio corto no asuste). */
export const SEGUNDOS_SIN_SENAL = 3;

export type EstadoMicrofono = 'probando' | 'llega' | 'sin_senal' | 'sin_microfono';

/** El pico (valor absoluto más alto) de un trozo de sonido. */
export function picoDe(muestras: ArrayLike<number>): number {
  let pico = 0;
  for (let i = 0; i < muestras.length; i++) {
    const v = Math.abs(muestras[i]!);
    if (v > pico) pico = v;
  }
  return pico;
}

/** Nivel de 0 a 1 para la barrita (el mismo cálculo del mezclador de la grabadora). */
export function nivelDe(muestras: ArrayLike<number>): number {
  if (!muestras.length) return 0;
  let suma = 0;
  for (let i = 0; i < muestras.length; i++) suma += muestras[i]! * muestras[i]!;
  return Math.min(1, Math.sqrt(suma / muestras.length) * 4);
}

/** Vigila el micrófono: recibe el pico de cada lectura y dice si llega señal o lleva rato sin llegar. */
export class VigiaMicrofono {
  private sinSenalDesde: number | null = null;
  private algunaVez = false;

  constructor(
    private umbral = PICO_SIN_SENAL,
    private segundos = SEGUNDOS_SIN_SENAL,
  ) {}

  /** `ahora` en milisegundos. */
  leer(pico: number, ahora: number): EstadoMicrofono {
    if (pico >= this.umbral) {
      this.sinSenalDesde = null;
      this.algunaVez = true;
      return 'llega';
    }
    this.sinSenalDesde ??= ahora;
    if (ahora - this.sinSenalDesde >= this.segundos * 1000) return 'sin_senal';
    return this.algunaVez ? 'llega' : 'probando';
  }
}
