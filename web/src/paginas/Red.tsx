// Red de videos de Pantalay (9 nov 2026, pedido de Richard): «Videos» con la estructura estándar de una plataforma de
// video (cuadrícula de miniaturas; al abrir uno, el reproductor grande con título, autor y me gusta, y a la derecha
// más videos), con la marca y los colores de Pantalay. Candado C-RED-VIDEOS.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAviso } from '../componentes/Aviso';
import { Modal } from '../componentes/Modal';
import { Reproductor } from '../componentes/Reproductor';
import { ErrorApi, pedir, visitante, type Video } from '../logica/api';
import { haceCuanto, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { DOMINIO } from '../logica/sitio';
import { TEXTOS_RED } from '../logica/textosRed';
import { formatoTiempo } from '../logica/tiempo';
import { copiar } from './Biblioteca';

export type TarjetaRed = {
  id: string;
  titulo: string;
  autor: string;
  autor_id: string;
  duracion: number;
  vertical: boolean;
  miniatura: string | null;
  me_gusta: number;
  vistas: number;
  publicado_en: number;
};

/** Una miniatura con su título, autor, vistas y hace cuánto. */
export function Tarjeta({ v, chica = false }: { v: TarjetaRed; chica?: boolean }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  return (
    <a className={`red-tarjeta${chica ? ' chica' : ''}`} href={`/videos/${v.id}`} onClick={alClicEnlace}>
      <span className="red-miniatura">
        {v.miniatura ? (
          <img src={v.miniatura} alt="" loading="lazy" className={v.vertical ? 'vertical' : ''} />
        ) : (
          <span className="red-sin-miniatura" aria-hidden="true">
            ▶
          </span>
        )}
        <span className="red-duracion">{formatoTiempo(v.duracion)}</span>
      </span>
      <span className="red-datos">
        <span className="red-titulo">{v.titulo}</span>
        <span className="red-autor">{v.autor}</span>
        <span className="red-meta">
          {tx.vistas(v.vistas)} · {haceCuanto(v.publicado_en, idioma)}
        </span>
      </span>
    </a>
  );
}

/** Espacio vacío (la red se ve llena desde el principio): invita a grabar y publicar. */
export function TarjetaVacia({ chica = false }: { chica?: boolean }) {
  const { idioma } = useIdioma();
  const { usuario } = useSesion();
  const tx = TEXTOS_RED[idioma];
  return (
    <a
      className={`red-tarjeta red-vacia${chica ? ' chica' : ''}`}
      href={usuario ? '/record' : '/signup'}
      onClick={alClicEnlace}
    >
      <span className="red-miniatura">
        <span className="red-sin-miniatura" aria-hidden="true">
          ▶
        </span>
      </span>
      <span className="red-datos">
        <span className="red-titulo">{tx.tuVideoAqui}</span>
        <span className="red-autor">{tx.publicaElTuyo}</span>
      </span>
    </a>
  );
}

/** Un Short (video vertical): miniatura 9:16 con su título y vistas. Si no hay video, un espacio vacío. */
export function TarjetaShort({ v }: { v: TarjetaRed | null }) {
  const { idioma } = useIdioma();
  const { usuario } = useSesion();
  const tx = TEXTOS_RED[idioma];
  if (!v)
    return (
      <a className="red-short red-vacia" href={usuario ? '/studio' : '/signup'} onClick={alClicEnlace}>
        <span className="red-short-imagen">
          <span className="red-sin-miniatura" aria-hidden="true">
            ▶
          </span>
        </span>
        <span className="red-titulo">{tx.tuShortAqui}</span>
      </a>
    );
  return (
    <a className="red-short" href={`/videos/${v.id}`} onClick={alClicEnlace}>
      <span className="red-short-imagen">
        {v.miniatura ? (
          <img src={v.miniatura} alt="" loading="lazy" />
        ) : (
          <span className="red-sin-miniatura" aria-hidden="true">
            ▶
          </span>
        )}
      </span>
      <span className="red-titulo">{v.titulo}</span>
      <span className="red-meta">{tx.vistas(v.vistas)}</span>
    </a>
  );
}

/** El estante de Shorts (videos verticales), entre las filas de videos normales. */
function EstanteShorts({ shorts }: { shorts: TarjetaRed[] }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  return (
    <section className="red-shorts" aria-label={tx.shorts}>
      <h2>
        <span className="red-shorts-logo" aria-hidden="true">
          ▮
        </span>{' '}
        {tx.shorts}
      </h2>
      <div className="red-shorts-fila">
        {shorts.map((v) => (
          <TarjetaShort key={v.id} v={v} />
        ))}
        {relleno(shorts.length, 8).map((i) => (
          <TarjetaShort key={`vacio-${i}`} v={null} />
        ))}
      </div>
    </section>
  );
}

/** Rellena con espacios vacíos hasta «total» (cuando todavía hay pocos videos). */
function relleno(n: number, total: number): number[] {
  return Array.from({ length: Math.max(0, total - n) }, (_, i) => i);
}

/** El banner de la red de videos de Pantalay (neón, con la marca). */
export function BannerRed({ chico = false }: { chico?: boolean }) {
  const { idioma, enlace } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  return (
    <a className={`red-banner${chico ? ' chico' : ''}`} href={enlace('/videos')} onClick={alClicEnlace}>
      <span className="red-banner-logo" aria-hidden="true">
        ▶
      </span>
      <span className="red-banner-texto">
        <b>{tx.bannerTitulo}</b>
        {!chico && <span>{tx.bannerLema}</span>}
      </span>
    </a>
  );
}

/** «Videos»: la cuadrícula de todos los videos publicados, lo más nuevo primero. */
export function PaginaRed() {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const { usuario } = useSesion();
  const [videos, setVideos] = useState<TarjetaRed[] | null>(null);
  const [shorts, setShorts] = useState<TarjetaRed[]>([]);
  const [hayMas, setHayMas] = useState(false);

  useEffect(() => {
    void pedir<{ videos: TarjetaRed[] }>('/datos/red?limite=12&forma=vertical')
      .then((r) => setShorts(r.videos))
      .catch(() => undefined);
  }, []);

  const cargar = useCallback(async (antes?: number) => {
    const r = await pedir<{ videos: TarjetaRed[] }>(
      `/datos/red?limite=24&forma=horizontal${antes ? `&antes=${antes}` : ''}`,
    );
    setVideos((x) => (antes && x ? [...x, ...r.videos] : r.videos));
    setHayMas(r.videos.length === 24);
  }, []);

  useEffect(() => {
    document.title = `${tx.tituloRed} · Pantalay`;
    void cargar().catch(() => setVideos([]));
  }, [cargar, tx.tituloRed]);

  return (
    <div className="red">
      <BannerRed />
      <BuscadorRed />
      <header className="red-cabeza">
        <h1>{tx.tituloRed}</h1>
        <p>{tx.introRed}</p>
      </header>
      {videos === null ? (
        <div className="red-cuadricula" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="red-tarjeta cargando" />
          ))}
        </div>
      ) : (
        <>
          {videos.length === 0 && (
            <p className="vacio">
              {tx.vacio}{' '}
              <a href={usuario ? '/record' : '/signup'} onClick={alClicEnlace}>
                {tx.grabar}
              </a>
            </p>
          )}
          {/* Una fila de videos, enseguida el estante de Shorts y después el resto (estudio REA, FICHA-YOUTUBE). */}
          <div className="red-cuadricula">
            {[...videos, ...relleno(videos.length, 30).map(() => null)]
              .slice(0, 5)
              .map((v, i) => (v ? <Tarjeta key={v.id} v={v} /> : <TarjetaVacia key={`vacio-a-${i}`} />))}
          </div>
          <EstanteShorts shorts={shorts} />
          <div className="red-cuadricula">
            {[...videos, ...relleno(videos.length, 30).map(() => null)]
              .slice(5)
              .map((v, i) => (v ? <Tarjeta key={v.id} v={v} /> : <TarjetaVacia key={`vacio-b-${i}`} />))}
          </div>
          {hayMas && (
            <button
              type="button"
              className="boton secundario red-mas"
              onClick={() => void cargar(videos[videos.length - 1]!.publicado_en)}
            >
              {tx.mas}
            </button>
          )}
        </>
      )}
    </div>
  );
}

