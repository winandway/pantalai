// Verificar el correo (CANDADO C-VERIFICAR-CORREO): una franja discreta arriba mientras falte confirmarlo, y la
// página del enlace del correo. Nunca una ventana que haya que cerrar.
import { useEffect, useRef, useState } from 'react';
import { ErrorApi, pedir } from '../logica/api';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace } from '../logica/ruta';
import { useSesion } from '../logica/sesion';

export function FranjaCorreo() {
  const { usuario } = useSesion();
  const { t } = useIdioma();
  const [estado, setEstado] = useState<'' | 'enviando' | 'enviado' | string>('');
  if (!usuario || usuario.correo_verificado !== false) return null;
  async function reenviar() {
    setEstado('enviando');
    try {
      await pedir('/datos/verificar/reenviar', { method: 'POST' });
      setEstado('enviado');
    } catch (e) {
      setEstado(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }
  return (
    <div className="franja-correo" role="status">
      <span>
        ✉️ {t('correoFranja')} <strong>{usuario.correo}</strong>
      </span>
      {estado === 'enviado' ? (
        <span className="franja-correo-ok">{t('correoReenviado')}</span>
      ) : estado && estado !== 'enviando' ? (
        <span className="franja-correo-error">{estado}</span>
      ) : (
        <button
          type="button"
          className="enlace"
          disabled={estado === 'enviando'}
          onClick={() => void reenviar()}
        >
          {t('correoReenviar')}
        </button>
      )}
    </div>
  );
}

export function VerificarCorreo() {
  const { t } = useIdioma();
  const { usuario, setUsuario } = useSesion();
  const [estado, setEstado] = useState<'cargando' | 'listo' | string>('cargando');
  const hecho = useRef(false);
  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    const token = new URLSearchParams(location.search).get('token') ?? '';
    pedir('/datos/verificar', { method: 'POST', json: { token } })
      .then(() => setEstado('listo'))
      .catch((e: unknown) => setEstado(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor')));
  }, [t]);
  useEffect(() => {
    if (estado === 'listo' && usuario && usuario.correo_verificado === false)
      setUsuario({ ...usuario, correo_verificado: true });
  }, [estado, usuario, setUsuario]);
  return (
    <section className="pagina-angosta">
      <div className="tarjeta formulario">
        <h1>{t('correoVerificadoTitulo')}</h1>
        {estado === 'cargando' ? (
          <p role="status">{t('correoVerificando')}</p>
        ) : estado === 'listo' ? (
          <p className="exito-caja" role="status">
            ✓ {t('correoVerificadoOk')}
          </p>
        ) : (
          <p className="error" role="alert">
            {estado}
          </p>
        )}
        <a className="boton ancho" href={usuario ? '/library' : '/login'} onClick={alClicEnlace}>
          {usuario ? t('irBiblioteca') : t('entrar')}
        </a>
      </div>
    </section>
  );
}
