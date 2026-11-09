// La dirección principal de Pantalay es pantalay.com (20 oct 2026). La de sitios.dev y la de www siguen
// funcionando: las páginas pasan solas (301) a pantalay.com con la misma ruta, así no se rompe ningún enlace viejo.
// /datos y /media NO se redirigen: los reproductores insertados y las descargas viejas siguen andando tal cual.
import { GUIAS } from '../web/src/paginas/guias';
import { LEGALES, legalPorSlug } from '../web/src/paginas/legales';
import { contenidoDeRuta, datosEstructurados, DOMINIO } from './seo';
import { LANDINGS, landingPorSlug, SLUGS_LANDING } from '../web/src/paginas/landings';
import { conIdioma, esPublicaTraducible, idiomaDeRuta, sinPrefijo } from '../web/src/logica/rutasIdioma';
import type { Idioma } from '../web/src/logica/idioma';

/** Las páginas públicas en inglés (cada una tiene su gemela en español bajo «/es»). */
function rutasBase(): string[] {
  return [
    '/',
    ...LANDINGS.map((l) => `/${l.slug}`),
    '/videos',
    '/docs',
    ...GUIAS.map((g) => `/docs/${g.slug}`),
    ...LEGALES.map((l) => `/${l.slug}`),
  ];
}

/** ¿Esta página pública tiene versión en los dos idiomas? */
function traducible(ruta: string): boolean {
  const base = sinPrefijo(ruta);
  return (
    esPublicaTraducible(base, [...SLUGS_LANDING, ...LEGALES.map((l) => l.slug), 'videos']) &&
    rutasBase().includes(base.replace(/\/+$/, '') || '/')
  );
}

/** Las etiquetas hreflang de una página: inglés, español y x-default (inglés). */
export function alternasIdioma(ruta: string): { idioma: Idioma | 'x-default'; url: string }[] {
  if (!traducible(ruta)) return [];
  const base = sinPrefijo(ruta.replace(/\/+$/, '') || '/');
  return [
    { idioma: 'en', url: `${DOMINIO}${conIdioma(base, 'en')}` },
    { idioma: 'es', url: `${DOMINIO}${conIdioma(base, 'es')}` },
    { idioma: 'x-default', url: `${DOMINIO}${conIdioma(base, 'en')}` },
  ];
}

export { DOMINIO };
export const HOSTS_VIEJOS = new Set(['pantalai.sitios.dev', 'www.pantalay.com']);

/** Adónde mandar una petición que llegó por una dirección vieja; null si se atiende ahí mismo. */
export function redireccion(url: string, metodo: string): string | null {
  const u = new URL(url);
  if (!HOSTS_VIEJOS.has(u.hostname)) return null;
  if (metodo !== 'GET' && metodo !== 'HEAD') return null;
  if (u.pathname.startsWith('/datos/') || u.pathname.startsWith('/media/')) return null;
  return `${DOMINIO}${u.pathname}${u.search}`;
}

/** Páginas públicas para Google y los buscadores de IA. */
export function rutasPublicas(): string[] {
  const base = rutasBase();
  return [...base, ...base.map((r) => conIdioma(r, 'es'))];
}