type VideoRed = TarjetaRed & { descripcion: string; me_gusta_mio: boolean; es_dueno: boolean };

/** Ver un video de la red: reproductor grande, título, autor, me gusta y descripción; a la derecha, más videos. */
export function VerVideoRed({ id }: { id: string }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const { usuario } = useSesion();
  const avisar = useAviso();
  const [red, setRed] = useState<VideoRed | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [otros, setOtros] = useState<TarjetaRed[]>([]);
  const [shorts, setShorts] = useState<TarjetaRed[]>([]);
  useEffect(() => {
    void pedir<{ videos: TarjetaRed[] }>(`/datos/red?limite=6&forma=vertical&excepto=${id}`)
      .then((r) => setShorts(r.videos))
      .catch(() => undefined);
  }, [id]);
  const [noExiste, setNoExiste] = useState(false);
  const [denunciando, setDenunciando] = useState(false);
  const vista = useRef(false);

  useEffect(() => {
    let vivo = true;
    setRed(null);
    setVideo(null);
    setNoExiste(false);
    vista.current = false;
    void Promise.all([
      pedir<{ video: VideoRed }>(`/datos/red/${id}`),
      pedir<{ video: Video }>(`/datos/videos/${id}`),
      pedir<{ videos: TarjetaRed[] }>(`/datos/red?limite=20&excepto=${id}`),
    ])
      .then(([r, v, o]) => {
        if (!vivo) return;
        setRed(r.video);
        setVideo(v.video);
        setOtros(o.videos);
        document.title = `${r.video.titulo} · Pantalay`;
      })
      .catch(() => vivo && setNoExiste(true));
    window.scrollTo(0, 0);
    return () => {
      vivo = false;
    };
  }, [id]);

  // Cuenta la vista a los 3 segundos (una vez), igual que la página del video.
  const alTiempo = useCallback(
    (s: number) => {
      if (vista.current || s < 3 || !red || red.es_dueno) return;
      vista.current = true;
      void fetch(`/datos/videos/${id}/vista`, {
        method: 'POST',
        body: JSON.stringify({
          visitante: visitante(),
          segundos: Math.round(s),
          completado: false,
          cta: false,
        }),
        keepalive: true,
        headers: { 'content-type': 'application/json', 'x-pantalai': '1' },
      }).catch(() => undefined);
    },
    [id, red],
  );

  async function meGusta() {
    if (!usuario) return navegar(`/login?volver=${encodeURIComponent(`/videos/${id}`)}`);
    try {
      const r = await pedir<{ me_gusta: number; me_gusta_mio: boolean }>(`/datos/red/${id}/me-gusta`, {
        method: 'POST',
      });
      setRed((x) => (x ? { ...x, ...r } : x));
    } catch (e) {
      console.error('red: me gusta', e);
    }
  }

  if (noExiste)
    return (
      <section className="vacio pagina-angosta">
        <p>{tx.noExiste}</p>
        <a className="boton" href="/videos" onClick={alClicEnlace}>
          {tx.videos}
        </a>
      </section>
    );

  return (
    <div className="red-ver">
      <div className="red-ver-banner">
        <BannerRed chico />
        <BuscadorRed />
      </div>
      <div className="red-ver-principal">
        <div className={`red-ver-reproductor${red?.vertical ? ' vertical' : ''}`}>
          {video ? (
            <Reproductor video={video} alTiempo={alTiempo} atajos />
          ) : (
            <span className="red-cargando" />
          )}
        </div>
        {red && (
          <>
            <h1 className="red-ver-titulo">{red.titulo}</h1>
            <div className="red-ver-barra">
              <div className="red-ver-autor">
                <span className="avatar" aria-hidden="true">
                  {red.autor.charAt(0).toUpperCase()}
                </span>
                <span>
                  <a href={`/channel/${red.autor_id}`} onClick={alClicEnlace}>
                    <b>{red.autor}</b>
                  </a>
                  <small>
                    {tx.vistas(red.vistas)} · {haceCuanto(red.publicado_en, idioma)}
                  </small>
                </span>
              </div>
              <div className="red-ver-acciones">
                <button
                  type="button"
                  className={`boton secundario red-gusta${red.me_gusta_mio ? ' activo' : ''}`}
                  aria-pressed={red.me_gusta_mio}
                  title={usuario ? undefined : tx.entrarParaGusta}
                  onClick={() => void meGusta()}
                >
                  👍 {red.me_gusta_mio ? tx.gusta : tx.meGusta} · {red.me_gusta}
                </button>
                <button
                  type="button"
                  className="boton secundario"
                  onClick={() =>
                    void copiar(`${DOMINIO}/videos/${id}`).then((ok) => ok && avisar(tx.copiado))
                  }
                >
                  🔗 {tx.compartir}
                </button>
                <button type="button" className="boton secundario" onClick={() => setDenunciando(true)}>
                  ⚑ {tx.denunciar}
                </button>
              </div>
            </div>
            {red.descripcion && <p className="red-ver-descripcion">{red.descripcion}</p>}
          </>
        )}
      </div>
      <aside className="red-ver-lado" aria-label={tx.relacionados}>
        <h2>{tx.relacionados}</h2>
        {otros.slice(0, 2).map((v) => (
          <Tarjeta key={v.id} v={v} chica />
        ))}
        {/* Shorts entre los relacionados, arriba (no al fondo). */}
        <div className="red-ver-shorts">
          <h3>{tx.shorts}</h3>
          <div>
            {shorts.slice(0, 3).map((v) => (
              <TarjetaShort key={v.id} v={v} />
            ))}
            {relleno(Math.min(3, shorts.length), 3).map((i) => (
              <TarjetaShort key={`vacio-${i}`} v={null} />
            ))}
          </div>
        </div>
        {otros.slice(2).map((v) => (
          <Tarjeta key={v.id} v={v} chica />
        ))}
        {relleno(otros.length, 10).map((i) => (
          <TarjetaVacia key={`vacio-${i}`} chica />
        ))}
        <a className="enlace" href="/videos" onClick={alClicEnlace}>
          {tx.verTodos} →
        </a>
      </aside>
      {denunciando && <Denunciar id={id} cerrar={() => setDenunciando(false)} />}
    </div>
  );
}

