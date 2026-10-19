import { describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../web/src/logica/api';
import { Subidor } from '../web/src/logica/subida';

const pedazo = (n: number) => new Blob([new Uint8Array(n)]);

describe('CANDADO subida por partes', () => {
  it('la primera parte espera al final y las demás suben mientras se graba', async () => {
    const subidas: number[] = [];
    const s = new Subidor({
      videoId: 'v',
      parteMinima: 10,
      subirParte: async (_v, n) => (subidas.push(n), { partNumber: n, etag: `e${n}` }),
    });
    for (let i = 0; i < 5; i++) s.agregar(pedazo(6)); // 30 bytes → partes de ≥10
    expect(subidas).toEqual([2]);
    const arreglar = vi.fn(async (b: Blob) => new Blob([b, new Uint8Array(2)]));
    const partes = await s.terminar(arreglar);
    expect(arreglar).toHaveBeenCalledOnce();
    expect(partes.map((p) => p.partNumber).sort()).toEqual([1, 2, 3]);
    expect(s.archivo('video/webm').size).toBe(30);
  });

  it('una grabación corta sube en una sola parte', async () => {
    const s = new Subidor({
      videoId: 'v',
      parteMinima: 100,
      subirParte: async (_v, n) => ({ partNumber: n, etag: 'e' }),
    });
    s.agregar(pedazo(5));
    expect(await s.terminar()).toEqual([{ partNumber: 1, etag: 'e' }]);
  });

  it('reintenta cuando se cae la red y el reintento sube solo lo que falló', async () => {
    let fallar = 3;
    const intentos: number[] = [];
    const s = new Subidor({
      videoId: 'v',
      parteMinima: 10,
      esperar: async () => undefined,
      subirParte: async (_v, n) => {
        intentos.push(n);
        if (n === 2 && fallar-- > 0) throw new ErrorApi('sin_red', 0);
        return { partNumber: n, etag: `e${n}` };
      },
    });
    s.agregar(pedazo(10));
    s.agregar(pedazo(10));
    const partes = await s.terminar();
    expect(partes).toHaveLength(2);
    expect(intentos.filter((n) => n === 2)).toHaveLength(4);
  });

  it('si no puede, falla sin perder nada y el reintento posterior completa', async () => {
    let caido = true;
    const s = new Subidor({
      videoId: 'v',
      parteMinima: 10,
      esperar: async () => undefined,
      subirParte: async (_v, n) => {
        if (caido && n === 2) throw new ErrorApi('sin_red', 0);
        return { partNumber: n, etag: `e${n}` };
      },
    });
    s.agregar(pedazo(10));
    s.agregar(pedazo(10));
    await expect(s.terminar()).rejects.toBeInstanceOf(ErrorApi);
    expect(s.archivo('video/webm').size).toBe(20);
    caido = false;
    expect(await s.terminar()).toHaveLength(2);
  });

  it('un error de datos no se reintenta', async () => {
    let n = 0;
    const s = new Subidor({
      videoId: 'v',
      parteMinima: 1,
      esperar: async () => undefined,
      subirParte: async () => {
        n++;
        throw new ErrorApi('datos', 400);
      },
    });
    s.agregar(pedazo(1));
    await expect(s.terminar()).rejects.toBeInstanceOf(ErrorApi);
    expect(n).toBe(1);
  });
});
