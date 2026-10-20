import { useEffect, useRef, useState } from 'react';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace, useRuta } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { useEstadoGrabacion } from '../logica/estadoGrabacion';
import { formatoTiempo } from '../logica/tiempo';
import { SelectorIdioma } from './SelectorIdioma';

export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="2" y="5" width="28" height="19" rx="4" fill="var(--tinta)" />
        <circle cx="16" cy="14.5" r="5" fill="var(--rojo)" />
        <rect x="11" y="26" width="10" height="2.5" rx="1.25" fill="var(--tinta)" />
      </svg>
      Pantalay
    </span>
  );
}

export function Encabezado() {
  const { t, idioma, cambiar } = useIdioma();
  const { usuario, salir, cargando } = useSesion();
  const grabacion = useEstadoGrabacion();
  const ruta = useRuta();
  const [menu, setMenu] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setMenu(false);
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [menu]);

  return (
    <header className="encabezado">
      <a
        href={usuario ? '/library' : '/'}
        onClick={alClicEnlace}
        className="encabezado-logo"
        aria-label="Pantalay"
      >
        <Logo />
      </a>
      <nav className="encabezado-nav">
        {usuario && (
          <a href="/library" onClick={alClicEnlace} className={ruta === '/library' ? 'activo' : ''}>
            {t('biblioteca')}
          </a>
        )}
        <a href="/docs" onClick={alClicEnlace} className={ruta.startsWith('/docs') ? 'activo' : ''}>
          {t('docs')}
        </a>
      </nav>
      <div className="encabezado-derecha">
        <SelectorIdioma idioma={idioma} cambiar={cambiar} />
        {!cargando && usuario && (
          <>
            {grabacion.grabando ? (
              <a
                href="/record"
                onClick={alClicEnlace}
                className="boton grabar-boton grabando-ahora"
                aria-live="polite"
              >
                <span className="punto-rojo" aria-hidden="true" />{' '}
                {grabacion.pausa ? t('enPausa') : t('grabandoAhora')} {formatoTiempo(grabacion.segundos)}
              </a>
            ) : (
              <a href="/record" onClick={alClicEnlace} className="boton grabar-boton">
                <span className="punto-rojo" aria-hidden="true" /> {t('grabar')}
              </a>
            )}
            <div className="cuenta" ref={caja}>
              <button
                type="button"
                className="cuenta-boton"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
              >
                <span className="avatar" aria-hidden="true">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="cuenta-nombre">{usuario.nombre}</span> ▾
              </button>
              {menu && (
                <div className="menu-puntos-lista cuenta-lista" role="menu">
                  <p className="cuenta-correo">{usuario.correo}</p>
                  <a role="menuitem" href="/library" onClick={(e) => (setMenu(false), alClicEnlace(e))}>
                    {t('biblioteca')}
                  </a>
                  <button type="button" role="menuitem" className="con-linea" onClick={() => void salir()}>
                    {t('salir')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {!cargando && !usuario && (
          <>
            <a href="/login" onClick={alClicEnlace} className="boton secundario">
              {t('entrar')}
            </a>
            <a href="/signup" onClick={alClicEnlace} className="boton solo-ancho">
              {t('registrarse')}
            </a>
          </>
        )}
      </div>
    </header>
  );
}

export function Pie() {
  const { t } = useIdioma();
  return (
    <footer className="pie">
      <span>
        © {new Date().getFullYear()} pantalai.sitios.dev | {t('derechos')}{' '}
        <a href="https://windoce.com" target="_blank" rel="noopener noreferrer">
          Windoce LLC
        </a>
      </span>
    </footer>
  );
}
