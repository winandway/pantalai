import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useIdioma } from '../logica/idioma';

export type Opcion = { etiqueta: string; accion: () => void; peligro?: boolean; separador?: boolean };

/** Menú de tres puntos. Las acciones de borrar viven SOLO aquí (regla global). */
export function MenuPuntos({ opciones, icono }: { opciones: Opcion[]; icono?: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const { t } = useIdioma();
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);
  return (
    <div className="menu-puntos" ref={caja}>
      <button
        type="button"
        className="boton-icono"
        aria-label={t('masOpciones')}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAbierto((a) => !a);
        }}
      >
        {icono ?? '⋮'}
      </button>
      {abierto && (
        <div className="menu-puntos-lista" role="menu">
          {opciones.map((o) => (
            <button
              key={o.etiqueta}
              type="button"
              role="menuitem"
              className={`${o.peligro ? 'peligro' : ''} ${o.separador ? 'con-linea' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAbierto(false);
                o.accion();
              }}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
