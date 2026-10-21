// Lo que leen Google y los buscadores de IA (ChatGPT, Claude, Perplexity, Gemini) sin ejecutar JavaScript:
// el texto de cada página pública escrito en el HTML, los datos estructurados (JSON-LD) y los archivos
// /llms.txt y /llms-full.txt. La app de React reemplaza ese texto al cargar, así que la persona ve lo de siempre.
import { FUNCIONES, PREGUNTAS as PREGUNTAS_IDIOMAS } from '../web/src/paginas/funciones';
import { GUIAS, SECCIONES } from '../web/src/paginas/guias';
import { ACTUALIZADO, CONTACTO, LEGALES, legalPorSlug } from '../web/src/paginas/legales';

export const DOMINIO = 'https://pantalay.com';

/** Las preguntas frecuentes en inglés (el idioma principal): las mismas que se ven en la portada. */
export const PREGUNTAS = PREGUNTAS_IDIOMAS.en;

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Título + resumen + texto de la página, en HTML simple. null = la ruta no tiene texto público. */
export function contenidoDeRuta(ruta: string): string | null {
  const r = ruta.replace(/\/+$/, '') || '/';
  const enlacesLegales = LEGALES.map((l) => `<a href="/${l.slug}">${esc(l.en.titulo)}</a>`).join(' · ');
  const pie = `<footer><p><a href="/docs">Docs</a> · ${enlacesLegales}</p><p>© ${new Date().getFullYear()} pantalay.com | All rights reserved. Developed by <a href="https://windoce.com">Windoce LLC</a></p></footer>`;
  if (r === '/') {
    const funciones = FUNCIONES.en.map(([t, d]) => `<li><strong>${esc(t)}.</strong> ${esc(d)}</li>`).join('');
    const faq = PREGUNTAS.map((q) => `<h3>${esc(q.p)}</h3><p>${esc(q.r)}</p>`).join('');
    return `<main><h1>Pantalay — Free screen recorder with instant sharing</h1><p>Record your screen and camera in your browser and share it with a link in seconds. Live transcript, captions, chapters, comments and viewer insights. Download as MP4. In English and Spanish.</p><p><a href="/signup">Start recording for free</a> · <a href="/docs">Read the Docs</a></p><h2>Everything Pantalay can do</h2><ul>${funciones}</ul><h2>Frequently asked questions</h2>${faq}</main>${pie}`;
  }
  if (r === '/docs') {
    const secciones = (Object.keys(SECCIONES) as (keyof typeof SECCIONES)[])
      .map((s) => {
        const guias = GUIAS.filter((g) => g.seccion === s)
          .map((g) => `<li><a href="/docs/${g.slug}">${esc(g.en.titulo)}</a> — ${esc(g.en.resumen)}</li>`)
          .join('');
        return guias ? `<h2>${esc(SECCIONES[s].en)}</h2><ul>${guias}</ul>` : '';
      })
      .join('');
    return `<main><h1>Pantalay Docs</h1><p>Guides for Pantalay: record your screen and camera, trim, draw while you record, share, download MP4 and use AI.</p>${secciones}</main>${pie}`;
  }
  const m = /^\/docs\/([a-z0-9-]+)$/.exec(r);
  const g = m ? GUIAS.find((x) => x.slug === m[1]) : undefined;
  if (g)
    return `<main><p><a href="/docs">← Docs</a></p><article><h1>${esc(g.en.titulo)}</h1><p>${esc(g.en.resumen)}</p>${g.en.cuerpo.map((p) => `<p>${esc(p)}</p>`).join('')}</article></main>${pie}`;
  const l = legalPorSlug(r.slice(1));
  if (l)
    return `<main><article><h1>${esc(l.en.titulo)}</h1><p>Last updated: ${ACTUALIZADO}</p><p>${esc(l.en.resumen)}</p>${l.en.secciones
      .map((s) => `<h2>${esc(s.titulo)}</h2>${s.parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}`)
      .join('')}</article></main>${pie}`;
  return null;
}

const ORGANIZACION = {
  '@type': 'Organization',
  '@id': 'https://windoce.com/#corporation',
  name: 'Windoce LLC',
  legalName: 'Windoce, LLC',
  url: 'https://windoce.com',
  email: CONTACTO,
};