function Denunciar({ id, cerrar }: { id: string; cerrar: () => void }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const avisar = useAviso();
  const [motivo, setMotivo] = useState<keyof typeof tx.motivos>('derechos');
  const [detalle, setDetalle] = useState('');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  async function enviar() {
    setError('');
    try {
      await pedir(`/datos/red/${id}/denunciar`, { method: 'POST', json: { motivo, detalle, correo } });
      avisar(tx.gracias);
      cerrar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.codigo : 'servidor');
    }
  }
  return (
    <Modal titulo={tx.denunciarTitulo} cerrar={cerrar}>
      <fieldset className="red-motivos">
        {(Object.keys(tx.motivos) as (keyof typeof tx.motivos)[]).map((m) => (
          <label key={m}>
            <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} />{' '}
            {tx.motivos[m]}
          </label>
        ))}
      </fieldset>
      <div className="campo">
        <label htmlFor="den-detalle">{tx.detalle}</label>
        <textarea
          id="den-detalle"
          value={detalle}
          maxLength={2000}
          onChange={(e) => setDetalle(e.target.value)}
        />
      </div>
      <div className="campo">
        <label htmlFor="den-correo">{tx.correo}</label>
        <input
          id="den-correo"
          type="email"
          placeholder="correo@ejemplo.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="fila-botones">
        <button type="button" className="boton secundario" onClick={cerrar}>
          {tx.cancelar}
        </button>
        <button type="button" className="boton" onClick={() => void enviar()}>
          {tx.enviar}
        </button>
      </div>
    </Modal>
  );
}

