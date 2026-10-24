// «Para YouTube»: reglas para que lo que se copia se pegue en YouTube Studio sin un solo error.
// Estudio y fuentes: docs/YOUTUBE-POSICIONAMIENTO-2026.md.

export type EstiloTitulo = 'descriptivo' | 'directo' | 'impactante';
export type KitYoutube = {
  titulos: { estilo: EstiloTitulo; texto: string }[];
  /** Primera línea de la descripción: lo que se ve antes de «Mostrar más». */
  gancho: string;
  etiquetas: string[];
  hashtags: string[];
};

/** Límite de YouTube para todas las etiquetas juntas. */
export const MAX_ETIQUETAS = 500;
export const MAX_TITULO = 100;
export const MAX_GANCHO = 150;

/** Lo que YouTube cuenta por una etiqueta: las que tienen espacios llevan comillas (+2). */
const largoDe = (e: string) => e.length + (e.includes(' ') ? 2 : 0);

/** Cuántos caracteres ocupan las etiquetas en YouTube (con las comas que las separan). */
export function largoEtiquetas(etiquetas: string[]): number {
  return etiquetas.reduce((n, e, i) => n + largoDe(e) + (i ? 1 : 0), 0);
}

/**
 * Etiquetas limpias: sin «#», sin «<» ni «>» (YouTube las rechaza), sin comas internas, sin repetidas, de hasta 30
 * caracteres, y cortadas para que el total nunca pase de 500.
 */
export function limpiarEtiquetas(lista: string[], maximo = 35): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const cruda of lista) {
    const e = cruda
      .replace(/[#<>,"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!e || e.length > 30 || vistas.has(e)) continue;
    if (largoEtiquetas([...salida, e]) > MAX_ETIQUETAS) continue;
    vistas.add(e);
    salida.push(e);
    if (salida.length >= maximo) break;
  }
  return salida;
}

/** Hashtags: una palabra sin espacios ni signos, con «#», sin repetidos; 3 como máximo (lo que YouTube muestra). */
export function limpiarHashtags(lista: string[], maximo = 3): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const cruda of lista) {
    const limpio = cruda.replace(/[^\p{L}\p{N}_]/gu, '');
    // «#CineClásico» y «#cineclasico» son el mismo: se compara sin mayúsculas ni tildes.
    const llave = limpio.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (!limpio || /^\d+$/.test(limpio) || vistos.has(llave)) continue;
    vistos.add(llave);
    salida.push(`#${limpio}`);
    if (salida.length >= maximo) break;
  }
  return salida;
}

const minutoYoutube = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(Math.floor(s % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${seg}` : `${m}:${seg}`;
};

/** Regla oficial de YouTube para que los capítulos funcionen: empiezan en 0:00, son 3 o más y duran 10 s o más. */
export function capitulosValidos(capitulos: { segundo: number }[], duracion: number): boolean {
  if (capitulos.length < 3 || capitulos[0]!.segundo !== 0) return false;
  return capitulos.every((c, i) => {
    const fin = capitulos[i + 1]?.segundo ?? duracion;
    return fin - c.segundo >= 10;
  });
}

/** La descripción lista para pegar: gancho, resumen, capítulos (si sirven) y hashtags. */
export function descripcionYoutube(d: {
  gancho: string;
  resumen: string;
  capitulos: { segundo: number; titulo: string }[];
  duracion: number;
  hashtags: string[];
  idioma: string;
}): string {
  const partes: string[] = [];
  if (d.gancho.trim()) partes.push(d.gancho.trim());
  if (d.resumen.trim() && d.resumen.trim() !== d.gancho.trim()) partes.push(d.resumen.trim());
  if (capitulosValidos(d.capitulos, d.duracion))
    partes.push(
      [
        d.idioma.startsWith('es') ? 'Capítulos:' : 'Chapters:',
        ...d.capitulos.map((c) => `${minutoYoutube(c.segundo)} ${c.titulo}`),
      ].join('\n'),
    );
  if (d.hashtags.length) partes.push(d.hashtags.join(' '));
  return partes.join('\n\n').slice(0, 5000);
}

/** El resumen y los capítulos tal como se ven en la página, para copiarlos de un clic. */
export function textoResumen(resumen: string, capitulos: { segundo: number; titulo: string }[]): string {
  return [resumen.trim(), capitulos.map((c) => `${minutoYoutube(c.segundo)} ${c.titulo}`).join('\n')]
    .filter(Boolean)
    .join('\n\n');
}