/** Mapa del sitio con las dos versiones de cada página enlazadas (hreflang), como pide Google; más los videos de la red. */
export function sitemap(videosRed: { id: string; publicado_en: number }[] = []): string {
  const urls = rutasPublicas()
    .map((r) => {
      const alternas = alternasIdioma(r)
        .map((a) => `<xhtml:link rel="alternate" hreflang="${a.idioma}" href="${a.url}"/>`)
        .join('');
      return `  <url><loc>${DOMINIO}${r}</loc>${alternas}</url>`;
    })
    .concat(
      videosRed.map(
        (v) =>
          `  <url><loc>${DOMINIO}/videos/${v.id}</loc><lastmod>${new Date(v.publicado_en).toISOString().slice(0, 10)}</lastmod></url>`,
      ),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/** Buscadores de IA invitados por su nombre (además de todos los demás con «*»). */
export const BOTS_IA = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
  'Bingbot',
  'DuckAssistBot',
  'Amazonbot',
  'meta-externalagent',
  'MistralAI-User',
  'cohere-ai',
];

export function robots(): string {
  const privadas = [
    '/datos/',
    '/media/',
    '/library',
    '/record',
    '/studio',
    '/checkout',
    '/account',
    '/panel/',
    '/admin',
  ];
  const bloque = (agente: string) =>
    `User-agent: ${agente}\nAllow: /\n${privadas.map((p) => `Disallow: ${p}`).join('\n')}\n`;
  return `${['*', ...BOTS_IA].map(bloque).join('\n')}\nSitemap: ${DOMINIO}/sitemap.xml\n# Guide for AI assistants: ${DOMINIO}/llms.txt\n`;
}

// ---------- Google Search Console ----------
// La verificación se puede hacer de tres formas y las tres quedan listas:
// 1) registro TXT en el DNS (no toca el código), 2) etiqueta <meta> y 3) archivo HTML. Para 2 y 3 basta poner el
// código que da Google en la variable del sitio GOOGLE_VERIFICACION (varios separados por coma) y republicar.

/** Códigos de verificación de Google limpios (solo letras, números, guion y guion bajo). */
export function codigosGoogle(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((x) =>
      x
        .trim()
        .replace(/^google/, '')
        .replace(/\.html$/, ''),
    )
    .filter((x) => /^[A-Za-z0-9_-]{6,120}$/.test(x));
}

export function etiquetasGoogle(codigos: string[]): string {
  return codigos.map((c) => `<meta name="google-site-verification" content="${c}" />`).join('\n    ');
}

/** Archivo de verificación «google<código>.html»: lo que Google espera leer adentro. */
export function archivoGoogle(nombre: string, codigos: string[]): string | null {
  const m = /^google([A-Za-z0-9_-]+)\.html$/.exec(nombre);
  return m && codigos.includes(m[1]!) ? `google-site-verification: ${nombre}` : null;
}

// ---------- título y resumen de cada página para Google ----------

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Título y resumen que ve Google en cada página pública, en el idioma de su dirección (español bajo «/es»). */
export function metaDeRuta(ruta: string): { titulo: string; descripcion: string; indexar: boolean } | null {
  if (
    // Palabra completa: «/record-screen-and-camera» es pública aunque empiece como «/record».
    /^\/(?:(?:library|record|studio|pricing|admin|panel|checkout|reset-password|verify-email|account|team|join)(?:\/|$)|embed\/|v\/[^/]+\/edit)/.test(
      ruta,
    )
  )
    return { titulo: 'Pantalay', descripcion: '', indexar: false };
  const idioma = idiomaDeRuta(ruta);
  const es = idioma === 'es';
  const r = sinPrefijo(ruta).replace(/\/+$/, '') || '/';
  if (r === '/')
    return es
      ? {
          titulo: 'Grabar pantalla gratis online con cámara y enlace al instante | Pantalay',
          descripcion:
            'Grabador de pantalla gratis en tu navegador: graba pantalla, cámara y sonido, comparte con un enlace en segundos y descarga en MP4. Estudio de reacciones para YouTube y TikTok.',
          indexar: true,
        }
      : {
          titulo: 'Free Screen Recorder Online — Record Screen & Camera | Pantalay',
          descripcion:
            'Free screen recorder in your browser: record your screen, camera and sound, share a link in seconds and download MP4. Reaction studio for YouTube and TikTok.',
          indexar: true,
        };
  if (r === '/docs')
    return {
      titulo: es ? 'Docs de Pantalay: guías para grabar tu pantalla' : 'Docs · Pantalay',
      descripcion: es
        ? 'Guías de Pantalay: graba tu pantalla y tu cámara, recorta, dibuja mientras grabas, comparte, descarga en MP4 y usa la IA.'
        : 'Guides for Pantalay: record your screen and camera, trim, draw while you record, share, download MP4 and use AI.',
      indexar: true,
    };
  if (r === '/videos')
    return es
      ? {
          titulo: 'Videos hechos con Pantalay: reacciones, tutoriales y más',
          descripcion:
            'Mira videos de reacción, tutoriales e historias grabados con Pantalay, el grabador de pantalla gratis.',
          indexar: true,
        }
      : {
          titulo: 'Videos made with Pantalay: reactions, tutorials and more',
          descripcion:
            'Watch reaction videos, tutorials and stories recorded with Pantalay, the free screen recorder.',
          indexar: true,
        };
  const landing = landingPorSlug(r.slice(1));
  if (landing)
    return { titulo: landing[idioma].titulo, descripcion: landing[idioma].descripcion, indexar: true };
  const m = /^\/docs\/([a-z0-9-]+)$/.exec(r);
  const g = m ? GUIAS.find((x) => x.slug === m[1]) : undefined;
  if (g)
    return { titulo: `${g[idioma].titulo} · Pantalay Docs`, descripcion: g[idioma].resumen, indexar: true };
  const l = legalPorSlug(r.slice(1));
  if (l) return { titulo: `${l[idioma].titulo} · Pantalay`, descripcion: l[idioma].resumen, indexar: true };
  return null;
}

/** Aplica a la página base: verificación de Google, título, resumen, tarjeta y si se indexa. */
export function prepararCabecera(html: string, ruta: string, codigos: string[]): string {
  let h = html;
  const meta = metaDeRuta(ruta);
  if (meta && meta.indexar) {
    const t = escapar(meta.titulo);
    const d = escapar(meta.descripcion);
    h = h
      .replace(/<title>[^<]*<\/title>/, () => `<title>${t}</title>`)
      .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${d}" />`)
      .replace(/<meta property="og:title"[^>]*>/, () => `<meta property="og:title" content="${t}" />`)
      .replace(
        /<meta property="og:description"[^>]*>/,
        () => `<meta property="og:description" content="${d}" />`,
      )
      .replace(
        /<meta property="og:url"[^>]*>/,
        () => `<meta property="og:url" content="${DOMINIO}${ruta.replace(/\/$/, '')}" />`,
      );
  }
  // El idioma de la página (para Google y los lectores de pantalla) y sus gemelas en el otro idioma (hreflang).
  if (idiomaDeRuta(ruta) === 'es') h = h.replace('<html lang="en">', '<html lang="es">');
  const alternas = alternasIdioma(ruta)
    .map((a) => `<link rel="alternate" hreflang="${a.idioma}" href="${a.url}" />`)
    .join('\n    ');
  if (idiomaDeRuta(ruta) === 'es')
    h = h
      .replace(/<meta property="og:locale"[^>]*>/, '')
      .replace(
        '<meta property="og:type"',
        '<meta property="og:locale" content="es_ES" />\n    <meta property="og:type"',
      );
  const extra = [
    alternas,
    meta && !meta.indexar ? '<meta name="robots" content="noindex" />' : '',
    etiquetasGoogle(codigos),
    '<link rel="alternate" type="text/plain" title="LLMs" href="/llms.txt" />',
    datosEstructurados(ruta),
  ]
    .filter(Boolean)
    .join('\n    ');
  if (extra) h = h.replace('</head>', () => `    ${extra}\n  </head>`);
  // El texto de la página, escrito en el HTML para quien no ejecuta JavaScript (React lo reemplaza al cargar).
  const texto = contenidoDeRuta(ruta);
  return texto ? h.replace('<div id="raiz"></div>', () => `<div id="raiz">${texto}</div>`) : h;
}
