import { describe, expect, it } from 'vitest';
import app from '../servidor/app';
import {
  archivoGoogle,
  codigosGoogle,
  DOMINIO,
  prepararCabecera,
  redireccion,
  robots,
  rutasPublicas,
  sitemap,
} from '../servidor/dominio';
import { origenPublico } from '../web/src/logica/sitio';
import { baseFalsa, almacenFalso } from './falsos';

const env = { DB: baseFalsa(), BUCKET: almacenFalso() };

describe('CANDADO C-DOMINIO: pantalay.com es la dirección principal', () => {
  it('las páginas de la dirección vieja pasan a pantalay.com con la misma ruta (301)', async () => {
    const r = await app.request('https://pantalai.sitios.dev/v/abc123?t=30', {}, env);
    expect(r.status).toBe(301);
    expect(r.headers.get('location')).toBe('https://pantalay.com/v/abc123?t=30');
    const w = await app.request('https://www.pantalay.com/docs/trim-video', {}, env);
    expect(w.headers.get('location')).toBe('https://pantalay.com/docs/trim-video');
  });

  it('los videos y los datos de la dirección vieja siguen sirviéndose sin redirigir', () => {
    expect(redireccion('https://pantalai.sitios.dev/media/abc/video', 'GET')).toBeNull();
    expect(redireccion('https://pantalai.sitios.dev/datos/salud', 'GET')).toBeNull();
    expect(redireccion('https://pantalai.sitios.dev/v/abc', 'POST')).toBeNull();
    expect(redireccion('https://pantalay.com/v/abc', 'GET')).toBeNull();
    expect(redireccion('http://127.0.0.1:8787/v/abc', 'GET')).toBeNull();
  });

  it('mapa del sitio y robots con pantalay.com y todas las guías de Docs', async () => {
    const xml = await (await app.request('https://pantalay.com/sitemap.xml', {}, env)).text();
    expect(xml).toContain('<loc>https://pantalay.com/docs/trim-video</loc>');
    expect(xml).toContain('<loc>https://pantalay.com/docs/draw-on-screen</loc>');
    expect(xml).not.toContain('sitios.dev');
    expect(rutasPublicas().length).toBeGreaterThan(20);
    expect(sitemap().match(/<url>/g)!.length).toBe(rutasPublicas().length);
    expect(robots()).toContain(`Sitemap: ${DOMINIO}/sitemap.xml`);
    expect((await app.request('https://pantalay.com/robots.txt', {}, env)).status).toBe(200);
  });

  it('los enlaces para compartir e insertar salen con pantalay.com, también desde la dirección vieja', () => {
    expect(origenPublico('https://pantalai.sitios.dev')).toBe('https://pantalay.com');
    expect(origenPublico('https://www.pantalay.com')).toBe('https://pantalay.com');
    expect(origenPublico('https://pantalay.com')).toBe('https://pantalay.com');
    expect(origenPublico('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787');
  });
});

describe('CANDADO C-GOOGLE: listo para verificar en Google Search Console', () => {
  it('limpia los códigos: acepta el nombre del archivo o el contenido de la etiqueta', () => {
    expect(codigosGoogle('google1a2b3c4d5e6f.html, AbC-dEf_123456')).toEqual([
      '1a2b3c4d5e6f',
      'AbC-dEf_123456',
    ]);
    expect(codigosGoogle(undefined)).toEqual([]);
    expect(codigosGoogle('"><script>')).toEqual([]);
  });

  it('el archivo de Google responde solo con un código configurado', async () => {
    const e = { ...env, GOOGLE_VERIFICACION: 'google1a2b3c4d5e6f.html' };
    const r = await app.request('https://pantalay.com/google1a2b3c4d5e6f.html', {}, e);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('google-site-verification: google1a2b3c4d5e6f.html');
    expect((await app.request('https://pantalay.com/googleotro123456.html', {}, e)).status).toBe(404);
    expect(archivoGoogle('google1a2b3c4d5e6f.html', [])).toBeNull();
  });

  it('la cabecera lleva la etiqueta de Google, y cada guía su título y resumen', () => {
    const base =
      '<html><head><title>Pantalay</title><meta name="description" content="x" /><meta property="og:title" content="x" /><meta property="og:description" content="x" /><meta property="og:url" content="x" /></head></html>';
    const h = prepararCabecera(base, '/docs/trim-video', ['AbC123456']);
    expect(h).toContain('<meta name="google-site-verification" content="AbC123456" />');
    expect(h).toContain('<title>Trim the start and end of a video · Pantalay Docs</title>');
    expect(h).toContain('<meta property="og:url" content="https://pantalay.com/docs/trim-video" />');
    expect(h).not.toContain('noindex');
    expect(prepararCabecera(base, '/library', [])).toContain('<meta name="robots" content="noindex" />');
    expect(prepararCabecera(base, '/pricing', [])).toContain('noindex');
    // La portada conserva su título y suma los datos para Google y las IAs.
    expect(prepararCabecera(base, '/', [])).toContain('<title>Pantalay</title>');
    expect(prepararCabecera(base, '/', [])).toContain('"@type":"FAQPage"');
  });
});

describe('CANDADO C-GOOGLE: el mapa que Google ya tiene enviado no pierde páginas', () => {
  it('trae la portada, Docs y TODAS las guías, sin duplicados', async () => {
    const { GUIAS } = await import('../web/src/paginas/guias');
    const xml = sitemap();
    for (const g of GUIAS) expect(xml).toContain(`<loc>https://pantalay.com/docs/${g.slug}</loc>`);
    const locs = xml.match(/<loc>[^<]+<\/loc>/g)!;
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs.length).toBeGreaterThanOrEqual(25);
  });
});

