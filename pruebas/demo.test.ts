import { describe, expect, it } from 'vitest';
import { escenaDemo } from '../web/src/componentes/Demo';

describe('demo animada de la portada', () => {
  it('cuenta la historia en orden: grabar, cuenta regresiva, grabando con burbuja, dibujar, enlace listo', () => {
    expect(escenaDemo(500)).toMatchObject({ grabando: false, cuenta: null, paso: 0 });
    expect(escenaDemo(1700).cuenta).toBe(3);
    expect(escenaDemo(3000).cuenta).toBe(1);
    expect(escenaDemo(4000)).toMatchObject({ grabando: true, burbuja: true, paso: 1 });
    expect(escenaDemo(7000)).toMatchObject({ grabando: true, paso: 2 });
    expect(escenaDemo(7000).flecha).toBeGreaterThan(0);
    expect(escenaDemo(9000).flecha).toBe(1);
    expect(escenaDemo(12_000)).toMatchObject({ grabando: false, terminado: true, paso: 3, compartir: 1 });
    expect(escenaDemo(9000).segundos).toBe(5);
  });
});
