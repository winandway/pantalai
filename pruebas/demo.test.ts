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

describe('pantallas de la demo', () => {
  it('se turnan tres programas distintos', async () => {
    const { PANTALLAS } = await import('../web/src/componentes/Demo');
    expect(PANTALLAS).toEqual(['plan', 'tienda', 'ventas']);
  });
});

describe('almacenamiento del superadmin', () => {
  it('calcula en cuántos días se llena al ritmo del último mes', async () => {
    const { diasParaLlenar, tamano } = await import('../web/src/paginas/AdminPartes');
    expect(diasParaLlenar(10e9, 3e9)).toBe(100);
    expect(diasParaLlenar(10e9, 0)).toBeNull();
    expect(tamano(1.5e9)).toBe('1.5 GB');
    expect(tamano(2.4e6)).toBe('2 MB');
  });
});
