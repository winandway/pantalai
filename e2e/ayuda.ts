// Cada archivo de pruebas llega desde su propia dirección de internet de mentira, para no gastar entre todos el límite
// de 5 registros cada 15 minutos. Solo en local y en la compuerta: contra el sitio real (URL_BASE) no se manda,
// porque Cloudflare pone la dirección real y rechaza esa cabecera si viene del navegador. Un URL_BASE local (otro
// puerto, por ejemplo 8790) cuenta como local.
const n = () => Math.floor(Math.random() * 250) + 1;
const esLocal = (url?: string) => !url || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url);
export const cabecerasDePrueba = (): Record<string, string> =>
  esLocal(process.env.URL_BASE) ? { 'cf-connecting-ip': `10.${n()}.${n()}.${n()}` } : {};

/** La versión publicada del sitio: las pruebas que crean videos por la API la mandan, igual que la página. */
export async function versionDelSitio(request: {
  get: (u: string) => Promise<{ json: () => Promise<unknown> }>;
}) {
  const r = (await (await request.get('/datos/config')).json()) as { commit?: string };
  return r.commit ?? 'local';
}