/** Carrusel de la portada: los videos publicados pasando solos; al tocar uno se abre en la red. */
export function CarruselRed({ sinTitulo = false }: { sinTitulo?: boolean }) {
  const { idioma, enlace } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const [videos, setVideos] = useState<TarjetaRed[]>([]);
  useEffect(() => {
    void pedir<{ videos: TarjetaRed[] }>('/datos/red?limite=20')
      .then((r) => setVideos(r.videos))
      .catch(() => undefined);
  }, []);
  // Con pocos videos, la cinta se completa con espacios vacíos («Tu video aquí») en vez de repetir el mismo.
  const cinta: (TarjetaRed | null)[] = [...videos, ...relleno(videos.length, 12).map(() => null)];
  return (
    <section className="red-carrusel" aria-label={tx.comunidad}>
      <div className="red-carrusel-cabeza">
        {sinTitulo ? <span /> : <h2>{tx.comunidad}</h2>}
        <a className="enlace" href={enlace('/videos')} onClick={alClicEnlace}>
          {tx.verTodos} →
        </a>
      </div>
      <div className="red-carrusel-ventana">
        <div className="red-carrusel-cinta">
          {[...cinta, ...cinta].map((v, i) => (
            <span key={`${v?.id ?? 'vacio'}-${i}`} aria-hidden={i >= cinta.length}>
              {v ? <Tarjeta v={v} chica /> : <TarjetaVacia chica />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** El perfil de un creador: banner, su inicial, su nombre, sus números y sus videos publicados. */
export function PaginaCanal({ id }: { id: string }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const [canal, setCanal] = useState<{ nombre: string; videos: number; me_gusta: number } | null>(null);
  const [videos, setVideos] = useState<TarjetaRed[]>([]);
  const [noExiste, setNoExiste] = useState(false);
  useEffect(() => {
    void Promise.all([
      pedir<{ canal: { nombre: string; videos: number; me_gusta: number } }>(`/datos/red-canal/${id}`),
      pedir<{ videos: TarjetaRed[] }>(`/datos/red?limite=48&autor=${id}`),
    ])
      .then(([c, v]) => {
        setCanal(c.canal);
        setVideos(v.videos);
        document.title = `${c.canal.nombre} · Pantalay`;
      })
      .catch(() => setNoExiste(true));
  }, [id]);
  if (noExiste)
    return (
      <section className="vacio pagina-angosta">
        <p>{tx.canalNoExiste}</p>
        <a className="boton" href="/videos" onClick={alClicEnlace}>
          {tx.videos}
        </a>
      </section>
    );
  return (
    <div className="red">
      <BuscadorRed />
      <div className="red-canal-portada" aria-hidden="true" />
      {canal && (
        <header className="red-canal-cabeza">
          <span className="avatar red-canal-avatar" aria-hidden="true">
            {canal.nombre.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1>{canal.nombre}</h1>
            <p>
              {tx.canalVideos(canal.videos)} · {tx.canalGustas(canal.me_gusta)}
            </p>
          </div>
        </header>
      )}
      <div className="red-cuadricula">
        {videos.map((v) => (
          <Tarjeta key={v.id} v={v} />
        ))}
      </div>
    </div>
  );
}

/** La caja del buscador de la red, con sugerencias mientras se escribe (flechas, Enter y Escape). */
export function BuscadorRed({ inicial = '' }: { inicial?: string }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const [q, setQ] = useState(inicial);
  const [lista, setLista] = useState<string[]>([]);
  const [activa, setActiva] = useState(-1);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setQ(inicial), [inicial]);
  useEffect(() => {
    if (!q.trim() || !abierto) return setLista([]);
    const t = window.setTimeout(() => {
      void pedir<{ sugerencias: string[] }>(`/datos/red/sugerencias?q=${encodeURIComponent(q)}`)
        .then((r) => {
          setLista(r.sugerencias);
          setActiva(-1);
        })
        .catch(() => setLista([]));
    }, 180);
    return () => window.clearTimeout(t);
  }, [q, abierto]);
  const ir = (texto: string) => {
    const t = texto.trim();
    if (!t) return;
    setAbierto(false);
    navegar(`/videos/search?q=${encodeURIComponent(t)}`);
  };
  return (
    <form
      className="red-buscador"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        ir(activa >= 0 && lista[activa] ? lista[activa]! : q);
      }}
    >
      <input
        type="search"
        value={q}
        placeholder={tx.buscar}
        aria-label={tx.buscar}
        role="combobox"
        aria-expanded={abierto && lista.length > 0}
        aria-controls="red-sugerencias"
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiva((i) => Math.min(lista.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiva((i) => Math.max(-1, i - 1));
          } else if (e.key === 'Escape') setAbierto(false);
        }}
      />
      <button type="submit" className="boton" aria-label={tx.buscarBoton}>
        🔍
      </button>
      {abierto && lista.length > 0 && (
        <ul id="red-sugerencias" className="red-sugerencias" role="listbox">
          {lista.map((t, i) => (
            <li
              key={t}
              role="option"
              aria-selected={i === activa}
              className={i === activa ? 'activa' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                ir(t);
              }}
            >
              🔍 {t}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

type ResultadoRed = TarjetaRed & { fragmento: string };

/** Marca las palabras buscadas dentro de un texto (sin importar tildes ni mayúsculas). */
function Resaltado({ texto, palabras }: { texto: string; palabras: string[] }) {
  if (!palabras.length) return <>{texto}</>;
  const sin = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const partes = texto.split(/(\s+)/);
  return (
    <>
      {partes.map((p, i) =>
        palabras.some((w) => sin(p).includes(w)) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

/** Resultados del buscador: filtros arriba y cada video en una fila (miniatura, título, vistas, creador, fragmento). */
export function PaginaBusqueda() {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const parametros = new URLSearchParams(location.search);
  const q = parametros.get('q') ?? '';
  const [filtro, setFiltro] = useState<'todo' | 'horizontal' | 'vertical' | 'recientes'>('todo');
  const [resultados, setResultados] = useState<ResultadoRed[] | null>(null);
  useEffect(() => {
    document.title = `${q} · ${tx.bannerTitulo}`;
    setResultados(null);
    const extra =
      filtro === 'horizontal' || filtro === 'vertical'
        ? `&forma=${filtro}`
        : filtro === 'recientes'
          ? '&orden=recientes'
          : '';
    void pedir<{ resultados: ResultadoRed[] }>(`/datos/red/buscar?q=${encodeURIComponent(q)}${extra}`)
      .then((r) => setResultados(r.resultados))
      .catch(() => setResultados([]));
  }, [q, filtro, tx.bannerTitulo]);
  const palabras = q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1);
  const filtros = [
    ['todo', tx.filtroTodo],
    ['horizontal', tx.filtroVideos],
    ['vertical', tx.filtroShorts],
    ['recientes', tx.filtroRecientes],
  ] as const;
  return (
    <div className="red">
      <BannerRed chico />
      <BuscadorRed inicial={q} />
      <h1 className="red-resultados-titulo">{tx.resultadosDe(q)}</h1>
      <div className="red-filtros" role="group">
        {filtros.map(([f, etiqueta]) => (
          <button
            key={f}
            type="button"
            className={`red-filtro${filtro === f ? ' activo' : ''}`}
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      {resultados === null ? (
        <span className="red-tarjeta cargando" />
      ) : resultados.length === 0 ? (
        <p className="vacio">{tx.sinResultados(q)}</p>
      ) : (
        <ol className="red-resultados">
          {resultados.map((v) => (
            <li key={v.id}>
              <a className="red-resultado" href={`/videos/${v.id}`} onClick={alClicEnlace}>
                <span className={`red-miniatura${v.vertical ? ' es-short' : ''}`}>
                  {v.miniatura ? (
                    <img src={v.miniatura} alt="" loading="lazy" className={v.vertical ? 'vertical' : ''} />
                  ) : (
                    <span className="red-sin-miniatura" aria-hidden="true">
                      ▶
                    </span>
                  )}
                  <span className="red-duracion">{formatoTiempo(v.duracion)}</span>
                </span>
                <span className="red-datos">
                  <span className="red-titulo">
                    <Resaltado texto={v.titulo} palabras={palabras} />
                  </span>
                  <span className="red-meta">
                    {tx.vistas(v.vistas)} · {haceCuanto(v.publicado_en, idioma)}
                    {v.vertical && <> · {tx.shorts}</>}
                  </span>
                  <span className="red-autor">{v.autor}</span>
                  {v.fragmento && (
                    <span className="red-fragmento">
                      <Resaltado texto={v.fragmento} palabras={palabras} />
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
