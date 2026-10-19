import { useId, useState } from 'react';
import { useIdioma } from '../logica/idioma';

/** Campo de contraseña con el ojito (regla global). Arranca oculto. Úsalo en TODA contraseña. */
export function CampoClave({
  etiqueta,
  valor,
  cambiar,
  autoComplete = 'current-password',
  ayuda,
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  autoComplete?: string;
  ayuda?: string;
}) {
  const [ver, setVer] = useState(false);
  const { t } = useIdioma();
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="campo-clave">
        <input
          id={id}
          type={ver ? 'text' : 'password'}
          value={valor}
          onChange={(e) => cambiar(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="ojito"
          aria-label={ver ? t('ocultarClave') : t('verClave')}
          aria-pressed={ver}
          onClick={() => setVer((v) => !v)}
        >
          {ver ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
              />
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </button>
      </div>
      {ayuda && <small className="ayuda">{ayuda}</small>}
    </div>
  );
}
