// Revisión antes de grabar en el Estudio (10 nov 2026, Richard): al tocar «Grabar» se muestra lo que va a salir en el
// video (título, programa, anfitrión, invitado o creador) y si el Karaoke está encendido, y se corrige ahí mismo.
// Pasó que una entrevista salió con el título del video anterior (el tema queda guardado) y con efecto de cantante
// porque el Karaoke había quedado encendido. Candado C-REVISION-GRABAR.
import type { EstadoLlamada } from './llamada';

export type AvisoRevision = 'tema_de_otro_video' | 'tema_vacio' | 'karaoke' | 'invitado_no_conectado';

export type DatosRevision = {
  /** Segunda tarjeta = un invitado remoto (entrevista). */
  invitado: boolean;
  /** El tema / título escrito ahora. */
  tema: string;
  /** El último tema que se puso SOLO a partir de un video (enlace, archivo o biblioteca). */
  temaAuto: string;
  karaoke: boolean;
  estadoLlamada: EstadoLlamada;
};

/** Lo que hay que mirar antes de grabar, lo más importante primero. */
export function avisosAntesDeGrabar(d: DatosRevision): AvisoRevision[] {
  const avisos: AvisoRevision[] = [];
  const tema = d.tema.trim();
  // En una entrevista no hay video: si el tema es el que puso solo un video, viene de la grabación anterior.
  if (d.invitado && tema && tema === d.temaAuto.trim()) avisos.push('tema_de_otro_video');
  if (!tema) avisos.push('tema_vacio');
  if (d.karaoke) avisos.push('karaoke');
  if (d.invitado && d.estadoLlamada !== 'conectado') avisos.push('invitado_no_conectado');
  return avisos;
}
