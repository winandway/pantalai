// Superadmin: cuántas cuentas hay, qué plan tiene cada una y qué están grabando, para revisar el material antes
// del lanzamiento. Solo lo abren las cuentas Soporte de la lista del servidor; a cualquier otra le responde 404.
// Cada video ajeno que se mira queda anotado en el registro (abajo del resumen).
import { useCallback, useEffect, useState } from 'react';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { Confirmar } from '../componentes/Modal';
import { ErrorApi, pedir } from '../logica/api';
import { haceCuanto, useIdioma } from '../logica/idioma';
import { navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { formatoTiempo } from '../logica/tiempo';
import {
  FichaCliente,
  NOMBRE_PLAN,
  panel,
  PestanaAlmacen,
  PestanaPagos,
  PestanaSeguridad,
  PestanaSistema,
  tamano,
} from './AdminPartes';

type Resumen = {
  usuarios: number;
  usuarios_semana: number;
  videos: number;
  videos_semana: number;
  minutos: number;
  bytes: number;
  planes: Record<string, number>;
  registro: { accion: string; objetivo: string; momento: number; nombre: string | null }[];
};
type FilaUsuario = {
  id: string;
  nombre: string;
  correo: string;
  creado: number;
  plan: string;
  videos: number;
  segundos: number;
  ultimo: number | null;
};
type FilaVideo = {
  id: string;
  titulo: string;
  estado?: string;
  duracion: number;
  bytes: number;
  privacidad: string;
  tiene_miniatura: number;
  creado: number;
  usuario_id?: string;
  usuario?: string;
  correo?: string;
  revision?: string | null;
  /** Firma del día para ver el video aunque sea privado. */
  firma: string;
};

const ACCION: Record<string, { en: string; es: string }> = {
  ver_video: { en: 'watched', es: 'miró' },
  hacer_privado: { en: 'took offline', es: 'sacó del aire' },
  revisado: { en: 'reviewed OK', es: 'revisó (está bien)' },
  borrar_video: { en: 'deleted video', es: 'borró el video' },
  ver_ficha: { en: 'opened profile', es: 'abrió la ficha de' },
  suspender: { en: 'suspended', es: 'suspendió a' },
  reactivar: { en: 'reactivated', es: 'reactivó a' },
  bloquear_ip: { en: 'blocked IP', es: 'bloqueó la IP' },
  desbloquear_ip: { en: 'unblocked IP', es: 'desbloqueó la IP' },
  intento: { en: 'attempt without permission', es: 'intento sin permiso' },
};

export function Admin() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [negado, setNegado] = useState(false);
  const [vista, setVista] = useState<
    'usuarios' | 'videos' | 'moderacion' | 'pagos' | 'almacen' | 'sistema' | 'seguridad' | 'registro'
  >('usuarios');
  const [ficha, setFicha] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<FilaVideo | null>(null);
  const [q, setQ] = useState('');
  const [usuarios, setUsuarios] = useState<FilaUsuario[]>([]);
  const [videos, setVideos] = useState<FilaVideo[]>([]);
  const [deUsuario, setDeUsuario] = useState<FilaUsuario | null>(null);
  const [abierto, setAbierto] = useState<FilaVideo | null>(null);
  const [sacar, setSacar] = useState<FilaVideo | null>(null);

  useEffect(() => {
    // Sin sesión no se dice nada de esta página: se va a entrar como siempre.
    if (!cargando && !usuario) navegar('/login', true);
  }, [cargando, usuario]);

  const cargarResumen = useCallback(() => {
    pedir<Resumen>('/datos/admin/resumen', { headers: panel() })
      .then(setResumen)
      .catch((e) => {
        if (e instanceof ErrorApi && (e.codigo === 'ruta' || e.codigo === 'no_existe')) setNegado(true);
      });
  }, []);
  useEffect(() => {
    if (usuario) cargarResumen();
  }, [usuario, cargarResumen]);

  useEffect(() => {
    if (!resumen) return;
    const id = setTimeout(() => {
      const b = encodeURIComponent(q);
      if (vista === 'usuarios')
        void pedir<{ usuarios: FilaUsuario[] }>(`/datos/admin/usuarios?q=${b}`, { headers: panel() }).then(
          (r) => setUsuarios(r.usuarios),
        );
      else if (vista === 'videos' || vista === 'moderacion')
        void pedir<{ videos: FilaVideo[] }>(
          `/datos/admin/videos?q=${b}&usuario=${encodeURIComponent(deUsuario?.id ?? '')}${vista === 'moderacion' ? '&sin_revisar=1' : ''}`,
          { headers: panel() },
        ).then((r) => setVideos(r.videos));
    }, 250);
    return () => clearTimeout(id);
  }, [resumen, vista, q, deUsuario]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(null);
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [abierto]);

  function mirar(v: FilaVideo) {
    setAbierto(v);
    void pedir(`/datos/admin/videos/${v.id}/visto`, { method: 'POST', headers: panel() }).then(cargarResumen);
  }

  if (negado)
    return (
      <section className="vacio pagina-angosta">
        <h1>404</h1>
        <p>{t('noEncontrado')}</p>
      </section>
    );
  if (!resumen) return <div className="cargando" aria-busy="true" />;

  const menu = [
    ['usuarios', '👥', t('adminUsuarios'), resumen.usuarios],
    ['videos', '🎬', t('adminVideos'), resumen.videos],
    ['moderacion', '🧐', t('adminModeracion'), null],
    ['pagos', '💳', t('adminPagos'), null],
    ['almacen', '💾', t('adminAlmacen'), null],
    ['sistema', '⚙️', t('adminSistema'), null],
    ['seguridad', '🔒', t('adminSeguridad'), null],
    ['registro', '📜', t('adminRegistro'), null],
  ] as const;

  return (
    <div className="admin-marco">
      <aside className="admin-lateral" aria-label={t('superadmin')}>
        <p className="admin-lateral-titulo">🛡️ {t('superadmin')}</p>
        <nav role="tablist" aria-orientation="vertical">
          {menu.map(([v, icono, nombre, n]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={vista === v}
              className={vista === v ? 'activo' : ''}
              onClick={() => (setVista(v), v === 'usuarios' && setDeUsuario(null))}
            >
              <span aria-hidden="true">{icono}</span>
              {nombre}
              {n !== null && <b>{n}</b>}
            </button>
          ))}
        </nav>
      </aside>
      <div className="admin">
        <header className="admin-cabeza">
          <h1>🛡️ {t('superadmin')}</h1>
          <p className="ayuda">{t('superadminAyuda')}</p>
        </header>

        <div className="admin-cifras">
          <div>
            <span>{t('adminUsuarios')}</span>
            <strong>{resumen.usuarios}</strong>
            <small>
              +{resumen.usuarios_semana} {t('adminSemana')}
            </small>
          </div>
          <div>
            <span>{t('adminVideos')}</span>
            <strong>{resumen.videos}</strong>
            <small>
              +{resumen.videos_semana} {t('adminSemana')}
            </small>
          </div>
          <div>
            <span>{t('adminMinutos')}</span>
            <strong>{resumen.minutos}</strong>
            <small>{tamano(resumen.bytes)}</small>
          </div>
          <div>
            <span>{t('adminPlanes')}</span>
            <ul className="admin-planes">
              {Object.entries(resumen.planes).map(([p, n]) => (
                <li key={p}>
                  {NOMBRE_PLAN[p] ?? p}: <b>{n}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-barra">
          {(vista === 'usuarios' || vista === 'videos' || vista === 'moderacion') && (
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={vista === 'usuarios' ? t('adminBuscarUsuarios') : t('adminBuscarVideos')}
              aria-label={t('buscar')}
            />
          )}
        </div>
        {vista === 'moderacion' && <p className="ayuda">{t('adminModeracionAyuda')}</p>}
        {deUsuario && vista === 'videos' && (
          <p className="admin-filtro">
            {t('adminVideosDe')} <b>{deUsuario.nombre}</b> ({deUsuario.correo}){' '}
            <button type="button" className="enlace" onClick={() => setDeUsuario(null)}>
              {t('adminVerTodos')}
            </button>
          </p>
        )}

        {vista === 'pagos' && <PestanaPagos abrirFicha={setFicha} />}
        {vista === 'seguridad' && <PestanaSeguridad />}
        {vista === 'almacen' && <PestanaAlmacen abrirFicha={setFicha} />}
        {vista === 'sistema' && <PestanaSistema />}
        {(vista === 'usuarios' || vista === 'videos' || vista === 'moderacion') && (
          <div className="admin-tabla-marco">
            {vista === 'usuarios' ? (
              <table className="admin-tabla">
                <thead>
                  <tr>
                    <th>{t('adminNombre')}</th>
                    <th>{t('adminCorreo')}</th>
                    <th>{t('adminPlan')}</th>
                    <th>{t('adminVideos')}</th>
                    <th>{t('adminMinutos')}</th>
                    <th>{t('adminAlta')}</th>
                    <th>{t('adminUltimoVideo')}</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <button type="button" className="enlace" onClick={() => setFicha(u.id)}>
                          {u.nombre}
                        </button>
                      </td>
                      <td>{u.correo}</td>
                      <td>
                        <span className={`etiqueta-plan plan-${u.plan}`}>
                          {NOMBRE_PLAN[u.plan] ?? u.plan}
                        </span>
                      </td>
                      <td>
                        {u.videos > 0 ? (
                          <button
                            type="button"
                            className="enlace"
                            onClick={() => (setDeUsuario(u), setVista('videos'), setQ(''))}
                          >
                            {u.videos}
                          </button>
                        ) : (
                          0
                        )}
                      </td>
                      <td>{Math.round(u.segundos / 60)}</td>
                      <td>{haceCuanto(u.creado, idioma)}</td>
                      <td>{u.ultimo ? haceCuanto(u.ultimo, idioma) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="admin-videos">
                {videos.map((v) => (
                  <article key={v.id} className="admin-video">
                    <button
                      type="button"
                      className="admin-miniatura"
                      onClick={() => mirar(v)}
                      aria-label={t('adminMirar')}
                    >
                      {v.tiene_miniatura ? (
                        <img src={`/media/${v.id}/miniatura?panel=${v.firma}`} alt="" loading="lazy" />
                      ) : (
                        <span>▶</span>
                      )}
                      <span className="admin-duracion">{formatoTiempo(v.duracion)}</span>
                    </button>
                    <div className="admin-video-datos">
                      <strong title={v.titulo}>{v.titulo}</strong>
                      <span>
                        {v.usuario} · {v.correo}
                      </span>
                      <span>
                        {haceCuanto(v.creado, idioma)} · {tamano(v.bytes)} ·{' '}
                        {v.privacidad === 'privado' ? `🔒 ${t('privado')}` : `🔗 ${t('adminConEnlace')}`}
                        {v.estado !== 'listo' ? ` · ${v.estado}` : ''}
                      </span>
                    </div>
                    <MenuPuntos
                      opciones={[
                        { etiqueta: t('adminMirar'), accion: () => mirar(v) },
                        ...(v.revision !== 'ok'
                          ? [
                              {
                                etiqueta: t('adminMarcarRevisado'),
                                accion: () =>
                                  void pedir(`/datos/admin/videos/${v.id}/revisado`, {
                                    method: 'POST',
                                    headers: panel(),
                                  }).then(() => {
                                    setVideos((l) =>
                                      vista === 'moderacion'
                                        ? l.filter((x) => x.id !== v.id)
                                        : l.map((x) => (x.id === v.id ? { ...x, revision: 'ok' } : x)),
                                    );
                                    cargarResumen();
                                  }),
                              },
                            ]
                          : []),
                        ...(v.usuario_id
                          ? [{ etiqueta: t('adminVerFicha'), accion: () => setFicha(v.usuario_id!) }]
                          : []),
                        ...(v.privacidad !== 'privado'
                          ? [{ etiqueta: t('adminSacarDelAire'), accion: () => setSacar(v), peligro: true }]
                          : []),
                        {
                          etiqueta: t('adminBorrarVideo'),
                          accion: () => setBorrar(v),
                          peligro: true,
                          separador: true,
                        },
                      ]}
                    />
                  </article>
                ))}
                {videos.length === 0 && <p className="vacio">{t('sinResultados')}</p>}
              </div>
            )}
          </div>
        )}

        {abierto && (
          <div className="admin-visor" role="dialog" aria-modal="true" aria-label={abierto.titulo}>
            <div className="admin-visor-caja">
              <div className="admin-visor-cabeza">
                <strong>{abierto.titulo}</strong>
                <button type="button" className="boton secundario chico" onClick={() => setAbierto(null)}>
                  {t('cerrar')}
                </button>
              </div>
              <video
                src={`/media/${abierto.id}/video?formato=webm&panel=${abierto.firma}`}
                controls
                autoPlay
                playsInline
              />
              <p className="ayuda">
                {abierto.usuario ? `${abierto.usuario} · ${abierto.correo} · ` : ''}
                {t('adminQuedaAnotado')}
              </p>
            </div>
          </div>
        )}

        {ficha && <FichaCliente id={ficha} cerrar={() => setFicha(null)} mirar={(v) => mirar(v)} />}

        {borrar && (
          <Confirmar
            texto={t('adminConfirmarBorrar').replace('{titulo}', borrar.titulo)}
            etiquetaSi={t('adminBorrarVideo')}
            etiquetaNo={t('cancelar')}
            no={() => setBorrar(null)}
            si={() => {
              const v = borrar;
              setBorrar(null);
              void pedir(`/datos/admin/videos/${v.id}`, { method: 'DELETE', headers: panel() }).then(() => {
                setVideos((l) => l.filter((x) => x.id !== v.id));
                cargarResumen();
              });
            }}
          />
        )}

        {sacar && (
          <Confirmar
            texto={t('adminConfirmarSacar').replace('{titulo}', sacar.titulo)}
            etiquetaSi={t('adminSacarDelAire')}
            etiquetaNo={t('cancelar')}
            no={() => setSacar(null)}
            si={() => {
              const v = sacar;
              setSacar(null);
              void pedir(`/datos/admin/videos/${v.id}/privado`, { method: 'POST', headers: panel() }).then(
                () => {
                  setVideos((l) => l.map((x) => (x.id === v.id ? { ...x, privacidad: 'privado' } : x)));
                  cargarResumen();
                },
              );
            }}
          />
        )}

        {vista === 'registro' && (
          <section className="admin-registro">
            <h2>{t('adminRegistro')}</h2>
            {resumen.registro.length === 0 ? (
              <p className="ayuda">{t('adminRegistroVacio')}</p>
            ) : (
              <ul>
                {resumen.registro.map((r, i) => (
                  <li key={i}>
                    {haceCuanto(r.momento, idioma)} · {r.nombre} · {ACCION[r.accion]?.[idioma] ?? r.accion}{' '}
                    {r.objetivo}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
