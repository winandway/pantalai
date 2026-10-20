// Lógica pura del video: tiempos, transcripción, subtítulos, capítulos, cortes y silencios.
// Todo se calcula en el navegador: no cuesta nada ni depende de un proveedor de IA.

export type Segmento = { inicio: number; fin: number; texto: string };
export type Tramo = { inicio: number; fin: number };
export type Capitulo = { segundo: number; titulo: string };

export function formatoTiempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) seg = 0;
  const s = Math.floor(seg);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** Une tramos que se tocan o se pisan y los ordena. */
export function unirTramos(tramos: Tramo[]): Tramo[] {
  const orden = tramos
    .filter((t) => t.fin > t.inicio)
    .map((t) => ({ ...t }))
    .sort((a, b) => a.inicio - b.inicio);
  const salida: Tramo[] = [];
  for (const t of orden) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && t.inicio <= ultimo.fin + 0.05) ultimo.fin = Math.max(ultimo.fin, t.fin);
    else salida.push(t);
  }
  return salida;
}

/** Lo que se salta al reproducir: lo recortado al principio y al final, y los cortes del medio. */
export function tramosOcultos(
  duracion: number,
  recorteInicio: number,
  recorteFin: number,
  cortes: Tramo[],
): Tramo[] {
  const t: Tramo[] = [...cortes];
  if (recorteInicio > 0) t.push({ inicio: 0, fin: recorteInicio });
  if (recorteFin > 0 && recorteFin < duracion) t.push({ inicio: recorteFin, fin: duracion + 1 });
  return unirTramos(t);
}

/** Si el segundo cae dentro de un tramo oculto, adónde hay que saltar. null si no hay que saltar. */
export function siguienteVisible(segundo: number, ocultos: Tramo[]): number | null {
  for (const t of ocultos) if (segundo >= t.inicio && segundo < t.fin) return t.fin;
  return null;
}

/** Duración que de verdad se ve, descontando lo oculto. */
export function duracionVisible(duracion: number, ocultos: Tramo[]): number {
  let quitado = 0;
  for (const t of ocultos) quitado += Math.max(0, Math.min(t.fin, duracion) - Math.max(t.inicio, 0));
  return Math.max(0, duracion - quitado);
}

export function aVtt(segmentos: Segmento[]): string {
  const f = (s: number) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${sec}.${String(ms % 1000).padStart(3, '0')}`;
  };
  const cuerpo = segmentos
    .filter((s) => s.texto.trim())
    // line:72% sube los subtítulos para que la barra de controles no los tape.
    .map(
      (s, i) =>
        `${i + 1}\n${f(s.inicio)} --> ${f(Math.max(s.fin, s.inicio + 0.5))} line:72%\n${s.texto.trim()}`,
    )
    .join('\n\n');
  return `WEBVTT\n\n${cuerpo}\n`;
}

export function textoPlano(segmentos: Segmento[]): string {
  return segmentos.map((s) => `${formatoTiempo(s.inicio)} ${s.texto.trim()}`).join('\n');
}

const VACIAS = new Set(
  (
    'the a an and or but so to of in on at for is are was were be this that it i you we they my our your ' +
    'um uh like just okay ok yeah hello hi hey so now here there what how let me going gonna ' +
    'el la los las un una y o pero que de del en a por para es son fue este esta esto eso yo tu nosotros ' +
    'mi mis su sus hola bueno pues entonces eh este aquí ahí vamos voy a ver'
  ).split(' '),
);

/** Título automático a partir de lo que se dijo: las primeras palabras con peso de la primera frase útil. */
export function tituloAutomatico(segmentos: Segmento[], idioma: 'en' | 'es'): string | null {
  const texto = segmentos
    .map((s) => s.texto)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (texto.split(' ').length < 4) return null;
  const palabras = texto.split(' ');
  let i = 0;
  while (i < palabras.length && VACIAS.has(palabras[i]!.toLowerCase().replace(/[^\p{L}]/gu, ''))) i++;
  // Solo la primera frase: se corta en el primer punto, signo de pregunta o exclamación.
  const frase = palabras
    .slice(i, i + 8)
    .join(' ')
    .split(/[.!?]\s/u)[0]!
    .replace(/[.,;:!?¿¡]+$/u, '');
  if (!frase) return null;
  const titulo = frase.charAt(0).toUpperCase() + frase.slice(1);
  return titulo.length > 70
    ? `${titulo.slice(0, 67)}…`
    : titulo || (idioma === 'es' ? 'Grabación' : 'Recording');
}

/** Capítulos automáticos: corta donde hay una pausa larga entre frases, con un mínimo de duración. */
export function capitulosAutomaticos(segmentos: Segmento[], duracion: number): Capitulo[] {
  if (segmentos.length < 3 || duracion < 60) return [];
  const minimo = Math.max(30, duracion / 12);
  const caps: Capitulo[] = [];
  let ultimo = -Infinity;
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i]!;
    const anterior = segmentos[i - 1];
    const pausa = anterior ? s.inicio - anterior.fin : Infinity;
    if ((i === 0 || pausa >= 1.5) && s.inicio - ultimo >= minimo) {
      const palabras = s.texto
        .trim()
        .split(/\s+/)
        .slice(0, 6)
        .join(' ')
        .replace(/[.,;:!?]+$/u, '');
      if (!palabras) continue;
      caps.push({
        segundo: i === 0 ? 0 : Math.floor(s.inicio),
        titulo: palabras.charAt(0).toUpperCase() + palabras.slice(1),
      });
      ultimo = s.inicio;
    }
  }
  return caps.length >= 2 ? caps : [];
}

/**
 * Silencios largos a partir del volumen del audio (muestras ya promediadas por ventana).
 * Devuelve los tramos que se pueden quitar, dejando un respiro a cada lado.
 */
export function detectarSilencios(
  volumenes: number[],
  segundosPorVentana: number,
  { umbral = 0.02, minimo = 1.5, respiro = 0.3 } = {},
): Tramo[] {
  const salida: Tramo[] = [];
  let inicio: number | null = null;
  for (let i = 0; i <= volumenes.length; i++) {
    const callado = i < volumenes.length && volumenes[i]! < umbral;
    if (callado && inicio === null) inicio = i;
    if (!callado && inicio !== null) {
      const ini = inicio * segundosPorVentana;
      const fin = i * segundosPorVentana;
      if (fin - ini >= minimo) salida.push({ inicio: ini + respiro, fin: fin - respiro });
      inicio = null;
    }
  }
  return salida;
}

/** Volumen promedio (RMS) por ventana de un canal de audio. */
export function volumenPorVentana(muestras: Float32Array, tasa: number, segundosPorVentana = 0.1): number[] {
  const paso = Math.max(1, Math.floor(tasa * segundosPorVentana));
  const salida: number[] = [];
  for (let i = 0; i < muestras.length; i += paso) {
    let suma = 0;
    const fin = Math.min(muestras.length, i + paso);
    for (let j = i; j < fin; j++) suma += muestras[j]! * muestras[j]!;
    salida.push(Math.sqrt(suma / (fin - i)));
  }
  return salida;
}

/** Busca en la transcripción y devuelve los segmentos que contienen el texto. */
export function buscarEnTranscripcion(segmentos: Segmento[], q: string): number[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  return segmentos.flatMap((s, i) => (s.texto.toLowerCase().includes(n) ? [i] : []));
}

/** Índice del segmento que está sonando. */
export function segmentoActual(segmentos: Segmento[], segundo: number): number {
  for (let i = segmentos.length - 1; i >= 0; i--) if (segundo >= segmentos[i]!.inicio) return i;
  return -1;
}
