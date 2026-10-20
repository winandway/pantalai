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
  estado: string;
  duracion: number;
  bytes: number;
  privacidad: string;
  tiene_miniatura: number;
  creado: number;
  usuario_id: string;
  usuario: string;
  correo: string;
};

const NOMBRE_PLAN: Record<string, string> = {
  starter: 'Starter',
  business: 'Business',
  business_ia: 'Business + AI',
  enterprise: 'Enterprise',
};

export function tamano(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

export function Admin() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [negado, setNegado] = useState(false);
  const [vista, setVista] = useState<'usuarios' | 'videos'>('usuarios');
  const [q, setQ] = useState('');
  const [usuarios, setUsuarios] = useState<FilaUsuario[]>([]);
  const [videos, setVideos] = useState<FilaVideo[]>([]);
  const [deUsuario, setDeUsuario] = useState<FilaUsuario | null>(null);
  const [abierto, setAbierto] = useState<FilaVideo | null>(null);
  const [sacar, setSacar] = useState<FilaVideo | null>(null);

  useEffect(() => {
    if (!cargando && !usuario) navegar('/login?volver=/admin', true);
  }, [cargando, usuario]);

  const cargarResumen = useCallback(() => {
    pedir<Resumen>('/datos/admin/resumen')
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
        void pedir<{ usuarios: FilaUsuario[] }>(`/datos/admin/usuarios?q=${b}`).then((r) =>
          setUsuarios(r.usuarios),
        );
      else
        void pedir<{ videos: FilaVideo[] }>(
          `/datos/admin/videos?q=${b}&usuario=${encodeURIComponent(deUsuario?.id ?? '')}`,
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
    void pedir(`/datos/admin/videos/${v.id}/visto`, { method: 'POST' }).then(cargarResumen);
  }

  if (negado)
    return (
      <section className="vacio pagina-angosta">
        <h1>404</h1>
        <p>{t('noEncontrado')}</p>
      </section>
    );
  if (!resumen) return <div className="cargando" aria-busy="true" />;

  return (
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
        <div className="admin-pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'usuarios'}
            className={vista === 'usuarios' ? 'activo' : ''}
            onClick={() => (setVista('usuarios'), setDeUsuario(null))}
          >
            {t('adminUsuarios')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'videos'}
            className={vista === 'videos' ? 'activo' : ''}
            onClick={() => setVista('videos')}
          >
            {t('adminVideos')}
          </button>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={vista === 'usuarios' ? t('adminBuscarUsuarios') : t('adminBuscarVideos')}
          aria-label={t('buscar')}
        />
      </div>
      {deUsuario && vista === 'videos' && (
        <p className="admin-filtro">
          {t('adminVideosDe')} <b>{deUsuario.nombre}</b> ({deUsuario.correo}){' '}
          <button type="button" className="enlace" onClick={() => setDeUsuario(null)}>
            {t('adminVerTodos')}
          </button>
        </p>
      )}

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
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td>
                    <span className={`etiqueta-plan plan-${u.plan}`}>{NOMBRE_PLAN[u.plan] ?? u.plan}</span>
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
                    <img src={`/media/${v.id}/miniatura`} alt="" loading="lazy" />
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
                    ...(v.privacidad !== 'privado'
                      ? [{ etiqueta: t('adminSacarDelAire'), accion: () => setSacar(v), peligro: true }]
                      : []),
                  ]}
                />
              </article>
            ))}
            {videos.length === 0 && <p className="vacio">{t('sinResultados')}</p>}
          </div>
        )}
      </div>

      {abierto && (
        <div className="admin-visor" role="dialog" aria-modal="true" aria-label={abierto.titulo}>
          <div className="admin-visor-caja">
            <div className="admin-visor-cabeza">
              <strong>{abierto.titulo}</strong>
              <button type="button" className="boton secundario chico" onClick={() => setAbierto(null)}>
                {t('cerrar')}
              </button>
            </div>
            <video src={`/media/${abierto.id}/video?formato=webm`} controls autoPlay playsInline />
            <p className="ayuda">
              {abierto.usuario} · {abierto.correo} · {t('adminQuedaAnotado')}
            </p>
          </div>
        </div>
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
            void pedir(`/datos/admin/videos/${v.id}/privado`, { method: 'POST' }).then(() => {
              setVideos((l) => l.map((x) => (x.id === v.id ? { ...x, privacidad: 'privado' } : x)));
              cargarResumen();
            });
          }}
        />
      )}

      <section className="admin-registro">
        <h2>{t('adminRegistro')}</h2>
        {resumen.registro.length === 0 ? (
          <p className="ayuda">{t('adminRegistroVacio')}</p>
        ) : (
          <ul>
            {resumen.registro.map((r, i) => (
              <li key={i}>
                {haceCuanto(r.momento, idioma)} · {r.nombre} ·{' '}
                {t(r.accion === 'ver_video' ? 'adminMiro' : 'adminSaco')} {r.objetivo}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
