// La dirección principal de Pantalay es pantalay.com (20 oct 2026). La de sitios.dev y la de www siguen
// funcionando: las páginas pasan solas (301) a pantalay.com con la misma ruta, así no se rompe ningún enlace viejo.
// /datos y /media NO se redirigen: los reproductores insertados y las descargas viejas siguen andando tal cual.
import { GUIAS } from '../web/src/paginas/guias';
import { LEGALES, legalPorSlug } from '../web/src/paginas/legales';
import { contenidoDeRuta, datosEstructurados, DOMINIO } from './seo';

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
  return ['/', '/docs', ...GUIAS.map((g) => `/docs/${g.slug}`), ...LEGALES.map((l) => `/${l.slug}`)];
}

export function sitemap(): string {
  const urls = rutasPublicas()
    .map((r) => `  <url><loc>${DOMINIO}${r}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
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

/** Título y resumen que ve Google en cada página pública (las guías de Docs llevan los suyos). */
export function metaDeRuta(ruta: string): { titulo: string; descripcion: string; indexar: boolean } | null {
  if (
    /^\/(library|record|embed\/|v\/[^/]+\/edit|pricing|admin|panel|checkout|reset-password|account)/.test(
      ruta,
    )
  )
    return { titulo: 'Pantalay', descripcion: '', indexar: false };
  if (ruta === '/docs' || ruta === '/docs/')
    return {
      titulo: 'Docs · Pantalay',
      descripcion:
        'Guides for Pantalay: record your screen and camera, trim, draw while you record, share, download MP4 and use AI.',
      indexar: true,
    };
  const m = /^\/docs\/([a-z0-9-]+)\/?$/.exec(ruta);
  const g = m ? GUIAS.find((x) => x.slug === m[1]) : undefined;
  if (g) return { titulo: `${g.en.titulo} · Pantalay Docs`, descripcion: g.en.resumen, indexar: true };
  const l = legalPorSlug(ruta.replace(/^\/|\/$/g, ''));
  if (l) return { titulo: `${l.en.titulo} · Pantalay`, descripcion: l.en.resumen, indexar: true };
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
  const extra = [
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
