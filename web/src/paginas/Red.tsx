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

/** «Videos»: la cuadrícula de todos los videos publicados, lo más nuevo primero. */
export function PaginaRed() {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const { usuario } = useSesion();
  const [videos, setVideos] = useState<TarjetaRed[] | null>(null);
  const [hayMas, setHayMas] = useState(false);

  const cargar = useCallback(async (antes?: number) => {
    const r = await pedir<{ videos: TarjetaRed[] }>(`/datos/red?limite=24${antes ? `&antes=${antes}` : ''}`);
    setVideos((x) => (antes && x ? [...x, ...r.videos] : r.videos));
    setHayMas(r.videos.length === 24);
  }, []);

  useEffect(() => {
    document.title = `${tx.tituloRed} · Pantalay`;
    void cargar().catch(() => setVideos([]));
  }, [cargar, tx.tituloRed]);

  return (
    <div className="red">
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
      ) : videos.length === 0 ? (
        <p className="vacio">
          {tx.vacio}{' '}
          <a href={usuario ? '/record' : '/signup'} onClick={alClicEnlace}>
            {tx.grabar}
          </a>
        </p>
      ) : (
        <>
          <div className="red-cuadricula">
            {videos.map((v) => (
              <Tarjeta key={v.id} v={v} />
            ))}
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
      <div className="red-ver-principal">
        <div className="red-ver-reproductor">
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
                  <b>{red.autor}</b>
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
        {otros.map((v) => (
          <Tarjeta key={v.id} v={v} chica />
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
export function CarruselRed() {
  const { idioma, enlace } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const [videos, setVideos] = useState<TarjetaRed[]>([]);
  useEffect(() => {
    void pedir<{ videos: TarjetaRed[] }>('/datos/red?limite=20')
      .then((r) => setVideos(r.videos))
      .catch(() => undefined);
  }, []);
  if (videos.length === 0) return null;
  // La cinta va dos veces seguida para que dé la vuelta sin cortes (igual que la de las redes sociales).
  const cinta = videos.length < 6 ? [...videos, ...videos, ...videos] : videos;
  return (
    <section className="red-carrusel" aria-label={tx.comunidad}>
      <div className="red-carrusel-cabeza">
        <h2>{tx.comunidad}</h2>
        <a className="enlace" href={enlace('/videos')} onClick={alClicEnlace}>
          {tx.verTodos} →
        </a>
      </div>
      <div className="red-carrusel-ventana">
        <div className="red-carrusel-cinta">
          {[...cinta, ...cinta].map((v, i) => (
            <span key={`${v.id}-${i}`} aria-hidden={i >= cinta.length}>
              <Tarjeta v={v} chica />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
