// Shorts a pantalla completa (9 nov 2026, Richard: «que funcione en el celular como YouTube y TikTok»). Un video
// vertical por pantalla; se desliza hacia arriba para el siguiente (scroll-snap), se reproduce solo el que se ve, y a
// la derecha van me gusta, compartir y ver la página completa. Candado C-MOVIL.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAviso } from '../componentes/Aviso';
import { pedir, visitante } from '../logica/api';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { DOMINIO } from '../logica/sitio';
import { TEXTOS_RED } from '../logica/textosRed';
import { copiar } from './Biblioteca';
import type { TarjetaRed } from './Red';

type Gusta = { me_gusta: number; me_gusta_mio: boolean };

export function PaginaShorts({ id }: { id?: string }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_RED[idioma];
  const { usuario } = useSesion();
  const [lista, setLista] = useState<TarjetaRed[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [activo, setActivo] = useState(0);
  const [silencio, setSilencio] = useState(true);
  const [pausa, setPausa] = useState(false);
  const [gustas, setGustas] = useState<Record<string, Gusta>>({});
  const caja = useRef<HTMLDivElement>(null);
  const contadas = useRef(new Set<string>());
  const avisar = useAviso();

  useEffect(() => {
    document.title = `${tx.shorts} · Pantalay`;
    document.documentElement.classList.add('con-shorts');
    return () => document.documentElement.classList.remove('con-shorts');
  }, [tx.shorts]);

  // La lista: los Shorts más nuevos; si se abrió uno en particular, ese va primero.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const r = await pedir<{ videos: TarjetaRed[] }>('/datos/red?limite=20&forma=vertical').catch(() => ({
        videos: [] as TarjetaRed[],
      }));
      let videos = r.videos;
      if (id) {
        const uno =
          videos.find((v) => v.id === id) ??
          (await pedir<{ video: TarjetaRed }>(`/datos/red/${id}`)
            .then((x) => x.video)
            .catch(() => null));
        if (uno) videos = [uno, ...videos.filter((v) => v.id !== uno.id)];
      }
      if (!vivo) return;
      setLista(videos);
      setHayMas(r.videos.length === 20);
    })();
    return () => {
      vivo = false;
    };
    // Solo al entrar: al deslizar se cambia la dirección sin volver a cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const masShorts = useCallback(async () => {
    if (!lista?.length || !hayMas) return;
    const ultimo = Math.min(...lista.map((v) => v.publicado_en));
    const r = await pedir<{ videos: TarjetaRed[] }>(`/datos/red?limite=20&forma=vertical&antes=${ultimo}`);
    setLista((l) => [...(l ?? []), ...r.videos.filter((v) => !l?.some((x) => x.id === v.id))]);
    setHayMas(r.videos.length === 20);
  }, [lista, hayMas]);

  // Cuál se ve: el que ocupa más de la mitad de la pantalla.
  useEffect(() => {
    const raiz = caja.current;
    if (!raiz || !lista?.length) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas)
          if (e.isIntersecting) setActivo(Number((e.target as HTMLElement).dataset.indice));
      },
      { root: raiz, threshold: 0.6 },
    );
    raiz.querySelectorAll('.short-pantalla').forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [lista]);

  // Reproduce el activo y pausa los demás; la dirección cambia a la del Short que se ve (para compartir).
  useEffect(() => {
    const raiz = caja.current;
    if (!raiz || !lista?.length) return;
    setPausa(false);
    raiz.querySelectorAll<HTMLVideoElement>('video').forEach((v, i) => {
      if (i === activo) {
        v.muted = silencio;
        void v.play().catch(() => {
          // Algunos navegadores no dejan sonar sin un toque: se reproduce en silencio.
          v.muted = true;
          setSilencio(true);
          void v.play().catch(() => setPausa(true));
        });
      } else {
        v.pause();
      }
    });
    const actual = lista[activo];
    if (actual && location.pathname !== `/shorts/${actual.id}`)
      history.replaceState(history.state, '', `/shorts/${actual.id}`);
    if (activo >= lista.length - 3) void masShorts().catch(() => undefined);
    // «silencio» se aplica aparte (abajo) para no reiniciar el video al activar el sonido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, lista]);

  useEffect(() => {
    const v = caja.current?.querySelectorAll<HTMLVideoElement>('video')[activo];
    if (v) v.muted = silencio;
  }, [silencio, activo]);

  // Me gusta del que se ve (se pide al llegar a él).
  useEffect(() => {
    const actual = lista?.[activo];
    if (!actual || gustas[actual.id]) return;
    void pedir<{ video: Gusta }>(`/datos/red/${actual.id}`)
      .then((r) =>
        setGustas((g) => ({
          ...g,
          [actual.id]: { me_gusta: r.video.me_gusta, me_gusta_mio: r.video.me_gusta_mio },
        })),
      )
      .catch(() => undefined);
  }, [activo, lista, gustas]);

  // Teclado en la computadora: flechas para pasar de Short.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      ir(e.key === 'ArrowDown' ? 1 : -1);
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  });

  function ir(paso: number) {
    const raiz = caja.current;
    if (!raiz) return;
    raiz.scrollTo({ top: raiz.clientHeight * (activo + paso), behavior: 'smooth' });
  }

  function alTiempo(v: TarjetaRed, s: number) {
    if (s < 3 || contadas.current.has(v.id)) return;
    contadas.current.add(v.id);
    void fetch(`/datos/videos/${v.id}/vista`, {
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
  }

  async function meGusta(v: TarjetaRed) {
    if (!usuario) return navegar(`/login?volver=${encodeURIComponent(`/shorts/${v.id}`)}`);
    try {
      const r = await pedir<Gusta>(`/datos/red/${v.id}/me-gusta`, { method: 'POST' });
      setGustas((g) => ({ ...g, [v.id]: r }));
    } catch (e) {
      console.error('shorts: me gusta', e);
    }
  }

  async function compartir(v: TarjetaRed) {
    const url = `${DOMINIO}/videos/${v.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: v.titulo, url });
        return;
      } catch {
        /* cerró el menú de compartir: se copia el enlace */
      }
    }
    if (await copiar(url)) avisar(tx.copiado);
  }

  function tocar(e: React.MouseEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (silencio) {
      setSilencio(false);
      v.muted = false;
      if (v.paused) void v.play().catch(() => undefined);
      setPausa(false);
      return;
    }
    if (v.paused) {
      void v.play().catch(() => undefined);
      setPausa(false);
    } else {
      v.pause();
      setPausa(true);
    }
  }

  if (lista === null) return <div className="shorts-cargando" aria-busy="true" />;
  if (lista.length === 0)
    return (
      <section className="vacio pagina-angosta">
        <h1>{tx.shorts}</h1>
        <p>{tx.sinShorts}</p>
        <a className="boton" href={usuario ? '/studio' : '/signup'} onClick={alClicEnlace}>
          {tx.publicaElTuyo}
        </a>
      </section>
    );

  return (
    <div className="shorts">
      <h1 className="solo-lector">{tx.shorts}</h1>
      <div className="shorts-caja" ref={caja}>
        {lista.map((v, i) => {
          const g = gustas[v.id];
          const cerca = Math.abs(i - activo) <= 1;
          return (
            <section
              key={v.id}
              className="short-pantalla"
              data-indice={i}
              aria-label={v.titulo}
              aria-current={i === activo ? 'true' : undefined}
            >
              <div className="short-marco">
                <video
                  className="short-video"
                  poster={v.miniatura ?? undefined}
                  playsInline
                  loop
                  muted
                  preload={cerca ? 'auto' : 'none'}
                  onClick={tocar}
                  onTimeUpdate={(e) => alTiempo(v, e.currentTarget.currentTime)}
                >
                  {cerca && <source src={`/media/${v.id}/video?formato=mp4`} type="video/mp4" />}
                  {cerca && <source src={`/media/${v.id}/video?formato=webm`} type="video/webm" />}
                </video>
                {i === activo && silencio && (
                  <button type="button" className="short-sonido" onClick={() => setSilencio(false)}>
                    🔇 {tx.activarSonido}
                  </button>
                )}
                {i === activo && pausa && !silencio && (
                  <span className="short-pausa" aria-hidden="true">
                    ▶
                  </span>
                )}
                <div className="short-info">
                  <a href={`/channel/${v.autor_id}`} onClick={alClicEnlace} className="short-autor">
                    <span className="avatar" aria-hidden="true">
                      {v.autor.charAt(0).toUpperCase()}
                    </span>
                    @{v.autor}
                  </a>
                  <a href={`/videos/${v.id}`} onClick={alClicEnlace} className="short-titulo">
                    {v.titulo}
                  </a>
                  <span className="short-meta">{tx.vistas(v.vistas)}</span>
                </div>
                <div className="short-acciones">
                  <button
                    type="button"
                    className={g?.me_gusta_mio ? 'activo' : ''}
                    aria-pressed={Boolean(g?.me_gusta_mio)}
                    aria-label={usuario ? tx.meGusta : tx.entrarParaGusta}
                    onClick={() => void meGusta(v)}
                  >
                    <span aria-hidden="true">👍</span>
                    <small>{g?.me_gusta ?? v.me_gusta}</small>
                  </button>
                  <button type="button" aria-label={tx.compartir} onClick={() => void compartir(v)}>
                    <span aria-hidden="true">↗</span>
                    <small>{tx.compartir}</small>
                  </button>
                  <a href={`/videos/${v.id}`} onClick={alClicEnlace} aria-label={tx.verPaginaVideo}>
                    <span aria-hidden="true">⋯</span>
                    <small>{tx.mas2}</small>
                  </a>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div className="shorts-flechas">
        <button type="button" aria-label={tx.anterior} disabled={activo === 0} onClick={() => ir(-1)}>
          ↑
        </button>
        <button
          type="button"
          aria-label={tx.siguiente}
          disabled={activo >= lista.length - 1}
          onClick={() => ir(1)}
        >
          ↓
        </button>
      </div>
    </div>
  );
}
