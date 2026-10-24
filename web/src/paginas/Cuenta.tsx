// «Mi cuenta»: nombre, contraseña, plan (ver, cancelar o mantener) y borrar la cuenta.
// Borrar vive SOLO dentro del menú de tres puntos y pide la contraseña (reglas globales).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CampoClave } from '../componentes/CampoClave';
import { useAviso } from '../componentes/Aviso';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { Modal } from '../componentes/Modal';
import { ErrorApi, pedir, type Usuario } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';

type Renovacion = {
  status: string;
  periodo_fin: number | null;
  cancela_al_final: boolean;
  monto: number;
  intervalo: string;
};
type EstadoPlan = { plan: string; ciclo: string | null; renovacion: Renovacion | null };

const NOMBRES: Record<string, string> = {
  business: 'Business',
  business_ia: 'Business + AI',
  enterprise: 'Enterprise',
};

export function Cuenta() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando, setUsuario } = useSesion();
  const avisar = useAviso();
  const [plan, setPlan] = useState<EstadoPlan | null>(null);
  const [borrar, setBorrar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState<AjustesCuenta | null>(null);

  useEffect(() => {
    if (!usuario) return;
    pedir<AjustesCuenta>('/datos/cuenta/ajustes')
      .then(setAjustes)
      .catch(() => setAjustes({ empresa: '', marca: false, marca_obligatoria: false }));
  }, [usuario]);

  useEffect(() => {
    if (!cargando && !usuario) navegar('/login');
  }, [cargando, usuario]);
  useEffect(() => {
    document.title = `${t('cta.titulo')} · Pantalay`;
  }, [t]);

  const cargarPlan = useCallback(async () => {
    try {
      setPlan(await pedir<EstadoPlan>('/datos/plan'));
    } catch {
      /* sin plan visible: la sección dice «gratis» */
    }
  }, []);
  useEffect(() => {
    if (usuario) void cargarPlan();
  }, [usuario, cargarPlan]);

  if (!usuario) return null;
  const fecha = (ms: number | null) =>
    ms ? new Date(ms).toLocaleDateString(idioma, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const r = plan?.renovacion;

  async function accionPlan(ruta: '/datos/pago/cancelar' | '/datos/pago/reanudar', aviso: string) {
    setError(null);
    try {
      await pedir(ruta, { method: 'POST' });
      avisar(aviso);
      setCancelar(false);
      await cargarPlan();
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }

  return (
    <section className="pagina-angosta cuenta-pagina">
      <h1>{t('cta.titulo')}</h1>
      {ajustes && <Perfil usuario={usuario} empresa={ajustes.empresa} cambiar={(u) => setUsuario(u)} />}
      <CambiarClave />
      {ajustes && <MarcaDeAgua ajustes={ajustes} cambiar={setAjustes} />}

      <div className="tarjeta formulario">
        <h2>{t('cta.plan')}</h2>
        <p className="plan-actual">
          <strong>{plan && plan.plan !== 'starter' ? NOMBRES[plan.plan] : t('cta.planGratis')}</strong>
          {r?.periodo_fin && (
            <span className="ayuda">
              {' '}
              · {r.cancela_al_final ? t('cta.termina') : t('cta.renueva')} {fecha(r.periodo_fin)}
            </span>
          )}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="fila-botones izquierda">
          <a className="boton secundario" href="/pricing" onClick={alClicEnlace}>
            {t('cta.verPlanes')}
          </a>
          {r && !r.cancela_al_final && r.status !== 'canceled' && (
            <button type="button" className="boton secundario" onClick={() => setCancelar(true)}>
              {t('cta.cancelarPlan')}
            </button>
          )}
          {r?.cancela_al_final && (
            <button
              type="button"
              className="boton"
              onClick={() => void accionPlan('/datos/pago/reanudar', t('cta.reanudado'))}
            >
              {t('cta.reanudar')}
            </button>
          )}
        </div>
      </div>

      <div className="tarjeta formulario cuenta-legal">
        <div className="cuenta-legal-fila">
          <h2>{t('cta.legal')}</h2>
          <MenuPuntos
            opciones={[{ etiqueta: t('cta.peligro'), accion: () => setBorrar(true), peligro: true }]}
          />
        </div>
        <p className="ayuda">
          <a href="/terms" onClick={alClicEnlace}>
            {t('legal.pie')}
          </a>{' '}
          ·{' '}
          <a href="/privacy" onClick={alClicEnlace}>
            {t('legal.privacidad')}
          </a>{' '}
          ·{' '}
          <a href="/acceptable-use" onClick={alClicEnlace}>
            {t('legal.uso')}
          </a>{' '}
          ·{' '}
          <a href="/cookies" onClick={alClicEnlace}>
            {t('legal.cookies')}
          </a>
        </p>
      </div>

      {cancelar && (
        <Modal titulo={t('cta.cancelarPlan')} cerrar={() => setCancelar(false)} ancho={440}>
          <p>{t('cta.cancelarTexto')}</p>
          <div className="fila-botones">
            <button type="button" className="boton secundario" onClick={() => setCancelar(false)}>
              {t('cta.reanudar')}
            </button>
            <button
              type="button"
              className="boton peligro"
              onClick={() => void accionPlan('/datos/pago/cancelar', t('cta.planCancelado'))}
            >
              {t('cta.cancelarPlan')}
            </button>
          </div>
        </Modal>
      )}
      {borrar && <BorrarCuenta cerrar={() => setBorrar(false)} />}
    </section>
  );
}

type AjustesCuenta = { empresa: string; marca: boolean; marca_obligatoria: boolean };

/** Marca de agua: en el plan gratis va siempre; con plan pago (o superadmin) se enciende para videos de publicidad. */
function MarcaDeAgua({ ajustes, cambiar }: { ajustes: AjustesCuenta; cambiar: (a: AjustesCuenta) => void }) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [error, setError] = useState<string | null>(null);
  async function alternar(marca: boolean) {
    setError(null);
    try {
      await pedir('/datos/cuenta/ajustes', { method: 'PATCH', json: { marca } });
      cambiar({ ...ajustes, marca });
      avisar(marca ? t('cfg.marcaEncendida') : t('cfg.marcaApagada'));
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }
  return (
    <div className="tarjeta formulario">
      <h2>{t('cfg.marca')}</h2>
      <label className="interruptor">
        <input
          type="checkbox"
          checked={ajustes.marca}
          disabled={ajustes.marca_obligatoria}
          onChange={(e) => void alternar(e.target.checked)}
        />
        {t('cfg.marcaOpcion')}
      </label>
      <p className="ayuda">{ajustes.marca_obligatoria ? t('cfg.marcaGratis') : t('cfg.marcaAyuda')}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Perfil({
  usuario,
  empresa,
  cambiar,
}: {
  usuario: Usuario;
  empresa: string;
  cambiar: (u: Usuario) => void;
}) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const b = useBorrador(llaveBorrador('cuenta-perfil', usuario.id), { nombre: usuario.nombre, empresa });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await pedir<{ usuario: Usuario }>('/datos/yo', {
        method: 'PATCH',
        json: { nombre: b.valor.nombre },
      });
      await pedir('/datos/cuenta/ajustes', { method: 'PATCH', json: { empresa: b.valor.empresa } });
      b.limpiar();
      cambiar({ ...usuario, ...r.usuario });
      avisar(t('cta.guardado'));
    } catch (er) {
      setError(textoError(t, er instanceof ErrorApi ? er.codigo : 'servidor'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h2>{t('cta.perfil')}</h2>
      {b.recuperado && (
        <p className="recuperado">
          {t('recuperado')}{' '}
          <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
            {t('empezarDeNuevo')}
          </button>
        </p>
      )}
      <div className="campo">
        <label htmlFor="cuenta-nombre">{t('cta.nombre')}</label>
        <input
          id="cuenta-nombre"
          value={b.valor.nombre}
          onChange={(e) => b.cambiar('nombre', e.target.value)}
          maxLength={80}
          autoComplete="name"
          required
        />
      </div>
      <div className="campo">
        <label htmlFor="cuenta-empresa">{t('cfg.empresa')}</label>
        <input
          id="cuenta-empresa"
          value={b.valor.empresa}
          onChange={(e) => b.cambiar('empresa', e.target.value)}
          maxLength={120}
          autoComplete="organization"
          placeholder={t('cfg.empresaEjemplo')}
        />
      </div>
      <div className="campo">
        <label htmlFor="cuenta-correo">{t('cta.correo')}</label>
        <input id="cuenta-correo" value={usuario.correo} readOnly disabled />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="boton" disabled={enviando || !b.valor.nombre.trim()}>
        {t('cta.guardar')}
      </button>
    </form>
  );
}

function CambiarClave() {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await pedir('/datos/clave', { method: 'POST', json: { actual, nueva } });
      setActual('');
      setNueva('');
      avisar(t('cta.claveCambiada'));
    } catch (er) {
      setError(textoError(t, er instanceof ErrorApi ? er.codigo : 'servidor'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h2>{t('cta.clave')}</h2>
      <CampoClave etiqueta={t('cta.claveActual')} valor={actual} cambiar={setActual} />
      <CampoClave
        etiqueta={t('cta.claveNueva')}
        valor={nueva}
        cambiar={setNueva}
        autoComplete="new-password"
        ayuda={t('cta.claveAyuda')}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="boton" disabled={enviando || !actual || nueva.length < 8}>
        {t('cta.cambiarClave')}
      </button>
    </form>
  );
}

function BorrarCuenta({ cerrar }: { cerrar: () => void }) {
  const { t } = useIdioma();
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await pedir('/datos/cuenta/borrar', { method: 'POST', json: { clave } });
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k?.startsWith('pantalai:borrador:')) localStorage.removeItem(k);
        }
      } catch {
        /* sin almacenamiento */
      }
      // Carga completa: nada de la cuenta queda en pantalla.
      window.location.href = '/?cuenta=borrada';
    } catch (er) {
      setError(textoError(t, er instanceof ErrorApi ? er.codigo : 'servidor'));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={t('cta.borrarTitulo')} cerrar={cerrar} ancho={460}>
      <form className="formulario" onSubmit={enviar}>
        <p>{t('cta.borrarTexto')}</p>
        <p className="ayuda">{t('cta.descargarAntes')}</p>
        <CampoClave etiqueta={t('cta.borrarClave')} valor={clave} cambiar={setClave} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="fila-botones">
          <button type="button" className="boton secundario" onClick={cerrar}>
            {t('cancelar')}
          </button>
          <button className="boton peligro" disabled={enviando || !clave}>
            {t('cta.borrarBoton')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
