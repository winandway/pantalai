// useBorrador: ningún formulario pierde lo escrito (regla global de Richard).
// Guarda solo, medio segundo después de dejar de escribir, en el navegador de esa persona.
// La llave lleva el formulario y la cuenta. Los campos sensibles nunca se guardan.
import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIJO = 'pantalai:borrador:';
const SENSIBLES = /clave|password|contrasena|pin|codigo|tarjeta|cvv/i;

export function llaveBorrador(formulario: string, cuenta: string | null | undefined): string {
  return `${PREFIJO}${formulario}:${cuenta ?? 'anonimo'}`;
}

function leer<T extends Record<string, unknown>>(llave: string): Partial<T> | null {
  try {
    const crudo = localStorage.getItem(llave);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Partial<T>;
    return datos && typeof datos === 'object' ? datos : null;
  } catch {
    return null;
  }
}

export function sinSensibles<T extends Record<string, unknown>>(valor: T): Partial<T> {
  const salida: Partial<T> = {};
  for (const [k, v] of Object.entries(valor))
    if (!SENSIBLES.test(k)) (salida as Record<string, unknown>)[k] = v;
  return salida;
}

export function borrarBorrador(llave: string) {
  try {
    localStorage.removeItem(llave);
  } catch {
    /* navegador sin almacenamiento: no hay nada que borrar */
  }
}

/** Al cerrar sesión se borran todos los borradores de esa cuenta. */
export function borrarBorradoresDeCuenta(cuenta: string) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIJO) && k.endsWith(`:${cuenta}`)) localStorage.removeItem(k);
    }
  } catch {
    /* sin almacenamiento */
  }
}

export function useBorrador<T extends Record<string, unknown>>(llave: string, inicial: T) {
  const [recuperado, setRecuperado] = useState(false);
  const [valor, setValor] = useState<T>(() => {
    const guardado = leer<T>(llave);
    return guardado ? { ...inicial, ...guardado } : inicial;
  });
  const inicialRef = useRef(inicial);
  const primera = useRef(true);
  const llaveRef = useRef(llave);

  useEffect(() => {
    const guardado = leer<T>(llave);
    if (guardado && Object.keys(guardado).length) setRecuperado(true);
    // La cuenta llegó después (de «anonimo» a la cuenta): se trae lo de la llave nueva; si no hay nada, se queda lo
    // escrito y se guarda ya bajo la llave correcta.
    if (llaveRef.current !== llave) {
      llaveRef.current = llave;
      if (guardado) {
        primera.current = true;
        setValor({ ...inicialRef.current, ...guardado });
      }
    }
  }, [llave]);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        // Un formulario vacío (recién guardado o limpiado) no deja borrador.
        if (JSON.stringify(sinSensibles(valor)) === JSON.stringify(sinSensibles(inicialRef.current)))
          localStorage.removeItem(llave);
        else localStorage.setItem(llave, JSON.stringify(sinSensibles(valor)));
      } catch {
        /* lleno o bloqueado: se sigue sin borrador */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [llave, valor]);

  const limpiar = useCallback(() => {
    borrarBorrador(llave);
    setRecuperado(false);
  }, [llave]);

  const empezarDeNuevo = useCallback(() => {
    borrarBorrador(llave);
    setRecuperado(false);
    primera.current = true;
    setValor(inicialRef.current);
  }, [llave]);

  const cambiar = useCallback(<K extends keyof T>(campo: K, v: T[K]) => {
    setValor((a) => ({ ...a, [campo]: v }));
  }, []);

  return { valor, setValor, cambiar, recuperado, limpiar, empezarDeNuevo };
}
