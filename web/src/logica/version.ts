// ¿La página abierta es la versión publicada? Una pestaña abierta desde antes de publicar sigue con el código viejo
// (por ejemplo, un grabador que no sabía pintar la marca de agua). Antes de grabar se comprueba y, si quedó vieja, se
// recarga sola: los ajustes y los borradores están guardados en el navegador, no se pierde nada.
declare const __COMMIT__: string;

export const COMMIT_PAGINA: string = typeof __COMMIT__ === 'string' ? __COMMIT__ : 'local';

/** true si la página quedó vieja frente a la publicada (en local nunca). */
export function paginaVieja(pagina: string, servidor: string | null | undefined): boolean {
  if (!servidor || pagina === 'local' || servidor === 'local') return false;
  return pagina !== servidor;
}

/** Pregunta la versión publicada y recarga si esta página quedó vieja. Devuelve true si va a recargar. */
export async function recargarSiQuedoVieja(): Promise<boolean> {
  try {
    const r = await fetch('/datos/config', { cache: 'no-store' });
    const { commit } = (await r.json()) as { commit?: string };
    if (!paginaVieja(COMMIT_PAGINA, commit)) return false;
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/** Del lado del servidor: ¿la página que quiere grabar es de otra versión (o tan vieja que no la manda)? */
export function grabadorViejo(servidor: string, enviada: string | undefined): boolean {
  return servidor !== 'local' && enviada !== servidor;
}
