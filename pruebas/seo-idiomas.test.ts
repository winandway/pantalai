import { describe, expect, it } from 'vitest';
import { metaDeRuta, prepararCabecera, rutasPublicas, sitemap } from '../servidor/dominio';
import { contenidoDeRuta, datosEstructurados } from '../servidor/seo';
import { conIdioma, esPublicaTraducible, idiomaDeRuta, sinPrefijo } from '../web/src/logica/rutasIdioma';
import { LANDINGS } from '../web/src/paginas/landings';

// CANDADO C-SEO-IDIOMAS (9 nov 2026): cada página pública existe en inglés («/…») y en español («/es/…»), con su
// idioma, su título, su texto para Google, sus etiquetas hreflang y su lugar en el mapa del sitio.
const BASE = `<!doctype html>
<html lang="en">
  <head>
    <title>Pantalay</title>
    <meta name="description" content="x" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="x" />
    <meta property="og:description" content="x" />
    <meta property="og:url" content="x" />
  </head>
  <body><div id="raiz"></div></body>
</html>`;

describe('direcciones por idioma', () => {
  it('el español va bajo /es con las mismas palabras en inglés', () => {
    expect(idiomaDeRuta('/es/docs/start-here')).toBe('es');
    expect(idiomaDeRuta('/es')).toBe('es');
    expect(idiomaDeRuta('/essentials')).toBe('en');
    expect(sinPrefijo('/es/screen-recorder')).toBe('/screen-recorder');
    expect(sinPrefijo('/es')).toBe('/');
    expect(conIdioma('/docs', 'es')).toBe('/es/docs');
    expect(conIdioma('/', 'es')).toBe('/es');
    expect(conIdioma('/es/docs', 'en')).toBe('/docs');
    expect(esPublicaTraducible('/docs/x')).toBe(true);
    expect(esPublicaTraducible('/library')).toBe(false);
    expect(esPublicaTraducible('/screen-recorder', ['screen-recorder'])).toBe(true);
  });
});

describe('lo que recibe Google', () => {
  it('la portada en español: idioma, título, hreflang y texto en español', () => {
    const h = prepararCabecera(BASE, '/es', []);
    expect(h).toContain('<html lang="es">');
    expect(h).toContain('<title>Grabar pantalla gratis online');
    expect(h).toContain('hreflang="en" href="https://pantalay.com/"');
    expect(h).toContain('hreflang="es" href="https://pantalay.com/es"');
    expect(h).toContain('hreflang="x-default" href="https://pantalay.com/"');
    expect(h).toContain('<h1>Pantalay — Grabador de pantalla gratis');
    expect(h).toContain('og:locale" content="es_ES"');
  });

  it('la portada en inglés sigue en inglés y apunta a su gemela', () => {
    const h = prepararCabecera(BASE, '/', []);
    expect(h).toContain('<html lang="en">');
    expect(h).toContain('<title>Free Screen Recorder Online');
    expect(h).toContain('hreflang="es" href="https://pantalay.com/es"');
  });

  it('cada página por búsqueda tiene título, texto, preguntas y datos estructurados en los dos idiomas', () => {
    for (const l of LANDINGS) {
      for (const [ruta, idioma] of [
        [`/${l.slug}`, 'en'],
        [`/es/${l.slug}`, 'es'],
      ] as const) {
        expect(metaDeRuta(ruta)).toEqual({
          titulo: l[idioma].titulo,
          descripcion: l[idioma].descripcion,
          indexar: true,
        });
        const texto = contenidoDeRuta(ruta)!;
        expect(texto).toContain(`<h1>${l[idioma].h1.replace(/&/g, '&amp;')}</h1>`);
        const ld = datosEstructurados(ruta);
        expect(ld).toContain('"@type":"FAQPage"');
        expect(ld).toContain('"@type":"HowTo"');
        expect(ld).toContain(`"inLanguage":"${idioma}"`);
        // Títulos y descripciones con largo razonable para Google.
        expect(l[idioma].titulo.length).toBeLessThanOrEqual(70);
        expect(l[idioma].descripcion.length).toBeLessThanOrEqual(170);
      }
    }
  });

  it('las guías en español enlazan a su versión en español', () => {
    const texto = contenidoDeRuta('/es/docs')!;
    expect(texto).toContain('href="/es/docs/start-here"');
    expect(texto).toContain('Empieza aquí');
    expect(metaDeRuta('/es/docs/start-here')!.titulo).toContain('Empieza aquí');
  });

  it('las páginas privadas no se indexan, tampoco con /es', () => {
    expect(metaDeRuta('/studio')!.indexar).toBe(false);
    expect(prepararCabecera(BASE, '/library', [])).not.toContain('hreflang');
  });

  it('el mapa del sitio trae las dos versiones de cada página, enlazadas', () => {
    const rutas = rutasPublicas();
    expect(rutas).toContain('/es');
    expect(rutas).toContain('/screen-recorder');
    expect(rutas).toContain('/es/reaction-video-maker');
    expect(rutas).toContain('/es/docs/start-here');
    const xml = sitemap();
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain(
      '<loc>https://pantalay.com/es/screen-recorder</loc><xhtml:link rel="alternate" hreflang="en" href="https://pantalay.com/screen-recorder"/>',
    );
  });
});
