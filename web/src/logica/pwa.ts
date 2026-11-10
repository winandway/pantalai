// App instalable (PWA) de Pantalay. Candado C-PWA. Registra el ayudante (sw.js) y guarda el aviso de instalación
// del navegador para ofrecer «Instalar la app» con un botón propio (nunca una ventana que salga sola).
import { useEffect, useState } from 'react';

type AvisoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let aviso: AvisoInstalar | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

/** ¿Ya se abrió como app instalada? */
export function esAppInstalada(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/** iPhone o iPad: ahí no hay botón del navegador; se instala con «Compartir → Agregar a inicio». */
export function esIos(ua = navigator.userAgent): boolean {
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/** Se llama una vez al arrancar. Solo en el sitio publicado (en el servidor de desarrollo de Vite, no). */
export function registrarPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aviso = e as AvisoInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    aviso = null;
    avisar();
  });
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('pwa: no se pudo registrar', e));
  });
}

/** Estado del botón «Instalar la app»: «boton» (el navegador lo permite), «ios» (instrucciones) o nada. */
export function useInstalar(): { modo: 'boton' | 'ios' | null; instalar: () => Promise<void> } {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const f = () => refrescar((n) => n + 1);
    oyentes.add(f);
    return () => {
      oyentes.delete(f);
    };
  }, []);
  const modo = esAppInstalada() ? null : aviso ? 'boton' : esIos() ? 'ios' : null;
  return {
    modo,
    instalar: async () => {
      if (!aviso) return;
      await aviso.prompt();
      await aviso.userChoice.catch(() => undefined);
      aviso = null;
      avisar();
    },
  };
}
