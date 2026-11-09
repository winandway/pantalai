// Direcciones por idioma para Google (9 nov 2026, plan de SEO de Richard: «necesitamos aparecer en las búsquedas»).
// Inglés es el principal y va sin prefijo («/», «/docs/…»); el español vive bajo «/es/…» con las MISMAS palabras en
// inglés en la dirección (regla de EE. UU.). Cada página pública tiene su gemela en el otro idioma (hreflang).
// Candado C-SEO-IDIOMAS en CANDADOS.md.
import type { Idioma } from './idioma';

/** El idioma que manda la dirección: «/es…» es español; lo demás, inglés. */
export function idiomaDeRuta(ruta: string): Idioma {
  return ruta === '/es' || ruta.startsWith('/es/') ? 'es' : 'en';
}

/** La dirección sin el «/es» del principio («/es/docs» → «/docs», «/es» → «/»). */
export function sinPrefijo(ruta: string): string {
  if (ruta === '/es' || ruta === '/es/') return '/';
  return ruta.startsWith('/es/') ? ruta.slice(3) : ruta;
}

/** La misma página en el idioma pedido («/docs» + es → «/es/docs»; «/» + es → «/es»). */
export function conIdioma(ruta: string, idioma: Idioma): string {
  const base = sinPrefijo(ruta);
  if (idioma === 'en') return base;
  return base === '/' ? '/es' : `/es${base}`;
}

/** Páginas públicas que existen en los dos idiomas (las de la cuenta, el panel y los videos, no). */
export function esPublicaTraducible(rutaSinPrefijo: string, slugsExtra: readonly string[] = []): boolean {
  const r = rutaSinPrefijo.replace(/\/+$/, '') || '/';
  if (r === '/' || r === '/docs' || /^\/docs\/[a-z0-9-]+$/.test(r)) return true;
  return slugsExtra.includes(r.slice(1));
}
