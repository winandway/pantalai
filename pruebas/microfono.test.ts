import { describe, expect, it } from 'vitest';
import { PICO_SIN_SENAL, VigiaMicrofono, nivelDe, picoDe } from '../web/src/logica/microfono';

describe('probador de micrófono', () => {
  it('mide el pico y el nivel', () => {
    expect(picoDe([0, -0.5, 0.2])).toBe(0.5);
    expect(picoDe([])).toBe(0);
    expect(nivelDe([])).toBe(0);
    expect(nivelDe(new Float32Array(10).fill(0.5))).toBe(1);
    expect(nivelDe(new Float32Array(10))).toBe(0);
  });

  it('avisa «sin señal» solo después de 3 segundos seguidos de ceros', () => {
    const v = new VigiaMicrofono();
    expect(v.leer(0, 0)).toBe('probando');
    expect(v.leer(0, 2900)).toBe('probando');
    expect(v.leer(0, 3000)).toBe('sin_senal');
    // Vuelve la señal (le cargaron la batería): se quita el aviso al instante.
    expect(v.leer(0.01, 3100)).toBe('llega');
    expect(v.leer(0, 3200)).toBe('llega');
    expect(v.leer(0, 6300)).toBe('sin_senal');
  });

  it('el ruido de fondo de un micrófono vivo cuenta como señal', () => {
    const v = new VigiaMicrofono();
    for (let t = 0; t < 10_000; t += 100) expect(v.leer(PICO_SIN_SENAL * 2, t)).toBe('llega');
  });
});
