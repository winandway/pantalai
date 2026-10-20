import { describe, expect, it } from 'vitest';
import app from '../servidor/app';
import { DOMINIO, redireccion, robots, rutasPublicas, sitemap } from '../servidor/dominio';
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
