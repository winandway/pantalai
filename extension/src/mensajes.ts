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

/** Solo Pantalay (y la computadora local, para las pruebas) puede hablar con la extensión. */
export function origenPermitido(origen: string | undefined): boolean {
  if (!origen) return false;
  let u: URL;
  try {
    u = new URL(origen);
  } catch {
    return false;
  }
  if (u.protocol === 'https:')
    return ['pantalay.com', 'www.pantalay.com', 'pantalai.sitios.dev'].includes(u.hostname);
  return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
}
