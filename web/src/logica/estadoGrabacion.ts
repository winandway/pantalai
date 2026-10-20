// Estado de la grabación en curso, para que el encabezado diga «Grabando 1:23» en vez de «Grabar».
import { useSyncExternalStore } from 'react';

type Estado = { grabando: boolean; pausa: boolean; segundos: number };
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
