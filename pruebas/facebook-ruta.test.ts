import { describe, expect, it } from 'vitest';
import app from '../servidor/app';

describe('CANDADO C-FACEBOOK: la página del reproductor de Facebook', () => {
  it('responde sin tocar la base, con su política cerrada y dejándose insertar solo por el Estudio', async () => {
    // Sin base ni almacén: la página no lee ni escribe nada.
    const r = await app.request(
      'https://pantalai.sitios.dev/media/facebook/1699340011899306?r=1&o=https%3A%2F%2Fpantalay.com',
      {},
      {} as never,
    );
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
    expect(r.headers.get('x-frame-options')).toBeNull();
    const csp = r.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("frame-ancestors 'self' https://pantalay.com");
    expect(csp).toContain("default-src 'none'");
    expect(await r.text()).toContain('"padre":"https://pantalay.com"');
  });

  it('un origen ajeno no se cuela como padre y un número raro no existe', async () => {
    const ajeno = await app.request(
      'https://pantalai.sitios.dev/media/facebook/1699340011899306?o=https%3A%2F%2Fevil.example',
      {},
      {} as never,
    );
    expect(await ajeno.text()).toContain('"padre":"https://pantalai.sitios.dev"');
    expect(ajeno.headers.get('content-security-policy')).not.toContain('evil.example');
    const raro = await app.request('https://pantalai.sitios.dev/media/facebook/abc%22', {}, {} as never);
    expect(raro.status).toBe(404);
  });
});
