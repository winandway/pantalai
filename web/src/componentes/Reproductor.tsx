// Reproductor como el de Loom (observado con REA): barra partida por capítulos, subtítulos,
// velocidad, modo teatro, imagen en imagen, pantalla completa y los mismos atajos de teclado.
// Las ediciones (recortes, cortes y elementos sobre el video) se aplican al reproducir: el archivo no se toca.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { archivoVideo, type Superposicion, type Video } from '../logica/api';
import { useIdioma } from '../logica/idioma';
import {
  aVtt,
  duracionVisible,
  formatoTiempo,
  siguienteVisible,
  tramosOcultos,
  type Tramo,
} from '../logica/tiempo';

export type ManejoReproductor = {
  ir: (segundo: number) => void;
  tiempo: () => number;
  reproducir: () => void;
  pausar: () => void;
  elemento: () => HTMLVideoElement | null;
};

const VELOCIDADES = [0.5, 0.8, 1, 1.2, 1.5, 1.75, 2, 2.5];

type Props = {
  video: Video;
  saltarOcultos?: boolean;
  alTiempo?: (s: number) => void;
  alTerminar?: () => void;
  alCta?: () => void;
  teatro?: boolean;
  cambiarTeatro?: () => void;
  inicio?: number;
  reacciones?: { emoji: string; segundo: number }[];
  encima?: ReactNode;
  atajos?: boolean;
};

