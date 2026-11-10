import { describe, expect, it } from 'vitest';
import {
  buscarEnRed,
  fragmentoDe,
  normalizar,
  palabrasDe,
  sugerencias,
  textoDeTranscripcion,
  type VideoBuscable,
} from '../web/src/logica/busquedaRed';

// CANDADO C-BUSCADOR (9 nov 2026): el buscador de la red encuentra bien y ordena bien.
const v = (id: string, titulo: string, extra: Partial<VideoBuscable> = {}): VideoBuscable => ({
  id,
  titulo,
  autor: 'Ana',
  descripcion: '',
  texto: '',
  me_gusta: 0,
  vistas: 0,
  publicado_en: 0,
  ...extra,
});

const VIDEOS = [
  v('1', 'Técnica para conquistar no falla', { autor: 'Richard Llerena', me_gusta: 3 }),
  v('2', 'Reaccionando a canciones de Rafa', { autor: 'Richard Llerena', descripcion: 'Rafa Pérez en vivo' }),
  v('3', 'Tutorial de Excel', { autor: 'Beto', texto: 'hoy vamos a conquistar las tablas dinámicas' }),
  v('4', 'Cómo despedirse de un país', { autor: 'Tor Planet' }),
];

describe('buscador de la red', () => {
  it('no le importan tildes, mayúsculas ni signos', () => {
    expect(normalizar('¡Técnica  PARA conquistar!')).toBe('tecnica para conquistar');
    expect(buscarEnRed('TECNICA', VIDEOS).map((r) => r.video.id)).toEqual(['1']);
    expect(buscarEnRed('despedirse pais', VIDEOS).map((r) => r.video.id)).toEqual(['4']);
  });

  it('ignora las palabras vacías salvo que sean lo único escrito', () => {
    expect(palabrasDe('cómo despedirse de un país')).toEqual(['como', 'despedirse', 'pais']);
    expect(palabrasDe('de la')).toEqual(['de', 'la']);
  });

  it('el título pesa más que lo que se dice en el video', () => {
    expect(buscarEnRed('conquistar', VIDEOS).map((r) => r.video.id)).toEqual(['1', '3']);
  });

  it('encuentra por creador, por descripción y por el inicio de una palabra', () => {
    expect(
      buscarEnRed('richard', VIDEOS)
        .map((r) => r.video.id)
        .sort(),
    ).toEqual(['1', '2']);
    expect(buscarEnRed('perez', VIDEOS).map((r) => r.video.id)).toEqual(['2']);
    expect(buscarEnRed('reacc', VIDEOS).map((r) => r.video.id)).toEqual(['2']);
  });

  it('pide todas las palabras; si ninguno las tiene, muestra los que tienen alguna', () => {
    expect(buscarEnRed('rafa canciones', VIDEOS).map((r) => r.video.id)).toEqual(['2']);
    expect(
      buscarEnRed('excel pais', VIDEOS)
        .map((r) => r.video.id)
        .sort(),
    ).toEqual(['3', '4']);
    expect(buscarEnRed('zzz', VIDEOS)).toEqual([]);
    expect(buscarEnRed('   ', VIDEOS)).toEqual([]);
  });

  it('muestra el pedazo donde aparece la palabra', () => {
    expect(buscarEnRed('tablas', VIDEOS)[0]!.fragmento).toContain('tablas dinámicas');
    expect(fragmentoDe('', ['x'])).toBe('');
  });

  it('sugiere títulos y creadores mientras se escribe, sin repetir', () => {
    expect(sugerencias('rich', VIDEOS)).toEqual([
      'Técnica para conquistar no falla',
      'Richard Llerena',
      'Reaccionando a canciones de Rafa',
    ]);
    expect(sugerencias('', VIDEOS)).toEqual([]);
  });

  it('lee el texto de una transcripción guardada', () => {
    expect(textoDeTranscripcion('[{"inicio":0,"fin":1,"texto":"Hola"},{"texto":"mundo"}]')).toBe(
      'Hola mundo',
    );
    expect(textoDeTranscripcion('no es json')).toBe('');
  });
});
