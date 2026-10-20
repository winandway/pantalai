// Página del video, calcada de la estructura de Loom observada con REA:
// título y autor arriba, reproductor, resumen y capítulos debajo, y el panel lateral
// con Actividad y Transcripción (más Estadísticas para el dueño).
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAviso } from '../componentes/Aviso';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { Confirmar, Modal } from '../componentes/Modal';
import { Reproductor, type ManejoReproductor } from '../componentes/Reproductor';
import {
  ErrorApi,
  archivoVideo,
  enlaceVideo,
  pedir,
  visitante,
  type Comentario,
  type Estadisticas,
  type Video,
} from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { haceCuanto, textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { buscarEnTranscripcion, formatoTiempo, segmentoActual, textoPlano } from '../logica/tiempo';
import { copiar } from './Biblioteca';
import { AvisoIA, Generar, Tareas } from '../componentes/IA';
import { PreparadorMp4 } from '../componentes/Mp4';
import { DOMINIO, origenPublico } from '../logica/sitio';
import { BotonDescargar } from '../componentes/Descargar';
import type { EstadoIA } from '../logica/ia';

const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '👏', '🔥', '🙌'];
type Pestana = 'actividad' | 'transcripcion' | 'estadisticas';

export function PaginaVideo({ id, embebido = false }: { id: string; embebido?: boolean }) {
  const { t, idioma } = useIdioma();
  const { usuario } = useSesion();
  const avisar = useAviso();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState('');
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [reacciones, setReacciones] = useState<{ emoji: string; segundo: number }[]>([]);
  const [pestana, setPestana] = useState<Pestana>('transcripcion');
  // En el celular el video va primero y la transcripción se abre solo si la persona la pide.
  const [panel, setPanel] = useState(() => typeof window === 'undefined' || window.innerWidth > 900);
  const [teatro, setTeatro] = useState(false);
  const [ahora, setAhora] = useState(0);
  const [compartir, setCompartir] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [ia, setIa] = useState<EstadoIA | null>(null);
  const [generando, setGenerando] = useState(false);
  const reproductor = useRef<ManejoReproductor>(null);
  const inicio = useMemo(() => {
    const v = Number(new URLSearchParams(location.search).get('t'));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  }, []);

  const cargar = useCallback(async () => {
    try {
      const r = await pedir<{ video: Video }>(`/datos/videos/${id}`);
      setVideo(r.video);
      document.title = `${r.video.titulo} · Pantalay`;
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }, [id, t]);
  const cargarActividad = useCallback(async () => {
    try {
      const r = await pedir<{ comentarios: Comentario[]; reacciones: { emoji: string; segundo: number }[] }>(
        `/datos/videos/${id}/actividad`,
      );
      setComentarios(r.comentarios);
      setReacciones(r.reacciones);
    } catch {
      /* la actividad no es imprescindible para ver el video */
    }
  }, [id]);
  useEffect(() => {
    void cargar();
    void cargarActividad();
  }, [cargar, cargarActividad]);

  // Vistas: se cuenta lo más lejos que llegó, cada 10 segundos y al salir.
  const visto = useRef({ max: 0, completado: false, cta: false, enviado: 0 });
  const enviarVista = useCallback(() => {
    if (!video || video.es_dueno) return;
    const v = visto.current;
    if (v.max < 1 || v.max === v.enviado) return;
    v.enviado = v.max;
    const cuerpo = JSON.stringify({
      visitante: visitante(),
      segundos: v.max,
      completado: v.completado,
      cta: v.cta,
    });
    void fetch(`/datos/videos/${video.id}/vista`, {
      method: 'POST',
      body: cuerpo,
      keepalive: true,
      headers: { 'content-type': 'application/json', 'x-pantalai': '1' },
    }).catch(() => undefined);
  }, [video]);
  useEffect(() => {
    const i = setInterval(enviarVista, 10_000);
    const salir = () => document.visibilityState === 'hidden' && enviarVista();
    document.addEventListener('visibilitychange', salir);
    return () => {
      clearInterval(i);
      document.removeEventListener('visibilitychange', salir);
      enviarVista();
    };
  }, [enviarVista]);

  if (error) {
    return (
      <section className="vacio pagina-angosta">
        <p>{error}</p>
        {!usuario && (
          <a className="boton" href={`/login?volver=/v/${id}`} onClick={alClicEnlace}>
            {t('entrar')}
          </a>
        )}
      </section>
    );
  }
  if (!video) return <div className="cargando" aria-busy="true" />;

  const alTiempo = (s: number) => {
    setAhora(s);
    visto.current.max = Math.max(visto.current.max, s);
    if (video.duracion && s >= video.duracion * 0.9) visto.current.completado = true;
  };

  async function reaccionar(emoji: string) {
    const segundo = reproductor.current?.tiempo() ?? 0;
    setReacciones((r) => [...r, { emoji, segundo }]);
    await pedir(`/datos/videos/${id}/reacciones`, { method: 'POST', json: { emoji, segundo } }).catch(
      () => undefined,
    );
  }

  const reproductorEl = (
    <Reproductor
      ref={reproductor}
      video={video}
      alTiempo={alTiempo}
      alTerminar={() => {
        visto.current.completado = true;
        enviarVista();
      }}
      alCta={() => {
        visto.current.cta = true;
        visto.current.enviado = -1;
        enviarVista();
      }}
      teatro={teatro}
      cambiarTeatro={embebido ? undefined : () => setTeatro((x) => !x)}
      inicio={inicio}
      reacciones={reacciones}
    />
  );

  if (embebido) {
    return (
      <div className="embebido">
        {reproductorEl}
        <a className="marca-embebido" href={enlaceVideo(video.id)} target="_blank" rel="noopener noreferrer">
          {video.marca ? `${video.titulo} · ${t('hechoCon')}` : video.titulo}
        </a>
      </div>
    );
  }

  return (
    <div className={`pagina-video ${panel ? '' : 'sin-panel'} ${teatro ? 'con-teatro' : ''}`}>
      <div className="video-principal">
        <header className="video-cabecera">
          <div>
            <TituloEditable video={video} cambiar={(v) => setVideo(v)} />
            <p className="ayuda">
              {video.autor} · {haceCuanto(video.creado, idioma)}
              {video.privacidad === 'privado' && (
                <span className="etiqueta-privado en-linea">{t('privado')}</span>
              )}
            </p>
          </div>
          <div className="video-acciones">
            <button
              type="button"
              className="boton-icono"
              aria-label={t('copiarEnlace')}
              title={t('copiarEnlace')}
              onClick={() =>
                void copiar(enlaceVideo(video.id)).then((ok) => ok && avisar(t('enlaceCopiado')))
              }
            >
              🔗
            </button>
            {video.es_dueno && (
              <a className="boton secundario" href={`/v/${video.id}/edit`} onClick={alClicEnlace}>
                ✂ {t('editar')}
              </a>
            )}
            {video.es_dueno && ia?.cerebro && video.transcripcion.length > 0 && (
              <button type="button" className="boton secundario" onClick={() => setGenerando(true)}>
                ✨ {t('generar')}
              </button>
            )}
            {video.es_dueno && (
              <button type="button" className="boton" onClick={() => setCompartir(true)}>
                {t('compartir')}
              </button>
            )}
            {(video.permitir_descarga || video.es_dueno) && (
              <BotonDescargar id={video.id} titulo={video.titulo} tieneMp4={Boolean(video.tiene_mp4)} />
            )}
            {video.es_dueno && (
              <MenuPuntos
                opciones={[
                  {
                    etiqueta: t('descargarOriginal'),
                    accion: () => (location.href = `${archivoVideo(video.id)}?descargar=1&formato=webm`),
                  },
                  {
                    etiqueta: video.archivado ? t('desarchivar') : t('archivar'),
                    accion: () =>
                      void pedir<{ video: Video }>(`/datos/videos/${video.id}`, {
                        method: 'PATCH',
                        json: { archivado: !video.archivado },
                      }).then((r) => setVideo(r.video)),
                  },
                  {
                    etiqueta: t('eliminar'),
                    peligro: true,
                    separador: true,
                    accion: () => setBorrando(true),
                  },
                ]}
              />
            )}
          </div>
        </header>

        {video.es_dueno && !video.tiene_mp4 && (
          <PreparadorMp4 id={video.id} alTerminar={() => void cargar()} />
        )}
        {video.es_dueno && (
          <AvisoIA
            id={video.id}
            idioma={video.idioma}
            alTerminar={(r, recien) => {
              setIa(r);
              if (recien) void cargar();
            }}
          />
        )}

        {reproductorEl}
        {video.marca && (
          <a className="hecho-con" href={`${DOMINIO}/?ref=video`} target="_blank" rel="noopener noreferrer">
            ▶ {t('hechoCon')}
          </a>
        )}

        <div className="reacciones" role="group" aria-label="Reactions">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => void reaccionar(e)} aria-label={e}>
              {e}
            </button>
          ))}
          <span className="ayuda atajos">{t('atajos')}</span>
        </div>

        {(video.descripcion || video.capitulos.length > 0 || (video.es_dueno && !!ia?.tareas.length)) && (
          <section className="video-resumen">
            {video.descripcion && (
              <>
                <h2>{t('resumen')}</h2>
                <p className="descripcion">{video.descripcion}</p>
              </>
            )}
            {video.capitulos.length > 0 && (
              <>
                <h2>{t('capitulos')}</h2>
                <ol className="capitulos">
                  {video.capitulos.map((c) => (
                    <li key={c.segundo}>
                      <button
                        type="button"
                        className="enlace"
                        onClick={() => reproductor.current?.ir(c.segundo)}
                      >
                        {formatoTiempo(c.segundo)}
                      </button>{' '}
                      {c.titulo}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {video.es_dueno && ia && <Tareas tareas={ia.tareas} />}
          </section>
        )}
        {generando && (
          <Generar
            id={video.id}
            enlace={enlaceVideo(video.id)}
            ir={(s) => reproductor.current?.ir(s)}
            cerrar={() => setGenerando(false)}
          />
        )}
        {!usuario && (
          <p className="hecho-con">
            {t('grabadoCon')} ·{' '}
            <a href="/signup" onClick={alClicEnlace}>
              {t('hazElTuyo')}
            </a>
          </p>
        )}
      </div>

      <aside className="video-panel" aria-hidden={!panel}>
        <div className="pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'actividad'}
            onClick={() => setPestana('actividad')}
          >
            {t('actividad')}{' '}
            {comentarios.length > 0 && <span className="contador">{comentarios.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'transcripcion'}
            onClick={() => setPestana('transcripcion')}
          >
            {t('transcripcion')}
          </button>
          {video.es_dueno && (
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'estadisticas'}
              onClick={() => setPestana('estadisticas')}
            >
              {t('estadisticas')}
            </button>
          )}
          <button
            type="button"
            className="boton-icono plegar"
            aria-label={t('ocultarPanel')}
            onClick={() => setPanel(false)}
          >
            »
          </button>
        </div>
        {pestana === 'transcripcion' && (
          <PanelTranscripcion video={video} ahora={ahora} ir={(s) => reproductor.current?.ir(s)} />
        )}
        {pestana === 'actividad' && (
          <PanelActividad
            video={video}
            comentarios={comentarios}
            reacciones={reacciones}
            tiempo={() => reproductor.current?.tiempo() ?? 0}
            ir={(s) => reproductor.current?.ir(s)}
            recargar={cargarActividad}
          />
        )}
        {pestana === 'estadisticas' && video.es_dueno && <PanelEstadisticas id={video.id} />}
      </aside>
      {!panel && (
        <button type="button" className="mostrar-panel boton secundario" onClick={() => setPanel(true)}>
          « {t('mostrarPanel')}
        </button>
      )}

      {compartir && (
        <Compartir
          video={video}
          ahora={ahora}
          cerrar={() => setCompartir(false)}
          cambiar={(v) => setVideo(v)}
        />
      )}
      {borrando && (
        <Confirmar
          texto={t('confirmarEliminar')}
          etiquetaSi={t('eliminar')}
          etiquetaNo={t('cancelar')}
          no={() => setBorrando(false)}
          si={() =>
            void pedir(`/datos/videos/${video.id}`, { method: 'DELETE' }).then(() => navegar('/library'))
          }
        />
      )}
    </div>
  );
}

function TituloEditable({ video, cambiar }: { video: Video; cambiar: (v: Video) => void }) {
  const { t } = useIdioma();
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(video.titulo);
  if (!video.es_dueno) return <h1 className="video-titulo">{video.titulo}</h1>;
  if (!editando)
    return (
      <h1 className="video-titulo editable" title={t('renombrar')}>
        <button type="button" onClick={() => (setTitulo(video.titulo), setEditando(true))}>
          {video.titulo}{' '}
          <span className="lapiz" aria-hidden="true">
            ✎
          </span>
        </button>
      </h1>
    );
  const guardar = async () => {
    setEditando(false);
    if (!titulo.trim() || titulo.trim() === video.titulo) return;
    const r = await pedir<{ video: Video }>(`/datos/videos/${video.id}`, {
      method: 'PATCH',
      json: { titulo: titulo.trim() },
    }).catch(() => null);
    if (r) cambiar(r.video);
  };
  return (
    <input
      className="video-titulo-campo"
      value={titulo}
      maxLength={200}
      autoFocus
      aria-label={t('titulo')}
      onChange={(e) => setTitulo(e.target.value)}
      onBlur={() => void guardar()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void guardar();
        if (e.key === 'Escape') setEditando(false);
      }}
    />
  );
}

function PanelTranscripcion({ video, ahora, ir }: { video: Video; ahora: number; ir: (s: number) => void }) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [q, setQ] = useState('');
  const actual = segmentoActual(video.transcripcion, ahora);
  const coincidencias = new Set(buscarEnTranscripcion(video.transcripcion, q));
  const lista = useRef<HTMLDivElement>(null);
  // CANDADO C-VIDEO-A-LA-VISTA: la transcripción sigue la frase que suena moviendo SOLO su propia lista,
  // nunca la página (antes, en el celular, la página saltaba a la transcripción y el video se perdía de vista).
  useEffect(() => {
    const caja = lista.current;
    const fila = caja?.querySelector<HTMLElement>('.actual');
    if (!caja || !fila || caja.scrollHeight <= caja.clientHeight) return;
    caja.scrollTo({ top: fila.offsetTop - caja.offsetTop - caja.clientHeight / 3, behavior: 'smooth' });
  }, [actual]);
  if (!video.transcripcion.length) return <p className="vacio">{t('sinTranscripcion')}</p>;
  return (
    <div className="panel-transcripcion">
      <div className="panel-herramientas">
        <button
          type="button"
          className="boton secundario chico"
          onClick={() =>
            void copiar(textoPlano(video.transcripcion)).then((ok) => ok && avisar(t('copiado')))
          }
        >
          {t('copiar')}
        </button>
        <input
          type="search"
          className="buscador chico"
          placeholder={t('buscar').split(' ')[0]}
          aria-label={t('buscar')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="transcripcion-lista" ref={lista}>
        {video.transcripcion.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`frase ${i === actual ? 'actual' : ''} ${q && !coincidencias.has(i) ? 'atenuada' : ''}`}
            onClick={() => ir(s.inicio)}
          >
            <span className="minuto">{formatoTiempo(s.inicio)}</span>
            <span>{s.texto}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelActividad({
  video,
  comentarios,
  reacciones,
  tiempo,
  ir,
  recargar,
}: {
  video: Video;
  comentarios: Comentario[];
  reacciones: { emoji: string; segundo: number }[];
  tiempo: () => number;
  ir: (s: number) => void;
  recargar: () => Promise<void>;
}) {
  const { t, idioma } = useIdioma();
  const { usuario } = useSesion();
  const b = useBorrador(llaveBorrador(`comentario-${video.id}`, usuario?.id), {
    texto: '',
    nombre: '',
    conMinuto: true,
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const conteo = reacciones.reduce<Record<string, number>>(
    (a, r) => ((a[r.emoji] = (a[r.emoji] ?? 0) + 1), a),
    {},
  );

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await pedir(`/datos/videos/${video.id}/comentarios`, {
        method: 'POST',
        json: {
          texto: b.valor.texto,
          nombre: usuario ? undefined : b.valor.nombre,
          segundo: b.valor.conMinuto ? Math.floor(tiempo()) : null,
        },
      });
      b.setValor((v) => ({ ...v, texto: '' }));
      b.limpiar();
      await recargar();
    } catch (err) {
      // Lo escrito se queda en pantalla: nunca se limpia antes de la confirmación.
      setError(textoError(t, err instanceof ErrorApi ? err.codigo : 'servidor'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="panel-actividad">
      {Object.keys(conteo).length > 0 && (
        <p className="conteo-reacciones">
          {Object.entries(conteo).map(([e, n]) => (
            <span key={e}>
              {e} {n}
            </span>
          ))}
        </p>
      )}
      <div className="comentarios">
        {comentarios.length === 0 && <p className="vacio chico">{t('sinComentarios')}</p>}
        {comentarios.map((c) => (
          <article key={c.id} className="comentario">
            <header>
              <strong>{c.nombre}</strong> <span className="ayuda">{haceCuanto(c.creado, idioma)}</span>
              {(video.es_dueno || (usuario && c.usuario_id === usuario.id)) && (
                <MenuPuntos
                  opciones={[
                    {
                      etiqueta: t('eliminar'),
                      peligro: true,
                      accion: () =>
                        void pedir(`/datos/videos/${video.id}/comentarios/${c.id}`, {
                          method: 'DELETE',
                        }).then(recargar),
                    },
                  ]}
                />
              )}
            </header>
            <p>
              {c.segundo !== null && (
                <button type="button" className="minuto enlace" onClick={() => ir(c.segundo!)}>
                  {formatoTiempo(c.segundo)}
                </button>
              )}{' '}
              {c.texto}
            </p>
          </article>
        ))}
      </div>
      {video.permitir_comentarios || video.es_dueno ? (
        <form className="comentar" onSubmit={enviar}>
          {!usuario && (
            <input
              value={b.valor.nombre}
              onChange={(e) => b.cambiar('nombre', e.target.value)}
              placeholder={t('tuNombre')}
              aria-label={t('tuNombre')}
              required
              maxLength={80}
            />
          )}
          <textarea
            value={b.valor.texto}
            onChange={(e) => b.cambiar('texto', e.target.value)}
            placeholder={t('escribeComentario')}
            aria-label={t('escribeComentario')}
            rows={3}
            required
            maxLength={2000}
          />
          <div className="fila-botones">
            <label className="interruptor chico">
              <input
                type="checkbox"
                checked={b.valor.conMinuto}
                onChange={(e) => b.cambiar('conMinuto', e.target.checked)}
              />
              {t('enEsteMomento')} {formatoTiempo(tiempo())}
            </label>
            <button className="boton chico" disabled={enviando}>
              {t('comentar')}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <p className="ayuda">{t('comentariosCerrados')}</p>
      )}
    </div>
  );
}

function PanelEstadisticas({ id }: { id: string }) {
  const { t } = useIdioma();
  const [e, setE] = useState<Estadisticas | null>(null);
  useEffect(() => {
    void pedir<{ estadisticas: Estadisticas }>(`/datos/videos/${id}/estadisticas`).then((r) =>
      setE(r.estadisticas),
    );
  }, [id]);
  if (!e) return <div className="cargando" aria-busy="true" />;
  if (!e.vistas) return <p className="vacio chico">{t('sinVistas')}</p>;
  const maximo = Math.max(...e.por_dia.map((d) => d.vistas), 1);
  return (
    <div className="panel-estadisticas">
      <div className="datos-rejilla">
        <div className="dato">
          <strong>{e.vistas}</strong>
          <span>{t('vistasTotales')}</span>
        </div>
        <div className="dato">
          <strong>{formatoTiempo(e.promedio_segundos)}</strong>
          <span>{t('promedioVisto')}</span>
        </div>
        <div className="dato">
          <strong>{e.completado_pct}%</strong>
          <span>{t('completado')}</span>
          <div className="barra-exito">
            <div style={{ width: `${e.completado_pct}%` }} />
          </div>
        </div>
        <div className="dato">
          <strong>
            {e.cta_clics} <small>({e.cta_pct}%)</small>
          </strong>
          <span>{t('clicsCta')}</span>
        </div>
      </div>
      <h3>{t('vistasPorDia')}</h3>
      <div className="grafica-dias">
        {[...e.por_dia].reverse().map((d) => (
          <div key={d.dia} className="grafica-fila">
            <span>{d.dia.slice(5)}</span>
            <div className="grafica-barra">
              <div style={{ width: `${(d.vistas / maximo) * 100}%` }} />
            </div>
            <span>{d.vistas}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Compartir({
  video,
  ahora,
  cerrar,
  cambiar,
}: {
  video: Video;
  ahora: number;
  cerrar: () => void;
  cambiar: (v: Video) => void;
}) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [desdeAhora, setDesdeAhora] = useState(false);
  const enlace = `${enlaceVideo(video.id)}${desdeAhora && ahora > 1 ? `?t=${Math.floor(ahora)}` : ''}`;
  const codigo = `<div style="position:relative;padding-bottom:${video.ancho && video.alto ? ((video.alto / video.ancho) * 100).toFixed(2) : '56.25'}%;height:0"><iframe src="${origenPublico()}/embed/${video.id}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  async function ajuste(datos: Partial<Video>) {
    try {
      const r = await pedir<{ video: Video }>(`/datos/videos/${video.id}`, { method: 'PATCH', json: datos });
      cambiar(r.video);
      avisar(t('guardado'));
    } catch (e) {
      avisar(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }
  const texto = encodeURIComponent(`${t('mensajeCompartir')} ${video.titulo}`);
  return (
    <Modal titulo={t('compartirTitulo')} cerrar={cerrar} ancho={560}>
      <div className="compartir">
        <div className="campo">
          <label htmlFor="quien">{t('quienVe')}</label>
          <select
            id="quien"
            value={video.privacidad}
            onChange={(e) => void ajuste({ privacidad: e.target.value as Video['privacidad'] })}
          >
            <option value="enlace">🌐 {t('cualquieraEnlace')}</option>
            <option value="privado">🔒 {t('soloYo')}</option>
          </select>
        </div>
        <div className="copiar-fila">
          <input
            readOnly
            value={enlace}
            aria-label={t('copiarEnlace')}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className="boton"
            onClick={() => void copiar(enlace).then((ok) => ok && avisar(t('enlaceCopiado')))}
          >
            {t('copiarEnlace')}
          </button>
        </div>
        <label className="interruptor chico">
          <input type="checkbox" checked={desdeAhora} onChange={(e) => setDesdeAhora(e.target.checked)} />
          {t('desdeMinuto')} ({formatoTiempo(ahora)})
        </label>
        <div className="fila-botones izquierda">
          <a
            className="boton secundario chico"
            href={`mailto:?subject=${encodeURIComponent(video.titulo)}&body=${texto}%0A${encodeURIComponent(enlace)}`}
          >
            ✉ {t('porCorreo')}
          </a>
          <a
            className="boton secundario chico"
            href={`https://wa.me/?text=${texto}%20${encodeURIComponent(enlace)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          <a
            className="boton secundario chico"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(enlace)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            className="boton secundario chico"
            href={`https://x.com/intent/post?text=${texto}&url=${encodeURIComponent(enlace)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            X
          </a>
        </div>
        <h3>{t('insertar')}</h3>
        <textarea
          readOnly
          value={codigo}
          rows={3}
          aria-label={t('insertar')}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="boton secundario chico"
          onClick={() => void copiar(codigo).then((ok) => ok && avisar(t('copiado')))}
        >
          {t('copiarCodigo')}
        </button>
        <label className="interruptor">
          <input
            type="checkbox"
            checked={video.permitir_descarga}
            onChange={(e) => void ajuste({ permitir_descarga: e.target.checked })}
          />
          {t('permitirDescarga')}
        </label>
        <label className="interruptor">
          <input
            type="checkbox"
            checked={video.permitir_comentarios}
            onChange={(e) => void ajuste({ permitir_comentarios: e.target.checked })}
          />
          {t('permitirComentarios')}
        </label>
      </div>
    </Modal>
  );
}
