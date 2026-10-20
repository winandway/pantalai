// Dirección principal de Pantalay. Los enlaces para compartir e insertar salen siempre con ella,
// aunque la persona esté en la dirección vieja (sitios.dev). En la computadora de pruebas se usa la local.
export const DOMINIO = 'https://pantalay.com';

export function origenPublico(origen = typeof location !== 'undefined' ? location.origin : DOMINIO): string {
  const host = new URL(origen).hostname;
  return host === 'pantalay.com' || host.endsWith('.pantalay.com') || host.endsWith('sitios.dev')
    ? DOMINIO
    : origen;
}
