// Partes del superadmin para operar: pagos de Stripe, ficha completa de cada cliente (con suspender y bloquear IP)
// y seguridad (direcciones IP bloqueadas y las que más golpean la puerta del panel).
import { useCallback, useEffect, useState } from 'react';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { Confirmar } from '../componentes/Modal';
import { pedir } from '../logica/api';
import { haceCuanto, useIdioma } from '../logica/idioma';
import { formatoTiempo } from '../logica/tiempo';

/** El servidor exige la dirección secreta en cada pedido del panel: la página la toma de su propia dirección. */
export const panel = () => ({ 'x-panel': location.pathname });

export function tamano(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

export const NOMBRE_PLAN: Record<string, string> = {
  starter: 'Starter',
  business: 'Business',
  business_ia: 'Business + AI',
  enterprise: 'Enterprise',
};

const dolares = (centavos: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(centavos / 100);

/** Cómo se dice cada estado de Stripe, y su color (verde = bien, rojo = problema, gris = neutro). */
export function estadoPago(status: string, es: boolean): { texto: string; clase: string } {
  const m: Record<string, [string, string, string]> = {
    active: ['Pagando', 'Paying', 'bien'],
    trialing: ['En prueba gratis', 'Free trial', 'neutro'],
    past_due: ['Pago atrasado', 'Past due', 'mal'],
    unpaid: ['Sin pagar', 'Unpaid', 'mal'],
    incomplete: ['Pago sin terminar', 'Incomplete', 'mal'],
    incomplete_expired: ['Pago abandonado', 'Abandoned', 'neutro'],
    canceled: ['Cancelado', 'Canceled', 'neutro'],
  };
  const x = m[status] ?? [status, status, 'neutro'];
  return { texto: es ? x[0] : x[1], clase: x[2] };
}

const enlaceStripe = (ruta: string) => `https://dashboard.stripe.com/${ruta}`;

type Cliente = {
  id: string;
  nombre: string;
  correo: string;
  status: string;
  monto: number;
  intervalo: string;
  periodo_fin: number;
  cancela_al_final: number;
  plan: string;
  cliente: string | null;
  suscripcion: string | null;
};

export function PestanaPagos({ abrirFicha }: { abrirFicha: (id: string) => void }) {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [d, setD] = useState<{
    resumen: {
      pagan: number;
      prueba: number;
      problemas: number;
      cancelados: number;
      gratis: number;
      mrr: number;
    };
    clientes: Cliente[];
  } | null>(null);
  useEffect(() => {
    void pedir<NonNullable<typeof d>>('/datos/admin/pagos', { headers: panel() }).then(setD);
  }, []);
  if (!d) return <div className="cargando" aria-busy="true" />;
  const r = d.resumen;
  return (
    <div className="admin-pagos">
      <div className="admin-cifras">
        <div>
          <span>{es ? 'Ingreso mensual (MRR)' : 'Monthly revenue (MRR)'}</span>
          <strong>{dolares(r.mrr)}</strong>
          <small>{es ? 'lo anual cuenta un doceavo' : 'annual counts 1/12'}</small>
        </div>
        <div>
          <span>{es ? 'Pagando' : 'Paying'}</span>
          <strong className="bien">{r.pagan}</strong>
          <small>
            {r.prueba} {es ? 'en prueba gratis' : 'in free trial'}
          </small>
        </div>
        <div>
          <span>{es ? 'Con problemas de pago' : 'Payment problems'}</span>
          <strong className={r.problemas ? 'mal' : ''}>{r.problemas}</strong>
          <small>
            {r.cancelados} {es ? 'cancelados' : 'canceled'}
          </small>
        </div>
        <div>
          <span>{es ? 'Plan gratis' : 'Free plan'}</span>
          <strong>{r.gratis}</strong>
          <small>Starter</small>
        </div>
      </div>
      <div className="admin-tabla-marco">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>{es ? 'Cliente' : 'Customer'}</th>
              <th>Plan</th>
              <th>{es ? 'Estado' : 'Status'}</th>
              <th>{es ? 'Monto' : 'Amount'}</th>
              <th>{es ? 'Renueva / termina' : 'Renews / ends'}</th>
              <th>Stripe</th>
            </tr>
          </thead>
          <tbody>
            {d.clientes.map((c) => {
              const e = estadoPago(c.status, es);
              return (
                <tr key={c.id}>
                  <td>
                    <button type="button" className="enlace" onClick={() => abrirFicha(c.id)}>
                      {c.nombre}
                    </button>
                    <br />
                    <small>{c.correo}</small>
                  </td>
                  <td>{NOMBRE_PLAN[c.plan] ?? c.plan}</td>
                  <td>
                    <span className={`estado-pago ${e.clase}`}>{e.texto}</span>
                    {c.cancela_al_final ? (
                      <small> · {es ? 'cancela al final' : 'cancels at end'}</small>
                    ) : null}
                  </td>
                  <td>
                    {dolares(c.monto)} /{' '}
                    {c.intervalo === 'year' ? (es ? 'año' : 'year') : es ? 'mes' : 'month'}
                  </td>
                  <td>{c.periodo_fin ? new Date(c.periodo_fin).toLocaleDateString(idioma) : '—'}</td>
                  <td>
                    {c.cliente && (
                      <a
                        href={enlaceStripe(`customers/${c.cliente}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {es ? 'Abrir' : 'Open'} ↗
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {d.clientes.length === 0 && (
          <p className="vacio">{es ? 'Todavía nadie se ha suscrito.' : 'No subscriptions yet.'}</p>
        )}
      </div>
    </div>
  );
}

type Ficha = {
  usuario: { id: string; nombre: string; correo: string; creado: number };
  plan: { plan: string; estado: string; fundador: number };
  pago: { cliente: string; suscripcion: string | null; ciclo: string | null } | null;
  estado: { status: string; monto: number; intervalo: string; periodo_fin: number } | null;
  suspension: { motivo: string; momento: number } | null;
  accesos: { ip: string; pais: string; agente: string; momento: number; bloqueada: number }[];
  videos: {
    id: string;
    titulo: string;
    duracion: number;
    bytes: number;
    privacidad: string;
    tiene_miniatura: number;
    creado: number;
    revision: string | null;
    firma: string;
  }[];
  bytes: number;
};

export function FichaCliente({
  id,
  cerrar,
  mirar,
}: {
  id: string;
  cerrar: () => void;
  mirar: (v: Ficha['videos'][number]) => void;
}) {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [f, setF] = useState<Ficha | null>(null);
  const [confirmar, setConfirmar] = useState<{
    texto: string;
    si: string;
    accion: () => Promise<unknown>;
  } | null>(null);
  const [motivo, setMotivo] = useState('');
  const cargar = useCallback(() => {
    void pedir<Ficha>(`/datos/admin/usuarios/${id}`, { headers: panel() }).then(setF);
  }, [id]);
  useEffect(cargar, [cargar]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && !confirmar && cerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [cerrar, confirmar]);

  const accion = (ruta: string, metodo: 'POST' | 'DELETE', json?: unknown) =>
    pedir(ruta, { method: metodo, headers: panel(), json }).then(cargar);

  return (
    <div
      className="admin-visor"
      role="dialog"
      aria-modal="true"
      aria-label={es ? 'Ficha del cliente' : 'Customer profile'}
    >
      <div className="admin-visor-caja admin-ficha">
        {!f ? (
          <div className="cargando" aria-busy="true" />
        ) : (
          <>
            <div className="admin-visor-cabeza">
              <div>
                <strong className="admin-ficha-nombre">{f.usuario.nombre}</strong>
                <span className="ayuda">
                  {' '}
                  {f.usuario.correo} · {es ? 'desde' : 'since'}{' '}
                  {new Date(f.usuario.creado).toLocaleDateString(idioma)}
                </span>
              </div>
              <div className="fila-botones">
                <MenuPuntos
                  opciones={
                    f.suspension
                      ? [
                          {
                            etiqueta: es ? 'Reactivar la cuenta' : 'Reactivate account',
                            accion: () =>
                              setConfirmar({
                                texto: es
                                  ? 'La cuenta vuelve a entrar y sus videos vuelven a estar como antes de la suspensión.'
                                  : 'The account can log in again and its videos go back to how they were.',
                                si: es ? 'Reactivar' : 'Reactivate',
                                accion: () => accion(`/datos/admin/usuarios/${id}/reactivar`, 'POST'),
                              }),
                          },
                        ]
                      : [
                          {
                            etiqueta: es ? 'Suspender la cuenta' : 'Suspend account',
                            peligro: true,
                            accion: () =>
                              setConfirmar({
                                texto: es
                                  ? `${f.usuario.nombre} no podrá entrar, se le cierran las sesiones y TODOS sus videos salen del aire. Se puede deshacer con «Reactivar».`
                                  : `${f.usuario.nombre} can’t log in, sessions close and ALL videos go offline. You can undo it with “Reactivate”.`,
                                si: es ? 'Suspender' : 'Suspend',
                                accion: () =>
                                  accion(`/datos/admin/usuarios/${id}/suspender`, 'POST', { motivo }),
                              }),
                          },
                        ]
                  }
                />
                <button type="button" className="boton secundario chico" onClick={cerrar}>
                  {es ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>

            {f.suspension && (
              <p className="admin-suspendida" role="status">
                ⛔ {es ? 'Cuenta suspendida' : 'Account suspended'} {haceCuanto(f.suspension.momento, idioma)}
                {f.suspension.motivo ? ` · ${f.suspension.motivo}` : ''}
              </p>
            )}

            <div className="admin-cifras">
              <div>
                <span>Plan</span>
                <strong>{NOMBRE_PLAN[f.plan.plan] ?? f.plan.plan}</strong>
                <small>
                  {f.estado ? estadoPago(f.estado.status, es).texto : es ? 'sin pago' : 'no payment'}
                  {f.plan.fundador ? ` · ${es ? 'fundador' : 'founder'}` : ''}
                </small>
              </div>
              <div>
                <span>{es ? 'Videos' : 'Videos'}</span>
                <strong>{f.videos.length}</strong>
                <small>{tamano(f.bytes)}</small>
              </div>
              <div>
                <span>{es ? 'Minutos grabados' : 'Minutes recorded'}</span>
                <strong>{Math.round(f.videos.reduce((t, v) => t + v.duracion, 0) / 60)}</strong>
                <small>
                  {f.videos.filter((v) => !v.revision).length} {es ? 'sin revisar' : 'not reviewed'}
                </small>
              </div>
              <div>
                <span>Stripe</span>
                {f.pago?.cliente ? (
                  <a
                    href={enlaceStripe(`customers/${f.pago.cliente}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {es ? 'Ver cliente en Stripe' : 'Open in Stripe'} ↗
                  </a>
                ) : (
                  <small>{es ? 'Nunca pagó' : 'Never paid'}</small>
                )}
                {f.pago?.suscripcion && (
                  <a
                    href={enlaceStripe(`subscriptions/${f.pago.suscripcion}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {es ? 'Ver suscripción' : 'Open subscription'} ↗
                  </a>
                )}
              </div>
            </div>

            {!f.suspension && (
              <div className="campo">
                <label htmlFor="motivo">
                  {es ? 'Motivo (si vas a suspender)' : 'Reason (if you suspend)'}
                </label>
                <input
                  id="motivo"
                  value={motivo}
                  maxLength={300}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            )}

            <h3>{es ? 'Lo que grabó' : 'What they recorded'}</h3>
            <div className="admin-ficha-videos">
              {f.videos.map((v) => (
                <button key={v.id} type="button" className="admin-ficha-video" onClick={() => mirar(v)}>
                  {v.tiene_miniatura ? (
                    <img src={`/media/${v.id}/miniatura?panel=${v.firma}`} alt="" loading="lazy" />
                  ) : (
                    <span className="admin-sin-miniatura">▶</span>
                  )}
                  <span className="admin-duracion">{formatoTiempo(v.duracion)}</span>
                  <strong>{v.titulo}</strong>
                  <small>
                    {haceCuanto(v.creado, idioma)} · {v.privacidad === 'privado' ? '🔒' : '🔗'}{' '}
                    {v.revision === 'ok' ? '✓' : v.revision === 'sacado' ? '⛔' : '•'}
                  </small>
                </button>
              ))}
              {f.videos.length === 0 && (
                <p className="ayuda">{es ? 'No ha grabado nada.' : 'No recordings.'}</p>
              )}
            </div>

            <h3>{es ? 'Accesos (últimos 30)' : 'Logins (last 30)'}</h3>
            <div className="admin-tabla-marco">
              <table className="admin-tabla">
                <thead>
                  <tr>
                    <th>{es ? 'Cuándo' : 'When'}</th>
                    <th>IP</th>
                    <th>{es ? 'País' : 'Country'}</th>
                    <th>{es ? 'Navegador' : 'Browser'}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {f.accesos.map((a, i) => (
                    <tr key={i}>
                      <td>{haceCuanto(a.momento, idioma)}</td>
                      <td>
                        <code>{a.ip}</code>
                      </td>
                      <td>{a.pais || '—'}</td>
                      <td className="admin-agente" title={a.agente}>
                        {a.agente}
                      </td>
                      <td>
                        {a.bloqueada ? (
                          <span className="estado-pago mal">{es ? 'Bloqueada' : 'Blocked'}</span>
                        ) : (
                          <MenuPuntos
                            opciones={[
                              {
                                etiqueta: es ? 'Bloquear esta IP' : 'Block this IP',
                                peligro: true,
                                accion: () =>
                                  setConfirmar({
                                    texto: es
                                      ? `Nadie desde ${a.ip} podrá usar Pantalay hasta que la desbloquees en Seguridad.`
                                      : `Nobody from ${a.ip} can use Pantalay until you unblock it in Security.`,
                                    si: es ? 'Bloquear' : 'Block',
                                    accion: () =>
                                      accion('/datos/admin/ips', 'POST', {
                                        ip: a.ip,
                                        motivo: `${f.usuario.correo}${motivo ? ` · ${motivo}` : ''}`,
                                      }),
                                  }),
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {confirmar && (
        <Confirmar
          texto={confirmar.texto}
          etiquetaSi={confirmar.si}
          etiquetaNo={es ? 'Cancelar' : 'Cancel'}
          no={() => setConfirmar(null)}
          si={() => {
            const c = confirmar;
            setConfirmar(null);
            void c.accion();
          }}
        />
      )}
    </div>
  );
}

export function PestanaSeguridad() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [d, setD] = useState<{
    bloqueadas: { ip: string; motivo: string; momento: number; admin: string | null }[];
    intentos: { ip: string; n: number; ultimo: number }[];
  } | null>(null);
  const [ip, setIp] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const cargar = useCallback(() => {
    void pedir<NonNullable<typeof d>>('/datos/admin/ips', { headers: panel() }).then(setD);
  }, []);
  useEffect(cargar, [cargar]);
  const bloquear = (x: string, m: string) =>
    pedir('/datos/admin/ips', { method: 'POST', headers: panel(), json: { ip: x, motivo: m } })
      .then(() => (setIp(''), setMotivo(''), setError(''), cargar()))
      .catch(() =>
        setError(es ? 'Revisa la IP (y no puede ser la tuya).' : 'Check the IP (it can’t be yours).'),
      );
  if (!d) return <div className="cargando" aria-busy="true" />;
  return (
    <div className="admin-seguridad">
      <form
        className="admin-bloquear"
        onSubmit={(e) => {
          e.preventDefault();
          if (ip.trim()) void bloquear(ip.trim(), motivo);
        }}
      >
        <div className="campo">
          <label htmlFor="ip">{es ? 'Bloquear una dirección IP' : 'Block an IP address'}</label>
          <input id="ip" value={ip} placeholder="203.0.113.7" onChange={(e) => setIp(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ip-motivo">{es ? 'Motivo' : 'Reason'}</label>
          <input id="ip-motivo" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <button type="submit" className="boton">
          {es ? 'Bloquear' : 'Block'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      <h3>{es ? 'Direcciones bloqueadas' : 'Blocked addresses'}</h3>
      <div className="admin-tabla-marco">
        <table className="admin-tabla">
          <tbody>
            {d.bloqueadas.map((b) => (
              <tr key={b.ip}>
                <td>
                  <code>{b.ip}</code>
                </td>
                <td>{b.motivo || '—'}</td>
                <td>
                  {haceCuanto(b.momento, idioma)} · {b.admin}
                </td>
                <td>
                  <button
                    type="button"
                    className="boton secundario chico"
                    onClick={() =>
                      void pedir(`/datos/admin/ips/${encodeURIComponent(b.ip)}`, {
                        method: 'DELETE',
                        headers: panel(),
                      }).then(cargar)
                    }
                  >
                    {es ? 'Desbloquear' : 'Unblock'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.bloqueadas.length === 0 && <p className="ayuda">{es ? 'Ninguna.' : 'None.'}</p>}
      </div>

      <h3>{es ? 'Quién golpea la puerta del panel' : 'Who knocks on the panel door'}</h3>
      <p className="ayuda">
        {es
          ? 'Direcciones que intentaron entrar al panel sin permiso (o a /admin). Bloquéalas con un toque.'
          : 'Addresses that tried to open the panel without permission (or /admin). Block them with one tap.'}
      </p>
      <div className="admin-tabla-marco">
        <table className="admin-tabla">
          <tbody>
            {d.intentos.map((x) => (
              <tr key={x.ip}>
                <td>
                  <code>{x.ip}</code>
                </td>
                <td>
                  {x.n} {es ? 'intentos' : 'attempts'}
                </td>
                <td>{haceCuanto(x.ultimo, idioma)}</td>
                <td>
                  {d.bloqueadas.some((b) => b.ip === x.ip) ? (
                    <span className="estado-pago mal">{es ? 'Bloqueada' : 'Blocked'}</span>
                  ) : (
                    <button
                      type="button"
                      className="boton secundario chico"
                      onClick={() => void bloquear(x.ip, es ? 'intentos en el panel' : 'panel attempts')}
                    >
                      {es ? 'Bloquear' : 'Block'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Almacen = {
  total: number;
  originales: number;
  mp4: number;
  miniaturas: number;
  videos: number;
  minutos: number;
  limite: number;
  por_minuto: number;
  ultimos_7_dias: number;
  ultimos_30_dias: number;
  usuarios: { id: string; nombre: string; correo: string; videos: number; bytes: number }[];
  mayores: {
    id: string;
    titulo: string;
    duracion: number;
    original: number;
    mp4: number;
    usuario: string;
    usuario_id: string;
  }[];
};

/** Cuántos días faltan para llenar el espacio al ritmo de los últimos 30 días (null si no crece). */
export function diasParaLlenar(libre: number, ultimos30: number): number | null {
  if (ultimos30 <= 0) return null;
  return Math.max(0, Math.round(libre / (ultimos30 / 30)));
}

export function PestanaAlmacen({ abrirFicha }: { abrirFicha: (id: string) => void }) {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [d, setD] = useState<Almacen | null>(null);
  useEffect(() => {
    void pedir<Almacen>('/datos/admin/almacen', { headers: panel() }).then(setD);
  }, []);
  if (!d) return <div className="cargando" aria-busy="true" />;
  const uso = Math.min(1, d.total / d.limite);
  const libre = Math.max(0, d.limite - d.total);
  const horas = d.por_minuto > 0 ? libre / (d.por_minuto * 60) : null;
  const dias = diasParaLlenar(libre, d.ultimos_30_dias);
  const color = uso > 0.9 ? 'mal' : uso > 0.7 ? 'aviso' : 'bien';
  return (
    <div className="admin-almacen">
      <div className="admin-almacen-barra">
        <div className="admin-almacen-cabeza">
          <strong>
            {tamano(d.total)} {es ? 'de' : 'of'} {tamano(d.limite)}
          </strong>
          <span>
            {Math.round(uso * 1000) / 10} % {es ? 'usado' : 'used'}
          </span>
        </div>
        <div
          className={`admin-medidor ${color}`}
          role="meter"
          aria-valuenow={Math.round(uso * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${Math.max(1, (d.originales / d.limite) * 100)}%` }} className="original" />
          <span style={{ width: `${(d.mp4 / d.limite) * 100}%` }} className="mp4" />
          <span style={{ width: `${(d.miniaturas / d.limite) * 100}%` }} className="mini" />
        </div>
        <p className="admin-leyenda">
          <i className="original" /> {es ? 'Grabaciones originales' : 'Original recordings'}{' '}
          {tamano(d.originales)} · <i className="mp4" /> {es ? 'Copias MP4' : 'MP4 copies'} {tamano(d.mp4)} ·{' '}
          <i className="mini" /> {es ? 'Miniaturas' : 'Thumbnails'} {tamano(d.miniaturas)}
        </p>
        {uso > 0.7 && (
          <p className="admin-suspendida" role="alert">
            ⚠️{' '}
            {es
              ? 'El espacio se está llenando. Habla con Windoce para subir el almacenamiento antes de que se llene.'
              : 'Storage is filling up. Raise the storage limit before it runs out.'}
          </p>
        )}
      </div>
      <div className="admin-cifras">
        <div>
          <span>{es ? 'Videos guardados' : 'Stored videos'}</span>
          <strong>{d.videos}</strong>
          <small>
            {d.minutos} {es ? 'minutos grabados' : 'minutes recorded'}
          </small>
        </div>
        <div>
          <span>{es ? 'Cada minuto ocupa' : 'Each minute takes'}</span>
          <strong>{tamano(d.por_minuto)}</strong>
          <small>{es ? 'original + copia MP4' : 'original + MP4 copy'}</small>
        </div>
        <div>
          <span>{es ? 'Crecimiento' : 'Growth'}</span>
          <strong>+{tamano(d.ultimos_30_dias)}</strong>
          <small>
            {es ? 'en 30 días' : 'in 30 days'} · +{tamano(d.ultimos_7_dias)} {es ? 'en 7' : 'in 7'}
          </small>
        </div>
        <div>
          <span>{es ? 'Todavía caben' : 'Still fits'}</span>
          <strong>{horas === null ? '—' : `${Math.round(horas)} h`}</strong>
          <small>
            {dias === null
              ? es
                ? 'de video'
                : 'of video'
              : dias > 730
                ? es
                  ? `a este ritmo, más de ${Math.floor(dias / 365)} años`
                  : `at this pace, over ${Math.floor(dias / 365)} years`
                : es
                  ? `se llena en unos ${dias} días`
                  : `full in about ${dias} days`}
          </small>
        </div>
      </div>
      <div className="admin-dos">
        <div>
          <h3>{es ? 'Quién ocupa más' : 'Who uses the most'}</h3>
          <table className="admin-tabla">
            <tbody>
              {d.usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <button type="button" className="enlace" onClick={() => abrirFicha(u.id)}>
                      {u.nombre}
                    </button>
                    <br />
                    <small>{u.correo}</small>
                  </td>
                  <td>
                    {u.videos} {u.videos === 1 ? 'video' : 'videos'}
                  </td>
                  <td>
                    <b>{tamano(u.bytes)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>{es ? 'Los videos más pesados' : 'Heaviest videos'}</h3>
          <table className="admin-tabla">
            <tbody>
              {d.mayores.map((v) => (
                <tr key={v.id}>
                  <td>
                    <button type="button" className="enlace" onClick={() => abrirFicha(v.usuario_id)}>
                      {v.titulo}
                    </button>
                    <br />
                    <small>
                      {v.usuario} · {formatoTiempo(v.duracion)}
                    </small>
                  </td>
                  <td>
                    <b>{tamano(v.original + v.mp4)}</b>
                    <br />
                    <small>
                      {tamano(v.original)} + MP4 {tamano(v.mp4)}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type Sistema = {
  ia: {
    oido: boolean;
    cerebro: boolean;
    usd_mes: number;
    tope_usd_mes: number;
    minutos_hoy: number;
    tope_minutos_dia: number;
  };
  correo: { listo: boolean; hoy: number; fallidos_hoy: number; mes: number; cuota_dia: number };
  pago: { listo: boolean; cobro_activo: boolean; cuenta: string };
  seguridad: { turnstile: boolean; intentos_24h: number };
  version: string;
};

export function PestanaSistema() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [d, setD] = useState<Sistema | null>(null);
  useEffect(() => {
    void pedir<Sistema>('/datos/admin/sistema', { headers: panel() }).then(setD);
  }, []);
  if (!d) return <div className="cargando" aria-busy="true" />;
  const luz = (ok: boolean, si: string, no: string) => (
    <span className={`estado-pago ${ok ? 'bien' : 'mal'}`}>{ok ? si : no}</span>
  );
  const dolar = (n: number) => `$${n.toFixed(2)}`;
  return (
    <div className="admin-sistema">
      <div className="admin-tarjetas">
        <section>
          <h3>🧠 {es ? 'Inteligencia artificial' : 'AI'}</h3>
          <p>
            {luz(
              d.ia.oido,
              es ? 'Transcripción encendida' : 'Transcription on',
              es ? 'Transcripción apagada' : 'Transcription off',
            )}{' '}
            {luz(d.ia.cerebro, es ? 'Gemini encendido' : 'Gemini on', es ? 'Gemini apagado' : 'Gemini off')}
          </p>
          <p className="admin-grande">
            {dolar(d.ia.usd_mes)}{' '}
            <small>
              / {dolar(d.ia.tope_usd_mes)} {es ? 'este mes' : 'this month'}
            </small>
          </p>
          <div className={`admin-medidor ${d.ia.usd_mes / d.ia.tope_usd_mes > 0.8 ? 'mal' : 'bien'}`}>
            <span
              className="original"
              style={{ width: `${Math.min(100, (d.ia.usd_mes / d.ia.tope_usd_mes) * 100)}%` }}
            />
          </div>
          <p className="ayuda">
            {d.ia.minutos_hoy} / {d.ia.tope_minutos_dia}{' '}
            {es
              ? 'minutos transcritos hoy. Si se llega al tope, la IA se detiene sola.'
              : 'minutes transcribed today. AI stops by itself at the cap.'}
          </p>
        </section>
        <section>
          <h3>✉️ {es ? 'Correo' : 'Email'}</h3>
          <p>{luz(d.correo.listo, 'noreply@pantalay.com', es ? 'Sin configurar' : 'Not set up')}</p>
          <p className="admin-grande">
            {d.correo.hoy}{' '}
            <small>
              / {d.correo.cuota_dia} {es ? 'hoy' : 'today'}
            </small>
          </p>
          <div className={`admin-medidor ${d.correo.hoy / d.correo.cuota_dia > 0.8 ? 'mal' : 'bien'}`}>
            <span
              className="original"
              style={{ width: `${Math.min(100, (d.correo.hoy / d.correo.cuota_dia) * 100)}%` }}
            />
          </div>
          <p className="ayuda">
            {d.correo.mes} {es ? 'este mes' : 'this month'} · {d.correo.fallidos_hoy}{' '}
            {es ? 'fallidos hoy' : 'failed today'}
          </p>
        </section>
        <section>
          <h3>💳 Stripe</h3>
          <p>
            {luz(d.pago.listo, es ? 'Conectado' : 'Connected', es ? 'Sin conectar' : 'Not connected')}{' '}
            <span className="estado-pago">
              {d.pago.cuenta === 'vivo'
                ? es
                  ? 'Cuenta real'
                  : 'Live account'
                : es
                  ? 'Modo de prueba'
                  : 'Test mode'}
            </span>
          </p>
          <p className="ayuda">
            {d.pago.cobro_activo
              ? es
                ? 'Los límites del plan gratis están encendidos.'
                : 'Free plan limits are on.'
              : es
                ? 'Los límites del plan gratis están apagados: todos tienen todo hasta encenderlos.'
                : 'Free plan limits are off: everyone has everything until you turn them on.'}
          </p>
        </section>
        <section>
          <h3>🔒 {es ? 'Seguridad' : 'Security'}</h3>
          <p>
            {luz(
              d.seguridad.turnstile,
              es ? 'Escudo anti-robots encendido' : 'Bot shield on',
              es ? 'Escudo anti-robots apagado' : 'Bot shield off',
            )}
          </p>
          <p className="admin-grande">
            {d.seguridad.intentos_24h}{' '}
            <small>{es ? 'intentos al panel en 24 h' : 'panel attempts in 24 h'}</small>
          </p>
          <p className="ayuda">
            {es ? 'Versión publicada' : 'Published version'}: <code>{d.version}</code>
          </p>
        </section>
      </div>
    </div>
  );
}