/** Datos estructurados (JSON-LD) de la página, para los resultados enriquecidos de Google y las IAs. */
export function datosEstructurados(ruta: string): string {
  const r = ruta.replace(/\/+$/, '') || '/';
  const bloques: object[] = [];
  if (r === '/') {
    bloques.push(
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Pantalay',
        url: `${DOMINIO}/`,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web browser',
        description:
          'Free screen and camera recorder in the browser with instant sharing links, transcripts, captions, chapters, comments, viewer insights and MP4 download. In English and Spanish.',
        inLanguage: ['en', 'es'],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        image: `${DOMINIO}/og.png`,
        publisher: ORGANIZACION,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PREGUNTAS.map((q) => ({
          '@type': 'Question',
          name: q.p,
          acceptedAnswer: { '@type': 'Answer', text: q.r },
        })),
      },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Pantalay', url: `${DOMINIO}/` },
    );
  }
  const m = /^\/docs\/([a-z0-9-]+)$/.exec(r);
  const g = m ? GUIAS.find((x) => x.slug === m[1]) : undefined;
  if (g)
    bloques.push(
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: g.en.titulo,
        description: g.en.resumen,
        url: `${DOMINIO}/docs/${g.slug}`,
        inLanguage: 'en',
        publisher: ORGANIZACION,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Docs', item: `${DOMINIO}/docs` },
          { '@type': 'ListItem', position: 2, name: g.en.titulo, item: `${DOMINIO}/docs/${g.slug}` },
        ],
      },
    );
  // «<» escapado: un texto nunca puede cerrar la etiqueta <script> antes de tiempo.
  return bloques
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`)
    .join('\n    ');
}

/** /llms.txt: el índice que leen los asistentes de IA (formato de llmstxt.org). */
export function llmsTxt(): string {
  const guias = (Object.keys(SECCIONES) as (keyof typeof SECCIONES)[])
    .map((s) => {
      const lista = GUIAS.filter((g) => g.seccion === s)
        .map((g) => `- [${g.en.titulo}](${DOMINIO}/docs/${g.slug}): ${g.en.resumen}`)
        .join('\n');
      return lista ? `## ${SECCIONES[s].en}\n\n${lista}\n` : '';
    })
    .filter(Boolean)
    .join('\n');
  const legales = LEGALES.map((l) => `- [${l.en.titulo}](${DOMINIO}/${l.slug}): ${l.en.resumen}`).join('\n');
  return `# Pantalay

> Pantalay is a free screen and camera recorder that works in the web browser, with instant sharing links, transcripts and captions in English and Spanish, chapters, comments, viewer insights, trimming, drawing while recording, MP4 download and AI summaries. Developed by Windoce LLC.

Pantalay needs no installation. You record your screen, your camera or both; the video uploads while you record and the link is ready the moment you stop. Viewers watch in their browser without an account. Full text of every guide: ${DOMINIO}/llms-full.txt

## Features

${FUNCIONES.en.map(([t, d]) => `- ${t}: ${d}`).join('\n')}

${guias}
## Legal

${legales}

## Optional

- [Home](${DOMINIO}/): Product overview and frequently asked questions.
- [Sign up](${DOMINIO}/signup): Create a free account.
`;
}

/** /llms-full.txt: todas las guías completas en texto, para que una IA responda sin abrir cada página. */
export function llmsCompleto(): string {
  const preguntas = PREGUNTAS.map((q) => `### ${q.p}\n\n${q.r}`).join('\n\n');
  const guias = GUIAS.map(
    (g) =>
      `## ${g.en.titulo}\n\nURL: ${DOMINIO}/docs/${g.slug}\n\n${g.en.resumen}\n\n${g.en.cuerpo.join('\n\n')}`,
  ).join('\n\n');
  return `# Pantalay — full documentation\n\n> Free screen and camera recorder in the browser, with instant sharing. Developed by Windoce LLC. Website: ${DOMINIO}/\n\n## Frequently asked questions\n\n${preguntas}\n\n${guias}\n`;
}
