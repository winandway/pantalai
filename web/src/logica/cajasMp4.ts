// Lectura mínima de las «cajas» de primer nivel de un MP4 (ftyp, moov, mdat, moof…). No decodifica nada: solo
// mira los encabezados de 8 o 16 bytes. Sirve en el navegador (¿hace falta rehacer el índice?) y en el servidor
// (¿lo que llegó de verdad trae el índice al principio?). CANDADO C-INDICE-MP4.

/** Tipos de las cajas de primer nivel que se alcanzan a ver en estos bytes (aunque la última no quepa entera). */
export function cajasDeArriba(b: Uint8Array): string[] {
  const tipos: string[] = [];
  let i = 0;
  while (i + 8 <= b.length && tipos.length < 64) {
    const v = new DataView(b.buffer, b.byteOffset + i, Math.min(16, b.length - i));
    let tam = v.getUint32(0);
    const tipo = String.fromCharCode(b[i + 4]!, b[i + 5]!, b[i + 6]!, b[i + 7]!);
    if (!/^[\x20-\x7e]{4}$/.test(tipo)) break;
    tipos.push(tipo);
    if (tam === 1) {
      if (i + 16 > b.length) break;
      tam = Number(v.getBigUint64(8));
    } else if (tam === 0) break; // llega hasta el final del archivo
    if (tam < 8) break;
    i += tam;
  }
  return tipos;
}

/**
 * ¿El índice (moov) está al principio y el archivo NO viene en fragmentos? Es lo que permite saltar a cualquier
 * minuto al instante. Con los primeros 64 KB alcanza: el encabezado de moov aparece antes que el de mdat.
 */
export function indiceAlPrincipio(cabeza: Uint8Array): boolean {
  const t = cajasDeArriba(cabeza);
  if (t[0] !== 'ftyp') return false;
  if (t.includes('moof')) return false;
  const moov = t.indexOf('moov');
  const mdat = t.indexOf('mdat');
  return moov > 0 && (mdat === -1 || moov < mdat);
}

/** ¿La copia reordenada se puede poner en lugar del original? (pura, probada) */
export function copiaIndiceValida(
  cabeza: Uint8Array,
  bytesCopia: number,
  bytesOriginal: number,
  duracionCopia: number,
  duracionOriginal: number,
): boolean {
  if (!indiceAlPrincipio(cabeza)) return false;
  // Reordenar sin re-codificar casi no cambia el peso (se quitan los encabezados de cada fragmento).
  if (bytesOriginal > 0 && (bytesCopia < bytesOriginal * 0.8 || bytesCopia > bytesOriginal * 1.1))
    return false;
  if (
    duracionOriginal > 0 &&
    Math.abs(duracionCopia - duracionOriginal) > Math.max(2, duracionOriginal * 0.03)
  )
    return false;
  return bytesCopia > 0;
}
