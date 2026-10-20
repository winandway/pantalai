// La dirección principal de Pantalay es pantalay.com (20 oct 2026). La de sitios.dev y la de www siguen
// funcionando: las páginas pasan solas (301) a pantalay.com con la misma ruta, así no se rompe ningún enlace viejo.
// /datos y /media NO se redirigen: los reproductores insertados y las descargas viejas siguen andando tal cual.
import { GUIAS } from '../web/src/paginas/guias';

export const DOMINIO = 'https://pantalay.com';
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
  return ['/', '/docs', ...GUIAS.map((g) => `/docs/${g.slug}`)];
}

export function sitemap(): string {
  const urls = rutasPublicas()
    .map((r) => `  <url><loc>${DOMINIO}${r}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robots(): string {
  return `User-agent: *\nAllow: /\nDisallow: /datos/\nDisallow: /media/\nDisallow: /library\nDisallow: /record\n\nSitemap: ${DOMINIO}/sitemap.xml\n`;
}
