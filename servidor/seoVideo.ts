// SEO de la red de videos (CANDADO C-SEO-VIDEOS, 25 nov 2026, Richard): la página de cada video y la de cada canal
// salen del servidor con todo lo que Google, las redes y los buscadores de IA necesitan para tratarlas como la
// página de un video de una red social: dirección propia, idioma del video, tarjeta completa, datos de video
// (VideoObject) con transcripción y capítulos, ruta de navegación y enlaces a más videos. Todo es lectura.
import { DOMINIO } from './seo';

export type VideoSeo = {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  autor: string;
  duracion: number;
  ancho: number;
  alto: number;
  tiene_miniatura: boolean;
  /** Idioma del video («es» o «en»): manda sobre el idioma de la página. */
  idioma: string;
  /** JSON guardado: [{ inicio, fin, texto }]. */
  transcripcion: string;
  /** JSON guardado: [{ segundo, titulo }]. */
  capitulos: string;
  publicado_en: number;
  vistas: number;
  me_gusta: number;
  /**
   * JSON guardado de «Para YouTube» (títulos, gancho, etiquetas y hashtags que la IA escribió con lo que se dice en
   * el video). Lo mismo que se le sugiere al creador para YouTube se usa aquí para los buscadores.
   */
  youtube?: string | null;
};

export type TextosBusqueda = { gancho: string; etiquetas: string[]; hashtags: string[]; titulos: string[] };

/** Los textos de «Para YouTube» ya limpios: sin repetidos, sin «#», con topes. Con datos rotos, todo vacío. */
export function textosDeBusqueda(json: string | null | undefined): TextosBusqueda {
  let d: Record<string, unknown> = {};
  try {
    const x: unknown = JSON.parse(json || '{}');
    if (x && typeof x === 'object' && !Array.isArray(x)) d = x as Record<string, unknown>;
  } catch {
    d = {};
  }
  const textos = (x: unknown, max: number, largo: number) => {
    const vistos = new Set<string>();
    return (Array.isArray(x) ? x : [])
      .map((e) =>
        typeof e === 'string'
          ? e
          : typeof (e as { texto?: unknown })?.texto === 'string'
            ? (e as { texto: string }).texto
            : '',
      )
      .map((e) => e.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, largo))
      .filter((e) => {
        const llave = e.toLowerCase();
        if (!e || vistos.has(llave)) return false;
        vistos.add(llave);
        return true;
      })
      .slice(0, max);
  };
  return {
    gancho: typeof d.gancho === 'string' ? d.gancho.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
    etiquetas: textos(d.etiquetas, 35, 60),
    hashtags: textos(d.hashtags, 5, 40).map((h) => h.replace(/\s+/g, '')),
    titulos: textos(d.titulos, 3, 120),
  };
}

/** Hashtags y etiquetas juntos, sin repetir (primero los hashtags). */
export function clavesDe(b: TextosBusqueda): string[] {
  const vistos = new Set<string>();
  return [...b.hashtags, ...b.etiquetas].filter((e) => {
    const llave = e.toLowerCase();
    if (vistos.has(llave)) return false;
    vistos.add(llave);
    return true;
  });
}

export type EnlaceVideo = { id: string; titulo: string; autor: string };

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ldJson = (x: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`;

function lista<T>(json: string): T[] {
  try {
    const x: unknown = JSON.parse(json || '[]');
    return Array.isArray(x) ? (x as T[]) : [];
  } catch {
    return [];
  }
}

/** La transcripción en texto corrido (lo que se dice en el video), con un tope de letras. */
export function textoTranscripcion(json: string, max = 5000): string {
  const t = lista<{ texto?: unknown }>(json)
    .map((s) => (typeof s.texto === 'string' ? s.texto.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, t.lastIndexOf(' ', max) > 0 ? t.lastIndexOf(' ', max) : max)}…` : t;
}

/** Los capítulos válidos, en orden. */
export function capitulosDe(json: string): { segundo: number; titulo: string }[] {
  return lista<{ segundo?: unknown; titulo?: unknown }>(json)
    .filter(
      (c): c is { segundo: number; titulo: string } =>
        typeof c.segundo === 'number' &&
        c.segundo >= 0 &&
        typeof c.titulo === 'string' &&
        c.titulo.trim() !== '',
    )
    .map((c) => ({ segundo: Math.floor(c.segundo), titulo: c.titulo.trim() }))
    .sort((a, b) => a.segundo - b.segundo);
}

