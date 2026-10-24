import { describe, expect, it } from 'vitest';
import {
  capitulosValidos,
  descripcionYoutube,
  largoEtiquetas,
  limpiarEtiquetas,
  limpiarHashtags,
  MAX_ETIQUETAS,
  textoResumen,
} from '../web/src/logica/youtube';

describe('CANDADO C-YOUTUBE: lo que se copia se pega en YouTube sin errores', () => {
  it('las etiquetas nunca pasan de 500 caracteres contando comas y comillas', () => {
    const muchas = Array.from({ length: 80 }, (_, i) => `palabra clave número ${i}`);
    const r = limpiarEtiquetas(muchas);
    expect(largoEtiquetas(r)).toBeLessThanOrEqual(MAX_ETIQUETAS);
    expect(r.length).toBeGreaterThan(10);
    // Con espacios suman las comillas que agrega YouTube.
    expect(largoEtiquetas(['a b', 'c'])).toBe(5 + 1 + 1);
  });

  it('limpia lo que YouTube rechaza: «#», «<>», comas, repetidas y muy largas; hasta 35', () => {
    expect(
      limpiarEtiquetas(['#Tutorial', 'tutorial', 'a<b>', 'uno, dos', 'x'.repeat(31), ' Edición  de video ']),
    ).toEqual(['tutorial', 'a b', 'uno dos', 'edición de video']);
    expect(limpiarEtiquetas(Array.from({ length: 50 }, (_, i) => `t${i}`))).toHaveLength(35);
  });

  it('hashtags: tres como máximo, una palabra, sin repetir', () => {
    expect(limpiarHashtags(['Cine Clásico', '#cineclasico', 'Disney', '1929', 'Animación', 'Extra'])).toEqual(
      ['#CineClásico', '#Disney', '#Animación'],
    );
  });

  it('los capítulos solo van si cumplen la regla de YouTube (0:00, tres o más, 10 s cada uno)', () => {
    expect(capitulosValidos([{ segundo: 0 }, { segundo: 12 }, { segundo: 27 }], 84)).toBe(true);
    expect(capitulosValidos([{ segundo: 0 }, { segundo: 12 }], 84)).toBe(false);
    expect(capitulosValidos([{ segundo: 3 }, { segundo: 12 }, { segundo: 27 }], 84)).toBe(false);
    expect(capitulosValidos([{ segundo: 0 }, { segundo: 5 }, { segundo: 27 }], 84)).toBe(false);
  });

  it('la descripción: gancho, resumen, capítulos y hashtags, en ese orden', () => {
    const d = descripcionYoutube({
      gancho: 'Así se hacían los dibujos animados en 1929.',
      resumen: 'Reacción a un cómic de 1929.',
      capitulos: [
        { segundo: 0, titulo: 'Introducción' },
        { segundo: 12, titulo: 'Orígenes' },
        { segundo: 63, titulo: 'El final' },
      ],
      duracion: 84,
      hashtags: ['#Animación', '#Disney'],
      idioma: 'es',
    });
    expect(d).toBe(
      'Así se hacían los dibujos animados en 1929.\n\nReacción a un cómic de 1929.\n\nCapítulos:\n0:00 Introducción\n0:12 Orígenes\n1:03 El final\n\n#Animación #Disney',
    );
    expect(textoResumen('Hola.', [{ segundo: 75, titulo: 'Fin' }])).toBe('Hola.\n\n1:15 Fin');
  });
});
