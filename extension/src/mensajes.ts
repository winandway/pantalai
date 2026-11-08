// Lo que se dicen la ventanita, el fondo, la capa y la página de Pantalay.

export type Capa = 'dibujo' | 'cursor';
export type EstadoCapa = { dibujo: boolean; cursor: boolean };
export type RespuestaCapa = EstadoCapa | { error: 'no_permitida' };

/** De la ventanita al fondo. */
export type MensajeInterno =
  { tipo: 'estado' } | { tipo: 'alternar'; que: Capa } | { tipo: 'reporte'; origen?: string };

/** De la página de Pantalay a la extensión (externally_connectable). */
export type MensajeExterno = { tipo: 'hola' } | { tipo: 'tomar' };

export const ORIGEN_PANTALAY = 'https://pantalay.com';

declare const __PRUEBAS__: boolean | undefined;
/** En la extensión publicada es false: solo Pantalay puede hablarle (localhost solo en la compilación de pruebas). */
const PRUEBAS = typeof __PRUEBAS__ !== 'undefined' && __PRUEBAS__;

/** Solo Pantalay (y la computadora local, SOLO en la compilación de pruebas) puede hablar con la extensión. */
export function origenPermitido(origen: string | undefined, local = PRUEBAS): boolean {
  if (!origen) return false;
  let u: URL;
  try {
    u = new URL(origen);
  } catch {
    return false;
  }
  if (u.protocol === 'https:')
    return ['pantalay.com', 'www.pantalay.com', 'pantalai.sitios.dev'].includes(u.hostname);
  return local && u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
}
