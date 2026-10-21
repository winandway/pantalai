import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CampoClave } from '../componentes/CampoClave';
import { ErrorApi, pedir, type Usuario } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        o: { sitekey: string; callback: (t: string) => void; 'expired-callback': () => void },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

/** Escudo anti-robots: solo aparece si el servidor tiene la clave puesta. */
function useTurnstile(caja: React.RefObject<HTMLDivElement | null>) {
  const [pase, setPase] = useState<string | null>(null);
  const [activo, setActivo] = useState(false);
  const widget = useRef<string | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    pedir<{ turnstile_site_key: string | null }>('/datos/config')
      .then(({ turnstile_site_key: clave }) => {
        if (!clave || !vivo) return;
        setActivo(true);
        const pintar = () => {
          if (caja.current && window.turnstile && vivo)
            widget.current = window.turnstile.render(caja.current, {
              sitekey: clave,
              callback: setPase,
              'expired-callback': () => setPase(null),
            });
        };
        if (window.turnstile) pintar();
        else {
          const s = document.createElement('script');
          s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          s.async = true;
          s.onload = pintar;
          document.head.appendChild(s);
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [caja]);
  return { pase, activo, reiniciar: () => window.turnstile?.reset(widget.current) };
}

export function Entrar({ registro }: { registro: boolean }) {
  const { t, idioma } = useIdioma();
  const { setUsuario, usuario } = useSesion();
  const b = useBorrador(llaveBorrador(registro ? 'registro' : 'entrar', null), { nombre: '', correo: '' });
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const escudo = useTurnstile(caja);

  useEffect(() => {
    if (usuario) navegar('/library', true);
  }, [usuario]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const r = await pedir<{ usuario: Usuario; panel?: string | null }>(
        registro ? '/datos/registro' : '/datos/entrar',
        {
          method: 'POST',
          json: registro
            ? { nombre: b.valor.nombre, correo: b.valor.correo, clave, idioma }
            : { correo: b.valor.correo, clave },
          headers: escudo.pase ? { 'x-turnstile': escudo.pase } : undefined,
        },
      );
      b.limpiar();
      setUsuario({ ...r.usuario, superadmin: Boolean(r.panel), panel: r.panel ?? null });
      // El superadmin entra directo a su panel secreto.
      navegar(r.panel || new URLSearchParams(location.search).get('volver') || '/library', true);
    } catch (err) {
      setError(textoError(t, err instanceof ErrorApi ? err.codigo : 'servidor'));
      escudo.reiniciar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pagina-angosta">
      <form className="tarjeta formulario" onSubmit={enviar}>
        <h1>{registro ? t('crearCuenta') : t('entrar')}</h1>
        {b.recuperado && (
          <p className="recuperado">
            {t('recuperado')}{' '}
            <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
              {t('empezarDeNuevo')}
            </button>
          </p>
        )}
        {registro && (
          <div className="campo">
            <label htmlFor="nombre">{t('nombre')}</label>
            <input
              id="nombre"
              value={b.valor.nombre}
              onChange={(e) => b.cambiar('nombre', e.target.value)}
              autoComplete="name"
              required
              maxLength={80}
            />
          </div>
        )}
        <div className="campo">
          <label htmlFor="correo">{t('correo')}</label>
          <input
            id="correo"
            type="email"
            value={b.valor.correo}
            onChange={(e) => b.cambiar('correo', e.target.value)}
            autoComplete="email"
            placeholder={t('correoEjemplo')}
            required
          />
        </div>
        <CampoClave
          etiqueta={t('clave')}
          valor={clave}
          cambiar={setClave}
          autoComplete={registro ? 'new-password' : 'current-password'}
          ayuda={registro ? t('claveAyuda') : undefined}
        />
        {!registro && (
          <p className="olvide">
            <a href="/forgot-password" onClick={alClicEnlace}>
              {t('olvideClave')}
            </a>
          </p>
        )}
        <div ref={caja} className="turnstile" />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="boton ancho" disabled={enviando || (escudo.activo && !escudo.pase)}>
          {registro ? t('crearCuenta') : t('entrar')}
        </button>
        <p className="ayuda centro">
          {registro ? t('yaTengo') : t('noTengo')}{' '}
          <a href={registro ? '/login' : '/signup'} onClick={alClicEnlace}>
            {registro ? t('entrar') : t('registrarse')}
          </a>
        </p>
      </form>
    </section>
  );
}

/** «¿Olvidaste tu contraseña?»: pide el correo y manda el enlace. Siempre dice lo mismo, exista o no la cuenta. */
export function Recuperar() {
  const { t, idioma } = useIdioma();
  const b = useBorrador(llaveBorrador('recuperar', null), { correo: '' });
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await pedir('/datos/recuperar', { method: 'POST', json: { correo: b.valor.correo, idioma } });
      b.limpiar();
      setListo(true);
    } catch (err) {
      setError(textoError(t, err instanceof ErrorApi ? err.codigo : 'servidor'));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <section className="pagina-angosta">
      <form className="tarjeta formulario" onSubmit={enviar}>
        <h1>{t('recuperarTitulo')}</h1>
        {listo ? (
          <p className="exito-caja" role="status">
            ✉️ {t('recuperarEnviado')}
          </p>
        ) : (
          <>
            <p className="ayuda">{t('recuperarAyuda')}</p>
            <div className="campo">
              <label htmlFor="correo">{t('correo')}</label>
              <input
                id="correo"
                type="email"
                value={b.valor.correo}
                onChange={(e) => b.cambiar('correo', e.target.value)}
                autoComplete="email"
                placeholder={t('correoEjemplo')}
                required
              />
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="boton ancho" disabled={enviando}>
              {t('recuperarBoton')}
            </button>
          </>
        )}
        <p className="ayuda centro">
          <a href="/login" onClick={alClicEnlace}>
            ← {t('entrar')}
          </a>
        </p>
      </form>
    </section>
  );
}

/** La página del enlace del correo: contraseña nueva (dos veces). Las contraseñas nunca se guardan en borrador. */
export function Restablecer() {
  const { t } = useIdioma();
  const token = new URLSearchParams(location.search).get('token') ?? '';
  const [clave, setClave] = useState('');
  const [otra, setOtra] = useState('');
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (clave !== otra) return setError(t('clavesDistintas'));
    setEnviando(true);
    try {
      await pedir('/datos/restablecer', { method: 'POST', json: { token, clave } });
      setListo(true);
    } catch (err) {
      setError(textoError(t, err instanceof ErrorApi ? err.codigo : 'servidor'));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <section className="pagina-angosta">
      <form className="tarjeta formulario" onSubmit={enviar}>
        <h1>{t('nuevaClaveTitulo')}</h1>
        {listo ? (
          <>
            <p className="exito-caja" role="status">
              ✓ {t('nuevaClaveLista')}
            </p>
            <a className="boton ancho" href="/login" onClick={alClicEnlace}>
              {t('entrar')}
            </a>
          </>
        ) : (
          <>
            <CampoClave
              etiqueta={t('nuevaClave')}
              valor={clave}
              cambiar={setClave}
              autoComplete="new-password"
              ayuda={t('claveAyuda')}
            />
            <CampoClave
              etiqueta={t('repetirClave')}
              valor={otra}
              cambiar={setOtra}
              autoComplete="new-password"
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="boton ancho" disabled={enviando || !token}>
              {t('guardarClave')}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