describe('CANDADO C-SEO-IA: Google y los buscadores de IA leen el texto sin JavaScript', () => {
  const base =
    '<html><head><title>Pantalay</title></head><body><div id="raiz"></div><script src="/app.js"></script></body></html>';

  it('cada página pública trae su texto dentro del HTML; las privadas no', async () => {
    const { GUIAS } = await import('../web/src/paginas/guias');
    const g = GUIAS[0]!;
    const guia = prepararCabecera(base, `/docs/${g.slug}`, []);
    expect(guia).toContain(`<h1>${g.en.titulo.replace(/&/g, '&amp;')}</h1>`);
    expect(guia).toContain('"@type":"TechArticle"');
    const terminos = prepararCabecera(base, '/terms', []);
    expect(terminos).toContain('<h1>Terms of Service</h1>');
    expect(terminos).toContain('Windoce, LLC');
    expect(prepararCabecera(base, '/privacy', [])).toContain('<h1>Privacy Policy</h1>');
    expect(prepararCabecera(base, '/', [])).toContain('Frequently asked questions');
    expect(prepararCabecera(base, '/library', [])).toContain('<div id="raiz"></div>');
    expect(prepararCabecera(base, '/account', [])).toContain('noindex');
  });

  it('el mapa del sitio trae los textos legales y robots invita a las IAs por su nombre', async () => {
    const { robots, sitemap } = await import('../servidor/dominio');
    for (const r of ['/terms', '/privacy', '/acceptable-use', '/cookies'])
      expect(sitemap()).toContain(`https://pantalay.com${r}</loc>`);
    const txt = robots();
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'])
      expect(txt).toContain(`User-agent: ${bot}\nAllow: /`);
    expect(txt).toContain('Disallow: /account');
    expect(txt).toContain('Disallow: /panel/');
  });

  it('llms.txt sigue el formato y enlaza todas las guías; llms-full.txt trae su texto completo', async () => {
    const { llmsCompleto, llmsTxt } = await import('../servidor/seo');
    const { GUIAS } = await import('../web/src/paginas/guias');
    const indice = llmsTxt();
    expect(indice.startsWith('# Pantalay\n\n> ')).toBe(true);
    for (const g of GUIAS) expect(indice).toContain(`https://pantalay.com/docs/${g.slug}`);
    expect(llmsCompleto()).toContain(GUIAS[0]!.en.cuerpo[0]!);
  });

  it('un título con «</script>» no puede romper los datos estructurados', async () => {
    const { datosEstructurados } = await import('../servidor/seo');
    expect(datosEstructurados('/')).not.toMatch(/<\/script>.*<\/script>.*<\/script>.*<\/script>/s);
    expect(datosEstructurados('/').split('</script>').length - 1).toBe(3);
  });

  it('los textos legales están completos en los dos idiomas', async () => {
    const { LEGALES } = await import('../web/src/paginas/legales');
    expect(LEGALES.map((l) => l.slug)).toEqual(['terms', 'privacy', 'acceptable-use', 'cookies']);
    for (const l of LEGALES) {
      expect(l.en.secciones.length).toBeGreaterThan(2);
      expect(l.es.secciones.length).toBeGreaterThanOrEqual(l.en.secciones.length);
      expect(JSON.stringify(l.en)).not.toMatch(/Loom|Atlassian/);
    }
  });
});
