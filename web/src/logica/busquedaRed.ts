// Buscador de la red de videos (9 nov 2026, Richard: «tiene que ser un buen buscador»). Lo puro: normalizar el
// texto, puntuar cada video y ordenar. Lo usan el servidor (/datos/red/buscar) y las pruebas. Candado C-BUSCADOR.

/** Minúsculas, sin tildes ni signos: «Reacción» y «reaccion» son lo mismo. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Palabras tan comunes que no ayudan a buscar (en español e inglés). */
const VACIAS = new Set(
  'a al de del el la las los un una unos unas y o en con por para que es se su sus mi tu lo the of and or to in on for with is a an'.split(
    ' ',
  ),
);

/** Las palabras de la búsqueda (sin las vacías, salvo que sean lo único que se escribió). */
export function palabrasDe(consulta: string): string[] {
  const todas = normalizar(consulta).split(' ').filter(Boolean);
  const utiles = todas.filter((p) => !VACIAS.has(p));
  return (utiles.length ? utiles : todas).slice(0, 12);
}

export type VideoBuscable = {
  id: string;
  titulo: string;
  autor: string;
  descripcion: string;
  /** Lo que se dice en el video (transcripción en texto plano). */
  texto: string;
  me_gusta: number;
  vistas: number;
  publicado_en: number;
};

export type Resultado<T> = { video: T; puntos: number; fragmento: string };

/** ¿La palabra está en el texto? Al inicio de una palabra vale más que en el medio («rafa» en «rafaperez»). */
function encaja(textoNorm: string, palabra: string): 0 | 1 | 2 | 3 {
  if (!textoNorm.includes(palabra)) return 0;
  const palabras = textoNorm.split(' ');
  if (palabras.includes(palabra)) return 3;
  if (palabras.some((p) => p.startsWith(palabra))) return 2;
  return 1;
}

/** Un pedazo corto del texto alrededor de la primera palabra encontrada (para mostrar por qué salió). */
export function fragmentoDe(texto: string, palabras: string[], largo = 140): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (!limpio) return '';
  const norm = normalizar(limpio);
  // Se busca en el texto normalizado y se ubica la posición aproximada en el original (mismo largo de palabras).
  let pos = -1;
  for (const p of palabras) {
    const i = norm.indexOf(p);
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  const proporcion = norm.length ? pos / norm.length : 0;
  const centro = pos < 0 ? 0 : Math.round(proporcion * limpio.length);
  const inicio = Math.max(0, centro - Math.floor(largo / 3));
  const corte = limpio.slice(inicio, inicio + largo);
  return `${inicio > 0 ? '…' : ''}${corte}${inicio + largo < limpio.length ? '…' : ''}`;
}

/**
 * Puntúa y ordena. Pesos: título (lo más importante), creador, descripción y lo que se dice en el video. Tienen que
 * aparecer TODAS las palabras en algún lado; si ningún video las tiene todas, se muestran los que tienen alguna
 * (con menos puntos). La frase entera en el título suma más. Empates: más me gusta, más vistas, más nuevo.
 */
export function buscarEnRed<T extends VideoBuscable>(consulta: string, videos: T[]): Resultado<T>[] {
  const palabras = palabrasDe(consulta);
  if (!palabras.length) return [];
  const frase = palabras.join(' ');
  const puntuar = (v: T) => {
    const titulo = normalizar(v.titulo);
    const autor = normalizar(v.autor);
    const descripcion = normalizar(v.descripcion);
    const texto = normalizar(v.texto);
    let puntos = 0;
    let encontradas = 0;
    for (const p of palabras) {
      const t = encaja(titulo, p);
      const a = encaja(autor, p);
      const d = encaja(descripcion, p);
      const x = encaja(texto, p);
      if (t || a || d || x) encontradas++;
      puntos += t * 4 + a * 2.5 + d * 1.2 + x * 0.6;
    }
    if (palabras.length > 1 && titulo.includes(frase)) puntos += 10;
    if (titulo.startsWith(palabras[0]!)) puntos += 2;
    // Desempate suave por popularidad y novedad (nunca le gana a encontrar las palabras).
    puntos += Math.log10(1 + v.me_gusta) * 0.8 + Math.log10(1 + v.vistas) * 0.4;
    const fuente = titulo.includes(palabras[0]!)
      ? v.descripcion || v.texto
      : descripcion.includes(palabras[0]!)
        ? v.descripcion
        : v.texto || v.descripcion;
    return { video: v, puntos, encontradas, fragmento: fragmentoDe(fuente, palabras) };
  };
  const todos = videos.map(puntuar).filter((r) => r.encontradas > 0);
  const completos = todos.filter((r) => r.encontradas === palabras.length);
  const lista = completos.length ? completos : todos;
  return lista
    .sort((a, b) => b.puntos - a.puntos || b.video.publicado_en - a.video.publicado_en)
    .map(({ video, puntos, fragmento }) => ({ video, puntos, fragmento }));
}

/** Sugerencias mientras se escribe: títulos y creadores que empiezan con lo escrito (sin repetir). */
export function sugerencias(consulta: string, videos: VideoBuscable[], maximo = 8): string[] {
  const n = normalizar(consulta);
  if (!n) return [];
  const vistos = new Set<string>();
  const salida: string[] = [];
  const agregar = (t: string) => {
    const clave = normalizar(t);
    if (!clave || vistos.has(clave)) return;
    vistos.add(clave);
    salida.push(t);
  };
  for (const r of buscarEnRed(consulta, videos)) {
    agregar(r.video.titulo);
    if (normalizar(r.video.autor).includes(n)) agregar(r.video.autor);
    if (salida.length >= maximo) break;
  }
  return salida.slice(0, maximo);
}

/** Texto plano de una transcripción guardada (lista de segmentos con «texto»). */
export function textoDeTranscripcion(json: string, maximo = 20000): string {
  try {
    const lista = JSON.parse(json) as { texto?: unknown }[];
    if (!Array.isArray(lista)) return '';
    return lista
      .map((s) => (typeof s?.texto === 'string' ? s.texto : ''))
      .join(' ')
      .slice(0, maximo);
  } catch {
    return '';
  }
}
