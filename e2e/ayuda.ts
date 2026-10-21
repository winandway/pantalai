// Cada archivo de pruebas llega desde su propia dirección de internet de mentira, para no gastar entre todos el límite
// de 5 registros cada 15 minutos. Solo sirve en local y en la compuerta: en pantalay.com, Cloudflare pone la
// dirección real y esta cabecera no cuenta.
export const ipDePrueba = () =>
  `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
