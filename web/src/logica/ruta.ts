// Navegación sin recargar la página (la app es de una sola página).
import { useEffect, useState } from 'react';

export function navegar(ruta: string, reemplazar = false) {
  if (reemplazar) history.replaceState(null, '', ruta);
  else history.pushState(null, '', ruta);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function useRuta(): string {
  const [ruta, setRuta] = useState(() => location.pathname);
  useEffect(() => {
    const cambio = () => setRuta(location.pathname);
    window.addEventListener('popstate', cambio);
    return () => window.removeEventListener('popstate', cambio);
  }, []);
  return ruta;
}

/** Enlace interno: clic normal navega sin recargar; con ⌘/Ctrl abre pestaña nueva. */
export function alClicEnlace(e: React.MouseEvent<HTMLAnchorElement>) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const href = e.currentTarget.getAttribute('href');
  if (!href || href.startsWith('http')) return;
  e.preventDefault();
  navegar(href);
}
