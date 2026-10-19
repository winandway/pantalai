import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAviso } from '../componentes/Aviso';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { Confirmar, Modal } from '../componentes/Modal';
import {
  ErrorApi,
  archivoVideo,
  enlaceVideo,
  miniaturaVideo,
  pedir,
  type Carpeta,
  type VideoLista,
} from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { haceCuanto, textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { formatoTiempo } from '../logica/tiempo';
import { Respaldos } from './Grabar';

type Vista = { tipo: 'todos' } | { tipo: 'carpeta'; id: string } | { tipo: 'archivo' };

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function Biblioteca() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const avisar = useAviso();
  const [vista, setVista] = useState<Vista>({ tipo: 'todos' });
  const [q, setQ] = useState('');
  const [videos, setVideos] = useState<VideoLista[] | null>(null);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [resumen, setResumen] = useState<{ videos: number; vistas: number; segundos_vistos: number } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [gastoIA, setGastoIA] = useState<{ usd: number; tope: number } | null>(null);
  const [renombrando, setRenombrando] = useState<VideoLista | null>(null);
  const [moviendo, setMoviendo] = useState<VideoLista | null>(null);
  const [borrando, setBorrando] = useState<VideoLista | null>(null);
  const [nuevaCarpeta, setNuevaCarpeta] = useState(false);
  const [borrandoCarpeta, setBorrandoCarpeta] = useState<Carpeta | null>(null);

  useEffect(() => {
    if (!cargando && !usuario) navegar('/login?volver=/library', true);
  }, [cargando, usuario]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (vista.tipo === 'carpeta') p.set('carpeta', vista.id);
    if (vista.tipo === 'archivo') p.set('archivo', '1');
    try {
      const [v, c, r] = await Promise.all([
        pedir<{ videos: VideoLista[] }>(`/datos/videos?${p}`),
        pedir<{ carpetas: Carpeta[] }>('/datos/carpetas'),
        pedir<{ resumen: { videos: number; vistas: number; segundos_vistos: number } }>('/datos/resumen'),
      ]);
      setVideos(v.videos);
      setCarpetas(c.carpetas);
      setResumen(r.resumen);
      pedir<{ oido: boolean; cerebro: boolean; usd_mes: number; tope_usd_mes: number }>('/datos/ia')
        .then((x) => setGastoIA(x.oido || x.cerebro ? { usd: x.usd_mes, tope: x.tope_usd_mes } : null))
        .catch(() => setGastoIA(null));
      setError('');
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }, [usuario, q, vista, t]);

  useEffect(() => {
    const espera = setTimeout(() => void cargar(), q ? 250 : 0);
    return () => clearTimeout(espera);
  }, [cargar, q]);

  async function cambiarVideo(v: VideoLista, datos: Record<string, unknown>, aviso = t('guardado')) {
    try {
      await pedir(`/datos/videos/${v.id}`, { method: 'PATCH', json: datos });
      avisar(aviso);
      void cargar();
    } catch (e) {
      avisar(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }

  if (!usuario) return null;
  const titulo =
    vista.tipo === 'todos'
      ? t('todos')
      : vista.tipo === 'archivo'
        ? t('archivo')
        : (carpetas.find((c) => c.id === vista.id)?.nombre ?? '');

  return (
    <div className="biblioteca">
      <aside className="biblioteca-lateral">
        <a className="boton ancho" href="/record" onClick={alClicEnlace}>
          <span className="punto-rojo" aria-hidden="true" /> {t('nuevaGrabacion')}
        </a>
        <nav>
          <button
            type="button"
            className={vista.tipo === 'todos' ? 'activo' : ''}
            onClick={() => setVista({ tipo: 'todos' })}
          >
            {t('todos')}
          </button>
          <p className="lateral-titulo">
            {t('carpetas')}
            <button
              type="button"
              className="boton-icono"
              aria-label={t('nuevaCarpeta')}
              onClick={() => setNuevaCarpeta(true)}
            >
              +
            </button>
          </p>
          {carpetas.map((c) => (
            <div
              key={c.id}
              className={`lateral-carpeta ${vista.tipo === 'carpeta' && vista.id === c.id ? 'activo' : ''}`}
            >
              <button type="button" onClick={() => setVista({ tipo: 'carpeta', id: c.id })}>
                📁 {c.nombre} <span className="contador">{c.videos}</span>
              </button>
              <MenuPuntos
                opciones={[
                  {
                    etiqueta: t('renombrar'),
                    accion: () => {
                      const nombre = prompt(t('nombreCarpeta'), c.nombre)?.trim();
                      if (nombre)
                        void pedir(`/datos/carpetas/${c.id}`, { method: 'PATCH', json: { nombre } }).then(
                          () => cargar(),
                        );
                    },
                  },
                  {
                    etiqueta: t('eliminar'),
                    peligro: true,
                    separador: true,
                    accion: () => setBorrandoCarpeta(c),
                  },
                ]}
              />
            </div>
          ))}
          <button
            type="button"
            className={vista.tipo === 'archivo' ? 'activo' : ''}
            onClick={() => setVista({ tipo: 'archivo' })}
          >
            🗄 {t('archivo')}
          </button>
        </nav>
      </aside>

      <section className="biblioteca-contenido">
        {resumen && (
          <div className="resumen-fila">
            <div className="dato">
              <strong>{resumen.videos}</strong> {t('resumenVideos')}
            </div>
            <div className="dato">
              <strong>{resumen.vistas}</strong> {t('resumenVistas')}
            </div>
            <div className="dato">
              <strong>{Math.round(resumen.segundos_vistos / 60)}</strong> {t('resumenMinutos')}
            </div>
            {gastoIA && (
              <div className="dato" title={t('iaMes')}>
                ✨ {t('iaMes')}: <strong>${gastoIA.usd.toFixed(2)}</strong> / ${gastoIA.tope}
                <div className="barra-exito">
                  <div style={{ width: `${Math.min(100, (gastoIA.usd / gastoIA.tope) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="biblioteca-barra">
          <h1>{titulo}</h1>
          <input
            type="search"
            className="buscador"
            placeholder={t('buscar')}
            aria-label={t('buscar')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Respaldos />
        {error && <p className="error">{error}</p>}
        {videos && videos.length === 0 && <p className="vacio">{q ? t('sinResultados') : t('sinVideos')}</p>}
        <div className="rejilla">
          {videos?.map((v) => (
            <article key={v.id} className="tarjeta-video">
              <a href={`/v/${v.id}`} onClick={alClicEnlace} className="tarjeta-video-imagen">
                {v.tiene_miniatura ? (
                  <img src={miniaturaVideo(v.id)} alt="" loading="lazy" />
                ) : (
                  <div className="sin-miniatura" />
                )}
                {v.estado === 'listo' ? (
                  <span className="duracion">{formatoTiempo(v.duracion)}</span>
                ) : (
                  <span className="duracion">{t('subiendo')}…</span>
                )}
                {v.privacidad === 'privado' && <span className="etiqueta-privado">{t('privado')}</span>}
              </a>
              <div className="tarjeta-video-pie">
                <div>
                  <a href={`/v/${v.id}`} onClick={alClicEnlace} className="tarjeta-video-titulo">
                    {v.titulo}
                  </a>
                  <p className="ayuda">
                    {haceCuanto(v.creado, idioma)} · <span title={t('vistas')}>👁 {v.vistas}</span> ·{' '}
                    <span title={t('comentarios')}>💬 {v.comentarios}</span>
                  </p>
                </div>
                <MenuPuntos
                  opciones={[
                    {
                      etiqueta: t('copiarEnlace'),
                      accion: () =>
                        void copiar(enlaceVideo(v.id)).then((ok) => ok && avisar(t('enlaceCopiado'))),
                    },
                    {
                      etiqueta: t('renombrar'),
                      accion: () => setRenombrando(v),
                    },
                    { etiqueta: t('moverA'), accion: () => setMoviendo(v) },
                    {
                      etiqueta: v.archivado ? t('desarchivar') : t('archivar'),
                      accion: () => void cambiarVideo(v, { archivado: !v.archivado }),
                    },
                    {
                      etiqueta: t('duplicar'),
                      accion: () =>
                        void pedir(`/datos/videos/${v.id}/duplicar`, { method: 'POST' }).then(() => cargar()),
                    },
                    {
                      etiqueta: t('descargar'),
                      accion: () => (location.href = `${archivoVideo(v.id)}?descargar=1`),
                    },
                    { etiqueta: t('eliminar'), peligro: true, separador: true, accion: () => setBorrando(v) },
                  ]}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {renombrando && (
        <Renombrar
          video={renombrando}
          cerrar={() => setRenombrando(null)}
          guardar={(titulo) => {
            void cambiarVideo(renombrando, { titulo });
            setRenombrando(null);
          }}
        />
      )}
      {moviendo && (
        <Modal titulo={t('moverA')} cerrar={() => setMoviendo(null)} ancho={380}>
          <div className="lista-opciones">
            <button
              type="button"
              onClick={() => {
                void cambiarVideo(moviendo, { carpeta_id: null });
                setMoviendo(null);
              }}
            >
              {t('sinCarpeta')}
            </button>
            {carpetas.map((c) => (
              <button
                key={c.id}
                type="button"
                className={moviendo.carpeta_id === c.id ? 'activo' : ''}
                onClick={() => {
                  void cambiarVideo(moviendo, { carpeta_id: c.id });
                  setMoviendo(null);
                }}
              >
                📁 {c.nombre}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {nuevaCarpeta && (
        <NuevaCarpeta
          cuenta={usuario.id}
          cerrar={() => setNuevaCarpeta(false)}
          creada={() => {
            setNuevaCarpeta(false);
            void cargar();
          }}
        />
      )}
      {borrando && (
        <Confirmar
          texto={t('confirmarEliminar')}
          etiquetaSi={t('eliminar')}
          etiquetaNo={t('cancelar')}
          no={() => setBorrando(null)}
          si={() => {
            const v = borrando;
            setBorrando(null);
            void pedir(`/datos/videos/${v.id}`, { method: 'DELETE' }).then(() => cargar());
          }}
        />
      )}
      {borrandoCarpeta && (
        <Confirmar
          texto={t('confirmarEliminarCarpeta')}
          etiquetaSi={t('eliminar')}
          etiquetaNo={t('cancelar')}
          no={() => setBorrandoCarpeta(null)}
          si={() => {
            const c = borrandoCarpeta;
            setBorrandoCarpeta(null);
            if (vista.tipo === 'carpeta' && vista.id === c.id) setVista({ tipo: 'todos' });
            void pedir(`/datos/carpetas/${c.id}`, { method: 'DELETE' }).then(() => cargar());
          }}
        />
      )}
    </div>
  );
}

function Renombrar({
  video,
  cerrar,
  guardar,
}: {
  video: VideoLista;
  cerrar: () => void;
  guardar: (t: string) => void;
}) {
  const { t } = useIdioma();
  const [titulo, setTitulo] = useState(video.titulo);
  return (
    <Modal titulo={t('renombrar')} cerrar={cerrar} ancho={460}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (titulo.trim()) guardar(titulo.trim());
        }}
      >
        <div className="campo">
          <label htmlFor="renombrar">{t('titulo')}</label>
          <input
            id="renombrar"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={200}
            autoFocus
          />
        </div>
        <div className="fila-botones">
          <button type="button" className="boton secundario" onClick={cerrar}>
            {t('cancelar')}
          </button>
          <button className="boton">{t('guardar')}</button>
        </div>
      </form>
    </Modal>
  );
}

function NuevaCarpeta({
  cuenta,
  cerrar,
  creada,
}: {
  cuenta: string;
  cerrar: () => void;
  creada: () => void;
}) {
  const { t } = useIdioma();
  const b = useBorrador(llaveBorrador('carpeta', cuenta), { nombre: '' });
  const [error, setError] = useState('');
  async function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      await pedir('/datos/carpetas', { method: 'POST', json: { nombre: b.valor.nombre } });
      b.limpiar();
      creada();
    } catch (err) {
      setError(textoError(t, err instanceof ErrorApi ? err.codigo : 'servidor'));
    }
  }
  return (
    <Modal
      titulo={t('nuevaCarpeta')}
      cerrar={() => {
        b.limpiar();
        cerrar();
      }}
      ancho={420}
    >
      <form onSubmit={enviar}>
        {b.recuperado && (
          <p className="recuperado">
            {t('recuperado')}{' '}
            <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
              {t('empezarDeNuevo')}
            </button>
          </p>
        )}
        <div className="campo">
          <label htmlFor="carpeta">{t('nombreCarpeta')}</label>
          <input
            id="carpeta"
            value={b.valor.nombre}
            onChange={(e) => b.cambiar('nombre', e.target.value)}
            maxLength={80}
            required
            autoFocus
          />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="fila-botones">
          <button className="boton">{t('guardar')}</button>
        </div>
      </form>
    </Modal>
  );
}