/** Un resumen que cabe en el resultado de Google: se corta en una palabra entera, nunca a media palabra. */
export function resumenCorto(texto: string, max = 160): string {
  const t = texto.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.lastIndexOf(' ', max - 1);
  return `${t.slice(0, corte > max * 0.5 ? corte : max - 1).replace(/[\s,;:.]+$/, '')}…`;
}

const idiomaDe = (v: { idioma: string }) => (v.idioma === 'es' ? 'es' : 'en');

const PISTAS_ES =
  /[ñ¿¡áéíóú]|\b(?:el|la|los|las|un|una|de|del|que|y|con|para|por|como|cómo|este|esta|más|muy|se|su|al|es)\b/gi;
const PISTAS_EN = /\b(?:the|a|an|of|and|to|with|for|how|this|that|is|are|in|on|my|your|you|it|from|by)\b/gi;

/**
 * El idioma en que está escrito un texto (español o inglés), contando palabras muy comunes de cada uno. Sirve para
 * decirle a Google el idioma real del video: el guardado solo dice en qué idioma estaba la pantalla al grabar.
 */
export function idiomaDelTexto(texto: string, respaldo: string): 'es' | 'en' {
  const es = texto.match(PISTAS_ES)?.length ?? 0;
  const en = texto.match(PISTAS_EN)?.length ?? 0;
  if (es === en) return respaldo === 'es' ? 'es' : 'en';
  return es > en ? 'es' : 'en';
}

const reloj = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = String(Math.floor(s % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
};

const TEXTOS = {
  en: {
    videos: 'Videos',
    por: 'By',
    vistas: 'views',
    capitulos: 'Chapters',
    transcripcion: 'Transcript',
    temas: 'Topics',
    mas: 'More videos on Pantalay',
    grabar: 'Record your screen and camera free with Pantalay',
    respaldo: (titulo: string, autor: string) =>
      `Watch “${titulo}” by ${autor} on Pantalay, the free screen and camera recorder with instant sharing.`,
    canal: (nombre: string, n: number) =>
      `Watch ${n === 1 ? 'the video' : `the ${n} videos`} published by ${nombre} on Pantalay, the free screen and camera recorder with instant sharing.`,
    videosDe: (nombre: string) => `${nombre} · Videos on Pantalay`,
  },
  es: {
    videos: 'Videos',
    por: 'Por',
    vistas: 'vistas',
    capitulos: 'Capítulos',
    transcripcion: 'Transcripción',
    temas: 'Temas',
    mas: 'Más videos en Pantalay',
    grabar: 'Graba tu pantalla y tu cámara gratis con Pantalay',
    respaldo: (titulo: string, autor: string) =>
      `Mira «${titulo}» de ${autor} en Pantalay, el grabador de pantalla y cámara gratis con enlace al instante.`,
    canal: (nombre: string, n: number) =>
      `Mira ${n === 1 ? 'el video' : `los ${n} videos`} que ${nombre} publicó en Pantalay, el grabador de pantalla y cámara gratis con enlace al instante.`,
    videosDe: (nombre: string) => `${nombre} · Videos en Pantalay`,
  },
};

const EDITOR = {
  '@type': 'Organization',
  name: 'Pantalay',
  url: `${DOMINIO}/`,
  logo: { '@type': 'ImageObject', url: `${DOMINIO}/icon.png` },
};

const urlVideo = (id: string) => `${DOMINIO}/videos/${id}`;
const miniaturaDe = (v: { id: string; tiene_miniatura: boolean }) =>
  v.tiene_miniatura ? `${DOMINIO}/media/${v.id}/miniatura` : `${DOMINIO}/og.png`;

/** El idioma real del video, leído de su título, su descripción y lo que se dice en él. */
export function idiomaVideo(v: VideoSeo): 'es' | 'en' {
  return idiomaDelTexto(
    `${v.titulo} ${v.descripcion} ${textoTranscripcion(v.transcripcion, 2000)}`,
    v.idioma,
  );
}

/** El resumen del video: su descripción; si no tiene, lo que se dice en él; si tampoco, una frase con su título. */
export function resumenVideo(v: VideoSeo, max = 160): string {
  const base =
    v.descripcion.trim() ||
    textosDeBusqueda(v.youtube).gancho ||
    textoTranscripcion(v.transcripcion, 400) ||
    TEXTOS[idiomaVideo(v)].respaldo(v.titulo, v.autor);
  return resumenCorto(base, max);
}

/** Los datos de video para Google (VideoObject) y la ruta de navegación. */
export function datosVideo(v: VideoSeo): Record<string, unknown>[] {
  const idioma = idiomaVideo(v);
  const url = urlVideo(v.id);
  const transcripcion = textoTranscripcion(v.transcripcion);
  const capitulos = capitulosDe(v.capitulos);
  const duracion = Math.max(1, Math.round(v.duracion));
  const video: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${url}#video`,
    name: v.titulo,
    description: resumenVideo(v, 500),
    thumbnailUrl: [miniaturaDe(v)],
    uploadDate: new Date(v.publicado_en).toISOString(),
    duration: `PT${duracion}S`,
    contentUrl: `${DOMINIO}/media/${v.id}/video`,
    embedUrl: `${DOMINIO}/embed/${v.id}`,
    url,
    mainEntityOfPage: url,
    inLanguage: idioma,
    isFamilyFriendly: true,
    author: { '@type': 'Person', name: v.autor, url: `${DOMINIO}/channel/${v.usuario_id}` },
    publisher: EDITOR,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: v.vistas,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: v.me_gusta,
      },
    ],
  };
  if (v.ancho > 0 && v.alto > 0) {
    video.width = v.ancho;
    video.height = v.alto;
  }
  if (transcripcion) video.transcript = transcripcion;
  const busqueda = textosDeBusqueda(v.youtube);
  const claves = clavesDe(busqueda);
  if (claves.length) video.keywords = claves.join(', ');
  const otrosTitulos = busqueda.titulos.filter((t) => t.toLowerCase() !== v.titulo.trim().toLowerCase());
  if (otrosTitulos.length) video.alternateName = otrosTitulos;
  if (capitulos.length)
    video.hasPart = capitulos.map((c, i) => ({
      '@type': 'Clip',
      name: c.titulo,
      startOffset: c.segundo,
      endOffset: capitulos[i + 1]?.segundo ?? duracion,
      url: `${url}?t=${c.segundo}`,
    }));
  const ruta = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Pantalay', item: `${DOMINIO}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: TEXTOS[idioma].videos,
        item: `${DOMINIO}${idioma === 'es' ? '/es' : ''}/videos`,
      },
      { '@type': 'ListItem', position: 3, name: v.titulo, item: url },
    ],
  };
  return [video, ruta];
}

