import { describe, expect, it } from 'vitest';
import {
  aVtt,
  buscarEnTranscripcion,
  capitulosAutomaticos,
  detectarSilencios,
  duracionVisible,
  formatoTiempo,
  segmentoActual,
  siguienteVisible,
  textoPlano,
  tituloAutomatico,
  tramosOcultos,
  unirTramos,
  volumenPorVentana,
} from '../web/src/logica/tiempo';

describe('tiempos', () => {
  it('formatea minutos y horas', () => {
    expect(formatoTiempo(0)).toBe('0:00');
    expect(formatoTiempo(65.9)).toBe('1:05');
    expect(formatoTiempo(3725)).toBe('1:02:05');
    expect(formatoTiempo(Number.NaN)).toBe('0:00');
  });

  it('une tramos que se pisan', () => {
    expect(
      unirTramos([
        { inicio: 5, fin: 8 },
        { inicio: 1, fin: 3 },
        { inicio: 2.9, fin: 4 },
        { inicio: 9, fin: 9 },
      ]),
    ).toEqual([
      { inicio: 1, fin: 4 },
      { inicio: 5, fin: 8 },
    ]);
  });

  it('calcula lo oculto, adónde saltar y la duración final', () => {
    const o = tramosOcultos(60, 2, 50, [{ inicio: 10, fin: 15 }]);
    expect(o).toEqual([
      { inicio: 0, fin: 2 },
      { inicio: 10, fin: 15 },
      { inicio: 50, fin: 61 },
    ]);
    expect(siguienteVisible(11, o)).toBe(15);
    expect(siguienteVisible(20, o)).toBeNull();
    expect(duracionVisible(60, o)).toBe(43);
    expect(duracionVisible(12, o)).toBe(8);
  });
});

describe('transcripción', () => {
  const seg = [
    { inicio: 0, fin: 3, texto: 'So hello everyone this is the quarterly report.' },
    { inicio: 40, fin: 44, texto: 'Revenue grew a lot this quarter.' },
    { inicio: 90, fin: 95, texto: 'Next steps for the team.' },
  ];

  it('arma subtítulos WebVTT válidos', () => {
    const v = aVtt(seg);
    expect(v.startsWith('WEBVTT')).toBe(true);
    expect(v).toContain('00:00:40.000 --> 00:00:44.000');
    expect(textoPlano(seg)).toContain('0:40 Revenue');
  });

  it('sugiere título saltando muletillas', () => {
    expect(tituloAutomatico(seg, 'en')).toBe('Everyone this is the quarterly report');
    expect(tituloAutomatico([{ inicio: 0, fin: 1, texto: 'hi' }], 'en')).toBeNull();
  });

  it('crea capítulos solo en pausas largas', () => {
    const c = capitulosAutomaticos(seg, 120);
    expect(c.map((x) => x.segundo)).toEqual([0, 40, 90]);
    expect(capitulosAutomaticos(seg, 30)).toEqual([]);
  });

  it('busca y encuentra la frase que suena', () => {
    expect(buscarEnTranscripcion(seg, 'QUARTER')).toEqual([0, 1]);
    expect(buscarEnTranscripcion(seg, '  ')).toEqual([]);
    expect(segmentoActual(seg, 41)).toBe(1);
    expect(segmentoActual([], 4)).toBe(-1);
  });
});

describe('silencios', () => {
  it('encuentra pausas largas y deja un respiro', () => {
    const vol = [
      ...Array(10).fill(0.5),
      ...Array(30).fill(0.001),
      ...Array(10).fill(0.5),
      ...Array(5).fill(0.001),
    ];
    expect(detectarSilencios(vol, 0.1)).toEqual([{ inicio: 1.3, fin: 3.7 }]);
  });

  it('mide el volumen por ventana', () => {
    const m = new Float32Array(200).fill(0.5);
    expect(volumenPorVentana(m, 1000, 0.1)).toEqual([0.5, 0.5]);
  });
});