export const Reproductor = forwardRef<ManejoReproductor, Props>(function Reproductor(
  {
    video,
    saltarOcultos = true,
    alTiempo,
    alTerminar,
    alCta,
    teatro,
    cambiarTeatro,
    inicio,
    reacciones = [],
    encima,
    atajos = true,
  },
  ref,
) {
  const { t } = useIdioma();
  const el = useRef<HTMLVideoElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [ahora, setAhora] = useState(inicio ?? 0);
  const [duracionReal, setDuracionReal] = useState(video.duracion);
  const [pausado, setPausado] = useState(true);
  const [mudo, setMudo] = useState(false);
  const [volumen, setVolumen] = useState(1);
  const [velocidad, setVelocidad] = useState(() => {
    const v = Number(localStorage.getItem('pantalai:velocidad'));
    return VELOCIDADES.includes(v) ? v : 1;
  });
  const [menuVelocidad, setMenuVelocidad] = useState(false);
  const [subtitulos, setSubtitulos] = useState(true);
  const [cargado, setCargado] = useState(0);
  const [flotantes, setFlotantes] = useState<{ id: number; emoji: string }[]>([]);
  const [interaccion, setInteraccion] = useState(true);

  const duracion = Number.isFinite(duracionReal) && duracionReal > 0 ? duracionReal : video.duracion;
  const ocultos = useMemo<Tramo[]>(
    () =>
      saltarOcultos ? tramosOcultos(duracion, video.recorte_inicio, video.recorte_fin, video.cortes) : [],
    [saltarOcultos, duracion, video.recorte_inicio, video.recorte_fin, video.cortes],
  );
  const vtt = useMemo(() => {
    if (!video.transcripcion.length) return null;
    return URL.createObjectURL(new Blob([aVtt(video.transcripcion)], { type: 'text/vtt' }));
  }, [video.transcripcion]);
  useEffect(() => () => void (vtt && URL.revokeObjectURL(vtt)), [vtt]);

  useImperativeHandle(ref, () => ({
    ir: (s) => {
      if (el.current) el.current.currentTime = Math.max(0, s);
      setAhora(s);
    },
    tiempo: () => el.current?.currentTime ?? 0,
    reproducir: () => void el.current?.play(),
    pausar: () => el.current?.pause(),
    elemento: () => el.current,
  }));

  useEffect(() => {
    if (el.current) el.current.playbackRate = velocidad;
    try {
      localStorage.setItem('pantalai:velocidad', String(velocidad));
    } catch {
      /* sin almacenamiento */
    }
  }, [velocidad]);

  useEffect(() => {
    const pista = el.current?.textTracks[0];
    if (pista) pista.mode = subtitulos ? 'showing' : 'hidden';
  }, [subtitulos, vtt]);

  // Reacciones que flotan sobre el video al pasar por su segundo.
  const ultimoSegundo = useRef(-1);
  useEffect(() => {
    const s = Math.floor(ahora);
    if (s === ultimoSegundo.current || pausado) return;
    ultimoSegundo.current = s;
    const nuevas = reacciones.filter((r) => Math.floor(r.segundo) === s).slice(0, 6);
    if (!nuevas.length) return;
    const lote = nuevas.map((r) => ({ id: Math.random(), emoji: r.emoji }));
    setFlotantes((f) => [...f, ...lote]);
    setTimeout(() => setFlotantes((f) => f.filter((x) => !lote.includes(x))), 2500);
  }, [ahora, reacciones, pausado]);

  // Los controles se esconden solos mientras se reproduce.
  useEffect(() => {
    if (pausado) return setInteraccion(true);
    const id = setTimeout(() => setInteraccion(false), 2500);
    return () => clearTimeout(id);
  }, [pausado, interaccion, ahora]);

  function alternar() {
    const v = el.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }
  function saltar(d: number) {
    const v = el.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + d), duracion);
  }
  function completa() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void caja.current?.requestFullscreen?.();
  }

  useEffect(() => {
    if (!atajos) return;
    const tecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName) ||
        destino.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const k = e.key.toLowerCase();
      const acciones: Record<string, () => void> = {
        k: alternar,
        ' ': alternar,
        j: () => saltar(-5),
        arrowleft: () => saltar(-5),
        l: () => saltar(5),
        arrowright: () => saltar(5),
        m: () => setMudo((m) => !m),
        a: () => setSubtitulos((s) => !s),
        s: () => setVelocidad((v) => VELOCIDADES[(VELOCIDADES.indexOf(v) + 1) % VELOCIDADES.length]!),
        t: () => cambiarTeatro?.(),
        f: completa,
        p: () =>
          void (document.pictureInPictureElement
            ? document.exitPictureInPicture()
            : el.current?.requestPictureInPicture()),
      };
      const accion = acciones[k];
      if (accion) {
        e.preventDefault();
        accion();
        setInteraccion(true);
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  });

  const capitulos = video.capitulos.length >= 2 ? video.capitulos : [];
  const tramosBarra = capitulos.length
    ? capitulos.map((c, i) => ({
        inicio: c.segundo,
        fin: capitulos[i + 1]?.segundo ?? duracion,
        titulo: c.titulo,
      }))
    : [{ inicio: 0, fin: duracion, titulo: '' }];
  const visibles = (s: Superposicion) => ahora >= s.inicio && ahora <= s.fin;
  const mostrarCta = video.cta_texto && video.cta_url;

  return (
    <div
      ref={caja}
      className={`reproductor ${teatro ? 'teatro' : ''} ${interaccion ? '' : 'sin-controles'}`}
      onMouseMove={() => setInteraccion(true)}
    >
      <div className="reproductor-pantalla" onClick={alternar}>
        <video
          ref={el}
          key={video.tiene_mp4 ? 'mp4' : 'webm'}
          preload="metadata"
          playsInline
          muted={mudo}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (Number.isFinite(v.duration)) setDuracionReal(v.duration);
            v.playbackRate = velocidad;
            const desde = inicio ?? (saltarOcultos ? video.recorte_inicio : 0);
            if (desde > 0) v.currentTime = desde;
          }}
          onDurationChange={(e) =>
            Number.isFinite(e.currentTarget.duration) && setDuracionReal(e.currentTarget.duration)
          }
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            const salto = siguienteVisible(v.currentTime, ocultos);
            if (salto !== null) {
              if (salto >= duracion) {
                v.pause();
                v.currentTime = Math.min(v.currentTime, duracion);
                alTerminar?.();
              } else v.currentTime = salto;
            }
            setAhora(v.currentTime);
            alTiempo?.(v.currentTime);
            if (v.buffered.length) setCargado(v.buffered.end(v.buffered.length - 1));
          }}
          onPlay={() => setPausado(false)}
          onPause={() => setPausado(true)}
          onEnded={() => alTerminar?.()}
          onVolumeChange={(e) => setVolumen(e.currentTarget.volume)}
        >
          {/* El MP4 primero: lo reproducen todos, también iPhone. El WebM original queda de respaldo. */}
          {video.tiene_mp4 && <source src={`${archivoVideo(video.id)}?formato=mp4`} type="video/mp4" />}
          <source src={`${archivoVideo(video.id)}?formato=webm`} type="video/webm" />
          {vtt && <track kind="captions" src={vtt} srcLang={video.idioma} label={t('subtitulos')} default />}
        </video>
        {video.superposiciones.filter(visibles).map((s, i) => (
          <div
            key={i}
            className={`superposicion sup-${s.tipo}`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.ancho}%`,
              height: s.tipo === 'texto' ? undefined : `${s.alto}%`,
            }}
          >
            {s.tipo === 'texto' && s.texto}
            {s.tipo === 'flecha' && (
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 20 H80" stroke="currentColor" strokeWidth="6" />
                <path d="M74 6 L98 20 L74 34 Z" fill="currentColor" />
              </svg>
            )}
          </div>
        ))}
        {encima}
        <div className="flotantes" aria-hidden="true">
          {flotantes.map((f) => (
            <span key={f.id}>{f.emoji}</span>
          ))}
        </div>
        {pausado && ahora < 0.5 && (
          <button type="button" className="reproducir-grande" aria-label={t('reproducir')}>
            ▶
          </button>
        )}
      </div>
      {mostrarCta && (
        <a
          className="cta"
          href={video.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => alCta?.()}
        >
          {video.cta_texto}
        </a>
      )}
      <div className="controles" onClick={(e) => e.stopPropagation()}>
        <div
          className="barra-tiempo"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duracion)}
          aria-valuenow={Math.round(ahora)}
          tabIndex={0}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const s = ((e.clientX - r.left) / r.width) * duracion;
            if (el.current) el.current.currentTime = s;
          }}
        >
          {tramosBarra.map((tr, i) => {
            const ancho = ((tr.fin - tr.inicio) / (duracion || 1)) * 100;
            const lleno = Math.min(1, Math.max(0, (ahora - tr.inicio) / (tr.fin - tr.inicio || 1)));
            const buf = Math.min(1, Math.max(0, (cargado - tr.inicio) / (tr.fin - tr.inicio || 1)));
            return (
              <div key={i} className="tramo" style={{ width: `${ancho}%` }} title={tr.titulo}>
                <div className="tramo-cargado" style={{ width: `${buf * 100}%` }} />
                <div className="tramo-lleno" style={{ width: `${lleno * 100}%` }} />
              </div>
            );
          })}
          {ocultos.map((o, i) => (
            <div
              key={`o${i}`}
              className="tramo-oculto"
              style={{
                left: `${(o.inicio / (duracion || 1)) * 100}%`,
                width: `${((Math.min(o.fin, duracion) - o.inicio) / (duracion || 1)) * 100}%`,
              }}
            />
          ))}
        </div>
        <div className="controles-fila">
          <button
            type="button"
            className="control"
            aria-label={pausado ? t('reproducir') : t('pausa')}
            onClick={alternar}
          >
            {pausado ? '▶' : '❚❚'}
          </button>
          <button
            type="button"
            className="control control-salto"
            aria-label={t('atras')}
            onClick={() => saltar(-5)}
          >
            ↺5
          </button>
          <button
            type="button"
            className="control control-salto"
            aria-label={t('adelante')}
            onClick={() => saltar(5)}
          >
            5↻
          </button>
          <button
            type="button"
            className="control"
            aria-label={t('silenciar')}
            onClick={() => setMudo((m) => !m)}
          >
            {mudo || volumen === 0 ? '🔇' : '🔊'}
          </button>
          <input
            className="volumen"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={mudo ? 0 : volumen}
            aria-label="Volume"
            onChange={(e) => {
              if (el.current) el.current.volume = Number(e.target.value);
              setMudo(Number(e.target.value) === 0);
            }}
          />
          <span className="tiempo">
            {formatoTiempo(saltarOcultos ? duracionVisible(ahora, ocultos) : ahora)} /{' '}
            {formatoTiempo(saltarOcultos ? duracionVisible(duracion, ocultos) : duracion)}
          </span>
          <span className="espacio" />
          {vtt && (
            <button
              type="button"
              className={`control texto ${subtitulos ? 'activo' : ''}`}
              aria-label={t('subtitulos')}
              aria-pressed={subtitulos}
              onClick={() => setSubtitulos((s) => !s)}
            >
              CC
            </button>
          )}
          <div className="velocidad">
            <button
              type="button"
              className="control texto"
              aria-label={t('velocidad')}
              onClick={() => setMenuVelocidad((m) => !m)}
            >
              {velocidad}×
            </button>
            {menuVelocidad && (
              <div className="velocidad-menu" role="menu">
                {VELOCIDADES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="menuitemradio"
                    aria-checked={v === velocidad}
                    className={v === velocidad ? 'activo' : ''}
                    onClick={() => {
                      setVelocidad(v);
                      setMenuVelocidad(false);
                    }}
                  >
                    {v}×
                  </button>
                ))}
              </div>
            )}
          </div>
          {cambiarTeatro && (
            <button
              type="button"
              className="control control-teatro"
              aria-label={t('teatro')}
              onClick={cambiarTeatro}
            >
              ▭
            </button>
          )}
          <button type="button" className="control" aria-label={t('pantallaCompleta')} onClick={completa}>
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
});