const poner = (html: string, patron: RegExp, etiqueta: string) =>
  patron.test(html)
    ? html.replace(patron, () => etiqueta)
    : html.replace('</head>', () => `${etiqueta}\n  </head>`);

/** Cambia (o agrega) las etiquetas de la cabecera que comparten la página de un video y la de un canal. */
function cabecera(
  html: string,
  d: { idioma: string; titulo: string; resumen: string; url: string; imagen: string; tipo: string },
): string {
  const t = esc(d.titulo);
  const r = esc(d.resumen);
  let h = html
    .replace(/<html lang="[^"]*"/, () => `<html lang="${d.idioma}"`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${t}</title>`);
  h = poner(h, /<meta name="description"[^>]*>/, `<meta name="description" content="${r}" />`);
  h = poner(h, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${d.url}" />`);
  h = poner(h, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${d.tipo}" />`);
  h = poner(h, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}" />`);
  h = poner(h, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${r}" />`);
  h = poner(h, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${d.imagen}" />`);
  h = poner(h, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${d.url}" />`);
  h = poner(
    h,
    /<meta property="og:locale"[^>]*>/,
    `<meta property="og:locale" content="${d.idioma === 'es' ? 'es_ES' : 'en_US'}" />`,
  );
  h = poner(h, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${t}" />`);
  h = poner(
    h,
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${r}" />`,
  );
  h = poner(h, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${d.imagen}" />`);
  // Vista previa grande en Google: miniatura grande, texto sin recorte y vista previa del video.
  h = poner(
    h,
    /<meta name="robots"[^>]*>/,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />',
  );
  return h;
}

/** La página de un video de la red, completa: cabecera, datos de video y el contenido escrito en el HTML. */
export function paginaVideo(html: string, v: VideoSeo, otros: EnlaceVideo[] = []): string {
  const idioma = idiomaVideo(v);
  const tx = TEXTOS[idioma];
  const url = urlVideo(v.id);
  const imagen = miniaturaDe(v);
  const duracion = Math.max(1, Math.round(v.duracion));
  const capitulos = capitulosDe(v.capitulos);
  const transcripcion = textoTranscripcion(v.transcripcion, 20000);
  const busqueda = textosDeBusqueda(v.youtube);
  const buscar = (q: string) => `/videos/search?q=${encodeURIComponent(q)}`;
  const extra = [
    `<meta property="og:image:alt" content="${esc(v.titulo)}" />`,
    `<meta property="og:video" content="${DOMINIO}/media/${v.id}/video" />`,
    `<meta property="og:video:secure_url" content="${DOMINIO}/media/${v.id}/video" />`,
    '<meta property="og:video:type" content="video/mp4" />',
    ...(v.ancho > 0 && v.alto > 0
      ? [
          `<meta property="og:video:width" content="${v.ancho}" />`,
          `<meta property="og:video:height" content="${v.alto}" />`,
        ]
      : []),
    `<meta property="video:duration" content="${duracion}" />`,
    `<meta property="video:release_date" content="${new Date(v.publicado_en).toISOString()}" />`,
    `<meta name="author" content="${esc(v.autor)}" />`,
    ...(busqueda.etiquetas.length
      ? [`<meta name="keywords" content="${esc(busqueda.etiquetas.join(', '))}" />`]
      : []),
    ...clavesDe(busqueda)
      .slice(0, 12)
      .map((e) => `<meta property="video:tag" content="${esc(e)}" />`),
    ...datosVideo(v).map(ldJson),
  ].join('\n    ');
  const cuerpo = [
    '<main><article>',
    `<nav><a href="/">Pantalay</a> › <a href="${idioma === 'es' ? '/es' : ''}/videos">${tx.videos}</a></nav>`,
    `<h1>${esc(v.titulo)}</h1>`,
    `<img src="${imagen.replace(DOMINIO, '')}" alt="${esc(v.titulo)}"${v.ancho > 0 && v.alto > 0 ? ` width="${v.ancho}" height="${v.alto}"` : ''} />`,
    `<p>${tx.por} <a href="/channel/${v.usuario_id}">${esc(v.autor)}</a> · <time datetime="${new Date(v.publicado_en).toISOString()}">${new Date(v.publicado_en).toISOString().slice(0, 10)}</time> · ${v.vistas} ${tx.vistas} · ${reloj(duracion)}</p>`,
    v.descripcion.trim() ? `<p>${esc(v.descripcion.trim())}</p>` : '',
    busqueda.gancho && busqueda.gancho !== v.descripcion.trim() ? `<p>${esc(busqueda.gancho)}</p>` : '',
    busqueda.hashtags.length
      ? `<p>${busqueda.hashtags.map((h) => `<a href="${buscar(h)}">#${esc(h)}</a>`).join(' ')}</p>`
      : '',
    capitulos.length
      ? `<section><h2>${tx.capitulos}</h2><ol>${capitulos.map((c) => `<li><a href="/videos/${v.id}?t=${c.segundo}">${reloj(c.segundo)} ${esc(c.titulo)}</a></li>`).join('')}</ol></section>`
      : '',
    transcripcion ? `<section><h2>${tx.transcripcion}</h2><p>${esc(transcripcion)}</p></section>` : '',
    busqueda.etiquetas.length
      ? `<section><h2>${tx.temas}</h2><ul>${busqueda.etiquetas.map((e) => `<li><a href="${buscar(e)}">${esc(e)}</a></li>`).join('')}</ul></section>`
      : '',
    '</article>',
    otros.length
      ? `<aside><h2>${tx.mas}</h2><ul>${otros.map((o) => `<li><a href="/videos/${o.id}">${esc(o.titulo)}</a> · ${esc(o.autor)}</li>`).join('')}</ul></aside>`
      : '',
    `<p><a href="${idioma === 'es' ? '/es' : '/'}">${tx.grabar}</a></p>`,
    '</main>',
  ].join('');
  return cabecera(html, {
    idioma,
    titulo: `${v.titulo} · ${v.autor} · Pantalay`,
    resumen: resumenVideo(v),
    url,
    imagen,
    tipo: 'video.other',
  })
    .replace('</head>', () => `  ${extra}\n  </head>`)
    .replace('<div id="raiz"></div>', () => `<div id="raiz">${cuerpo}</div>`);
}

export type CanalSeo = {
  id: string;
  nombre: string;
  /** Idioma de la mayoría de sus videos. */
  idioma: string;
  videos: { id: string; titulo: string; tiene_miniatura: boolean; publicado_en: number }[];
};

/** La página pública de un creador: su perfil (ProfilePage) y la lista de sus videos, escritos en el HTML. */
export function paginaCanal(html: string, c: CanalSeo): string {
  const idioma = idiomaDe(c);
  const tx = TEXTOS[idioma];
  const url = `${DOMINIO}/channel/${c.id}`;
  const primero = c.videos[0];
  const imagen = primero ? miniaturaDe(primero) : `${DOMINIO}/og.png`;
  const perfil = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': url,
    url,
    name: tx.videosDe(c.nombre),
    inLanguage: idioma,
    mainEntity: {
      '@type': 'Person',
      name: c.nombre,
      url,
    },
    hasPart: c.videos.slice(0, 50).map((v) => ({
      '@type': 'VideoObject',
      name: v.titulo,
      url: urlVideo(v.id),
      thumbnailUrl: miniaturaDe(v),
      uploadDate: new Date(v.publicado_en).toISOString(),
    })),
  };
  const cuerpo = [
    '<main>',
    `<nav><a href="/">Pantalay</a> › <a href="${idioma === 'es' ? '/es' : ''}/videos">${tx.videos}</a></nav>`,
    `<h1>${esc(c.nombre)}</h1>`,
    `<p>${esc(tx.canal(c.nombre, c.videos.length))}</p>`,
    `<ul>${c.videos.map((v) => `<li><a href="/videos/${v.id}">${esc(v.titulo)}</a></li>`).join('')}</ul>`,
    `<p><a href="${idioma === 'es' ? '/es' : '/'}">${tx.grabar}</a></p>`,
    '</main>',
  ].join('');
  return cabecera(html, {
    idioma,
    titulo: tx.videosDe(c.nombre),
    resumen: resumenCorto(tx.canal(c.nombre, c.videos.length)),
    url,
    imagen,
    tipo: 'profile',
  })
    .replace('</head>', () => `  ${ldJson(perfil)}\n  </head>`)
    .replace('<div id="raiz"></div>', () => `<div id="raiz">${cuerpo}</div>`);
}

/** La parte de /llms.txt con los videos públicos más nuevos, para que una IA los encuentre y los cite. */
export function videosParaIA(
  videos: { id: string; titulo: string; autor: string; descripcion: string }[],
): string {
  if (!videos.length) return '';
  const filas = videos
    .map((v) => {
      const resumen = resumenCorto(v.descripcion, 200);
      return `- [${v.titulo.replace(/[[\]]/g, '')}](${urlVideo(v.id)}): ${v.autor}${resumen ? `. ${resumen}` : ''}`;
    })
    .join('\n');
  return `\n## Latest public videos\n\nPublic videos published by creators on Pantalay Videos (${DOMINIO}/videos). Each page includes the video, its description, chapters and transcript.\n\n${filas}\n`;
}

// ---------- IndexNow: avisar a Bing y a los buscadores que lo usan (también alimenta a los asistentes de IA) ----------
/** Llave pública de IndexNow (no es un secreto: el protocolo pide publicarla en un archivo del propio sitio). */
export const LLAVE_INDEXNOW = 'b7f3c1a94e2d4f6a8c05d19e7ab3246f';

/** El aviso de «esta página es nueva o cambió». Solo sale desde el sitio público; en pruebas y en local no se manda. */
export async function avisarIndexNow(
  origen: string,
  urls: string[],
  pedir: typeof fetch = fetch,
): Promise<boolean> {
  if (origen !== DOMINIO || !urls.length) return false;
  try {
    const r = await pedir('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(DOMINIO).host,
        key: LLAVE_INDEXNOW,
        keyLocation: `${DOMINIO}/${LLAVE_INDEXNOW}.txt`,
        urlList: urls,
      }),
    });
    if (!r.ok) console.error('indexnow', r.status);
    return r.ok;
  } catch (e) {
    console.error('indexnow', e);
    return false;
  }
}
