// Cuentas del recortador de puntas: de píxeles a segundos, agarraderas que no se cruzan y la regla de tiempos.

/** Lo mínimo que puede durar el video recortado. */
export const MINIMO = 1;

/** Segundo que corresponde a una posición (en px) sobre la tira de ancho «ancho». */
export function segundoEn(x: number, ancho: number, duracion: number): number {
  if (ancho <= 0 || duracion <= 0) return 0;
  return Math.min(duracion, Math.max(0, (x / ancho) * duracion));
}

/** Mueve una agarradera sin que cruce a la otra ni se salga del video. */
export function moverAgarradera(
  cual: 'inicio' | 'fin',
  segundo: number,
  inicio: number,
  fin: number,
  duracion: number,
): { inicio: number; fin: number } {
  const redondo = (s: number) => Math.round(s * 10) / 10;
  if (cual === 'inicio') return { inicio: redondo(Math.max(0, Math.min(segundo, fin - MINIMO))), fin };
  return { inicio, fin: redondo(Math.min(duracion, Math.max(segundo, inicio + MINIMO))) };
}

/** Marcas de la regla: un paso cómodo según lo largo del video (2 s, 5 s, 10 s, 30 s, 1 min…). */
export function marcasRegla(duracion: number, maximo = 14): number[] {
  if (duracion <= 0) return [0];
  const pasos = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const paso = pasos.find((p) => duracion / p <= maximo) ?? 3600;
  const marcas: number[] = [];
  for (let s = 0; s <= duracion + 0.001; s += paso) marcas.push(s);
  return marcas;
}

/** En qué segundos sacar las fotos de la tira (en el medio de cada casilla). */
export function segundosDeFotos(duracion: number, cuantas: number): number[] {
  if (duracion <= 0 || cuantas <= 0) return [];
  return Array.from({ length: cuantas }, (_, i) => ((i + 0.5) * duracion) / cuantas);
}

/** Lo que se guarda: 0 en «fin» quiere decir «hasta el final». */
export function recorteParaGuardar(inicio: number, fin: number, duracion: number) {
  return {
    recorte_inicio: Math.max(0, Math.min(inicio, duracion)),
    recorte_fin: fin >= duracion - 0.05 ? 0 : fin,
  };
}
