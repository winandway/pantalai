import { describe, expect, it } from 'vitest';
import { LIMITADOR, TECHO, curvaTecho, restriccionesMicro } from '../web/src/logica/grabadora';

// CANDADO C-MEZCLA-SIN-SATURAR (9 nov 2026): la voz no satura.
describe('mezcla sin saturar', () => {
  it('el compresor actúa rápido y el techo nunca pasa de −1,5 dB', () => {
    expect(LIMITADOR.attack).toBeLessThanOrEqual(0.005);
    const c = curvaTecho();
    expect(Math.max(...c.map(Math.abs))).toBeCloseTo(TECHO, 5);
    expect(20 * Math.log10(TECHO)).toBeLessThanOrEqual(-1.5);
    // En lo normal casi no cambia la señal (a −20 dB sale parecido) y siempre crece con la entrada.
    const medio = Math.floor(c.length / 2);
    expect(c[medio]).toBeCloseTo(0, 5);
    for (let i = 1; i < c.length; i++) expect(c[i]!).toBeGreaterThan(c[i - 1]!);
  });
  it('el Estudio pide el micrófono sin ganancia automática; Grabar la deja como estaba', () => {
    expect(restriccionesMicro('abc', false)).toEqual({
      deviceId: { exact: 'abc' },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    });
    expect(restriccionesMicro('default').autoGainControl).toBe(true);
    expect(restriccionesMicro('default').deviceId).toBeUndefined();
  });
});
