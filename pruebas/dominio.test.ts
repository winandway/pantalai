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
    expect(prepararCabecera(base, '/', [])).toBe(base);
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
