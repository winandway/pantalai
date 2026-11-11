import { describe, expect, it } from 'vitest';
import { avisosAntesDeGrabar } from '../web/src/logica/revisionGrabar';

const base = {
  invitado: false,
  tema: 'Mi tema',
  temaAuto: '',
  karaoke: false,
  estadoLlamada: 'esperando' as const,
};

// CANDADO C-REVISION-GRABAR (10 nov 2026): antes de grabar se avisa lo que puede salir mal en el video.
describe('revisión antes de grabar', () => {
  it('una entrevista con el título que puso solo el video anterior se avisa', () => {
    expect(
      avisosAntesDeGrabar({
        ...base,
        invitado: true,
        tema: 'Lleno de ti',
        temaAuto: 'Lleno de ti ',
        estadoLlamada: 'conectado',
      }),
    ).toEqual(['tema_de_otro_video']);
    // En una reacción, el tema que pone el video es el correcto: no se avisa.
    expect(avisosAntesDeGrabar({ ...base, tema: 'Lleno de ti', temaAuto: 'Lleno de ti' })).toEqual([]);
    // Si lo escribió la persona, tampoco.
    expect(
      avisosAntesDeGrabar({
        ...base,
        invitado: true,
        tema: 'Entrevista con Ana',
        temaAuto: 'Lleno de ti',
        estadoLlamada: 'conectado',
      }),
    ).toEqual([]);
  });

  it('avisa el Karaoke encendido, el título vacío y el invitado que todavía no entró', () => {
    expect(avisosAntesDeGrabar({ ...base, karaoke: true })).toEqual(['karaoke']);
    expect(avisosAntesDeGrabar({ ...base, tema: '  ' })).toEqual(['tema_vacio']);
    expect(avisosAntesDeGrabar({ ...base, invitado: true, estadoLlamada: 'esperando' })).toEqual([
      'invitado_no_conectado',
    ]);
    expect(avisosAntesDeGrabar(base)).toEqual([]);
  });
});
