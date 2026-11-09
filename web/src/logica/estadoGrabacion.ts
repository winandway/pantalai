// Estado de la grabación en curso, para que el encabezado diga «Grabando 1:23» en vez de «Grabar».
import { useEffect, useSyncExternalStore } from 'react';

type Estado = { grabando: boolean; pausa: boolean; segundos: number };

/** El «Grabar» del encabezado, en Grabar o en el Estudio, pide arrancar la grabación de esa página. */
export const EVENTO_GRABAR = 'pantalay:grabar';

/** La página escucha el «Grabar» de arriba y arranca su grabación (con el mismo clic, así el navegador lo permite). */
export function useBotonGrabarDeArriba(arrancar: () => void) {
  useEffect(() => {
    const oir = () => arrancar();
    window.addEventListener(EVENTO_GRABAR, oir);
    return () => window.removeEventListener(EVENTO_GRABAR, oir);
  }, [arrancar]);
}
let actual: Estado = { grabando: false, pausa: false, segundos: 0 };
const oyentes = new Set<() => void>();

export function fijarEstadoGrabacion(e: Estado) {
  if (
    e.grabando === actual.grabando &&
    e.pausa === actual.pausa &&
    Math.floor(e.segundos) === Math.floor(actual.segundos)
  )
    return;
  actual = e;
  for (const o of oyentes) o();
}

export function useEstadoGrabacion(): Estado {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => actual,
  );
}
