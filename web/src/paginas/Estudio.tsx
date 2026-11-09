// Estudio de reacciones: se pega un enlace de YouTube o de TikTok, se reproduce con su reproductor oficial insertado y se
// graba SOLO el escenario de la máscara «Podcast» (la propia pestaña recortada con Region Capture). Los botones quedan
// fuera de lo que se graba. Plan: docs/PLAN-ESTUDIO-DE-REACCIONES.md · Candado: C-ESTUDIO-RECORTE.
import { useCallback, useEffect, useRef, useState } from 'react';
import fixWebmDuration from 'fix-webm-duration';
import { useAviso } from '../componentes/Aviso';
import { ErrorApi, enlaceVideo, pedir } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import {
  DISENOS,
  FORMATOS,
  claseEscenario,
  ESCUCHAR_YOUTUBE,
  accionDeTecla,
  armarMascara,
  disenoPara,
  enlaceOriginal,
  pideToque,
  errorDeVideo,
  leerMensajeTiktok,
  leerMensajeYoutube,
  ordenTiktok,
  ordenYoutube,
  puedeRecortarPestana,
  saltar,
  tituloReaccion,
  urlReproductor,
  urlReproductorTiktok,
  videoDeEnlace,
  zonaRelativa,
  type Diseno,
  type Formato,
  type VideoPegado,
} from '../logica/estudio';
import { AJUSTES_INICIALES, Grabadora } from '../logica/grabadora';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { Subidor, borrarRespaldo, respaldarPedazo, type Respaldo } from '../logica/subida';
import { TEXTOS_ESTUDIO } from '../logica/textosEstudio';
import { formatoTiempo, tituloAutomatico } from '../logica/tiempo';
import { COMMIT_PAGINA, recargarSiQuedoVieja } from '../logica/version';
import { copiar } from './Biblioteca';

const ORIGEN_YT = 'https://www.youtube-nocookie.com';
const ORIGEN_TT = 'https://www.tiktok.com';
const ENTRAR_TIKTOK = 'https://www.tiktok.com/login';
type Estado = 'listo' | 'cuenta' | 'grabando' | 'pausa' | 'subiendo' | 'fallo';
type Oembed = {
  plataforma?: 'youtube' | 'tiktok';
  id: string;
  vertical?: boolean;
  insertable: boolean;
  titulo: string;
  autor: string;
  creador: string;
};

export function Estudio() {
  const { idioma, t } = useIdioma();
  const tx = TEXTOS_ESTUDIO[idioma];
  const { usuario, cargando } = useSesion();
  const avisar = useAviso();
  const b = useBorrador(llaveBorrador('estudio', usuario?.id), {
    enlace: '',
    creador: '',
    tema: '',
    programa: '',
    diseno: 'clasico' as Diseno,
    formato: 'horizontal' as Formato,
  });
  const formato: Formato = FORMATOS.includes(b.valor.formato) ? b.valor.formato : 'horizontal';
  const diseno: Diseno = DISENOS.includes(b.valor.diseno) ? b.valor.diseno : 'clasico';
  const [video, setVideo] = useState<VideoPegado | null>(null);
  const [error, setError] = useState<{ texto: string; grabar?: boolean; abrir?: boolean } | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const [cuenta, setCuenta] = useState(3);
  const [segundos, setSegundos] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [niveles, setNiveles] = useState({ micro: 0, sistema: 0 });
  const [sinSonido, setSinSonido] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  // El reproductor ya respondió (TikTok solo responde después de un toque dentro del video).
  const [listo, setListo] = useState(false);
  const [avisoVideo, setAvisoVideo] = useState<'no_arranco' | null>(null);
  // true solo cuando el PROPIO reproductor confirma que arrancó (el botón cambia antes, por rapidez).
  const confirmado = useRef(false);
  const vigilante = useRef<number | null>(null);
  const [camara, setCamara] = useState<MediaStream | null>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const [recorte] = useState(() => puedeRecortarPestana());

  const marco = useRef<HTMLIFrameElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const cajaCamara = useRef<HTMLDivElement>(null);
  const videoCamara = useRef<HTMLVideoElement>(null);
  const tiempo = useRef(0);
  const duracion = useRef(0);
  const grabadora = useRef<Grabadora | null>(null);
  const subidor = useRef<Subidor | null>(null);
  const videoId = useRef<string | null>(null);
  const respaldo = useRef<Respaldo | null>(null);
  const miniatura = useRef<Blob | null>(null);
  const pararNiveles = useRef<() => void>(() => undefined);
  const terminarRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!cargando && !usuario) navegar(`/login?volver=${encodeURIComponent('/studio')}`, true);
  }, [cargando, usuario]);

  // La cámara del anfitrión se ve dentro del escenario desde que se entra (así sale en lo que se graba).
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    let flujo: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((p) => p.stop());
        flujo = f;
        setCamara(f);
      })
      .catch((e) => {
        console.error('estudio: sin cámara', e);
        setSinCamara(true);
      });
    return () => {
      vivo = false;
      flujo?.getTracks().forEach((p) => p.stop());
    };
  }, [usuario]);

  useEffect(() => {
    if (videoCamara.current && camara) {
      videoCamara.current.srcObject = camara;
      void videoCamara.current.play().catch(() => undefined);
    }
  }, [camara]);

  const cargar = useCallback(
    async (texto: string, rellenar: boolean) => {
      setError(null);
      const v = videoDeEnlace(texto);
      if (!v) {
        setVideo(null);
        setError({ texto: tx.enlaceMalo });
        return;
      }
      // El enlace corto de TikTok no trae el número del video: hay que esperar al servidor.
      setVideo(v.id ? v : null);
      setReproduciendo(false);
      setListo(false);
      setAvisoVideo(null);
      tiempo.current = v.inicio;
      duracion.current = 0;
      if (rellenar)
        b.setValor((x) => ({ ...x, diseno: disenoPara(v.vertical), creador: v.creador || '', tema: '' }));
      try {
        const d = await pedir<Oembed>(`/datos/oembed?url=${encodeURIComponent(texto.trim())}`);
        if (!d.insertable) {
          setVideo(null);
          setError({ texto: tx.noInsertable, grabar: true });
          return;
        }
        if (!v.id && d.id) setVideo({ ...v, id: d.id, creador: d.creador } as VideoPegado);
        if (rellenar)
          b.setValor((x) => ({ ...x, creador: d.creador || x.creador, tema: d.titulo || x.tema }));
      } catch (e) {
        if (e instanceof ErrorApi && e.codigo === 'no_existe') {
          setVideo(null);
          setError({ texto: tx.noExiste });
        } else console.error('estudio: oembed', e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx],
  );

  // Al volver a la página: el enlace guardado se carga solo (sin pisar lo que se escribió en los carteles).
  const cargadoInicial = useRef(false);
  useEffect(() => {
    if (cargadoInicial.current || !usuario || !b.valor.enlace) return;
    cargadoInicial.current = true;
    void cargar(b.valor.enlace, false);
  }, [usuario, b.valor.enlace, cargar]);

  // Mensajes del reproductor oficial: listo, tiempo, estado y errores.
  useEffect(() => {
    const oir = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return;
      const m =
        e.origin === ORIGEN_YT
          ? leerMensajeYoutube(e.data)
          : e.origin === ORIGEN_TT
            ? leerMensajeTiktok(e.data)
            : null;
      if (!m) return;
      if (m.tipo === 'listo' || m.tipo === 'info') setListo(true);
      if (m.tipo === 'info') {
        if (m.tiempo !== undefined) tiempo.current = m.tiempo;
        if (m.duracion) duracion.current = m.duracion;
        if (m.estado !== undefined) {
          const anda = m.estado === 1 || m.estado === 3;
          setReproduciendo(anda);
          confirmado.current = anda;
          if (anda) setAvisoVideo(null);
        }
      } else if (m.tipo === 'error') {
        const problema = errorDeVideo(e.origin === ORIGEN_TT ? 'tiktok' : 'youtube', m.codigo);
        if (problema === 'ocupado') setError({ texto: tx.ocupado, abrir: true });
        else if (problema) {
          setVideo(null);
          setError(
            problema === 'no_existe' ? { texto: tx.noExiste } : { texto: tx.noInsertable, grabar: true },
          );
        }
      }
    };
    window.addEventListener('message', oir);
    return () => window.removeEventListener('message', oir);
  }, [tx]);

  const plataforma = video?.plataforma;
  const ordenar = useCallback(
    (accionVideo: 'play' | 'pause' | 'seekTo', segundo?: number) => {
      const w = marco.current?.contentWindow;
      if (!w) return;
      if (plataforma === 'tiktok') w.postMessage(ordenTiktok(accionVideo, segundo), ORIGEN_TT);
      else if (accionVideo === 'seekTo')
        w.postMessage(ordenYoutube('seekTo', [segundo ?? 0, true]), ORIGEN_YT);
      else w.postMessage(ordenYoutube(accionVideo === 'play' ? 'playVideo' : 'pauseVideo'), ORIGEN_YT);
    },
    [plataforma],
  );

  const alCargarMarco = useCallback(() => {
    // TikTok avisa solo; a YouTube hay que pedirle que avise su estado.
    if (plataforma === 'tiktok') return;
    // Se le pide varias veces: el primer mensaje a veces llega antes de que esté escuchando.
    let n = 0;
    const id = window.setInterval(() => {
      marco.current?.contentWindow?.postMessage(ESCUCHAR_YOUTUBE, ORIGEN_YT);
      if (++n >= 6) window.clearInterval(id);
    }, 400);
  }, [plataforma]);

  const accion = useCallback(
    (a: 'alternar' | 'atras' | 'adelante') => {
      if (!video) return;
      if (a === 'alternar') {
        // TikTok todavía en portada: nuestro botón no le llega; se pide el toque (la línea de abajo lo dice).
        if (pideToque(video.plataforma, listo)) return setAvisoVideo('no_arranco');
        const arrancar = !reproduciendo;
        ordenar(arrancar ? 'play' : 'pause');
        setReproduciendo(arrancar);
        if (vigilante.current) window.clearTimeout(vigilante.current);
        // Si en 4 segundos no arrancó, se dice claro y se ofrece tocarlo o abrirlo en su página. Nunca una portada muerta.
        confirmado.current = false;
        if (arrancar)
          vigilante.current = window.setTimeout(() => {
            if (confirmado.current) return;
            setReproduciendo(false);
            setAvisoVideo('no_arranco');
          }, 4000);
      } else {
        const s = saltar(tiempo.current, a === 'atras' ? -5 : 5, duracion.current);
        tiempo.current = s;
        ordenar('seekTo', s);
      }
    },
    [video, reproduciendo, listo, ordenar],
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      const a = accionDeTecla(e.key);
      if (!a || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      accion(a);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [accion]);

  // Reloj de la grabación.
  useEffect(() => {
    if (estado !== 'grabando') return;
    const id = window.setInterval(() => setSegundos(Math.floor(grabadora.current?.tiempo() ?? 0)), 250);
    return () => window.clearInterval(id);
  }, [estado]);

  const limpiar = useCallback(() => {
    pararNiveles.current();
    pararNiveles.current = () => undefined;
    grabadora.current?.liberar();
    grabadora.current = null;
    subidor.current = null;
    videoId.current = null;
    respaldo.current = null;
    miniatura.current = null;
    setSegundos(0);
    setProgreso(0);
  }, []);

  async function empezar() {
    setError(null);
    if (!video) return setError({ texto: tx.sinVideo });
    if (!recorte || !escenario.current) return setError({ texto: tx.sinRecorte, grabar: true });
    if (await recargarSiQuedoVieja()) return;
    const g = new Grabadora(
      {
        ...AJUSTES_INICIALES,
        modo: 'pantalla',
        microfonoId: 'default',
        audioSistema: true,
        flotante: false,
        transcribir: true,
        idiomaVoz: idioma === 'es' ? 'es-ES' : 'en-US',
      },
      {
        pedazo: (pedazo) => {
          subidor.current?.agregar(pedazo);
          if (respaldo.current) {
            respaldo.current.duracion = g.tiempo();
            void respaldarPedazo(respaldo.current, pedazo);
          }
        },
        terminada: (motivo) => {
          if (motivo === 'pantalla_cerrada') void terminarRef.current();
        },
      },
    );
    g.recortarA = escenario.current;
    // El escenario entero a la vista, justo debajo de la barra de arriba: lo que no se ve, no se graba.
    const barra = document.querySelector('.encabezado')?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: escenario.current.getBoundingClientRect().top + window.scrollY - barra - 8 });
    let flujo: MediaStream;
    try {
      flujo = await g.preparar();
    } catch (e) {
      g.liberar();
      const d = e as DOMException;
      if (d?.message === 'otra_superficie') setError({ texto: tx.otraPestana });
      else if (d?.name !== 'AbortError') setError({ texto: tx.sinPermiso });
      return;
    }
    const caja = cajaCamara.current?.getBoundingClientRect();
    const total = escenario.current.getBoundingClientRect();
    g.zonaMarca = caja ? zonaRelativa(caja, total) : null;
    grabadora.current = g;
    setSinSonido(!g.pistaSistema);
    const idNiveles = window.setInterval(() => setNiveles(g.niveles()), 50);
    pararNiveles.current = () => window.clearInterval(idNiveles);
    try {
      const r = await pedir<{ id: string; parte_minima: number; marca?: boolean }>('/datos/videos', {
        method: 'POST',
        json: {
          tipo: g.tipo.split(';')[0],
          ancho: g.ancho,
          alto: g.alto,
          idioma,
          version: COMMIT_PAGINA,
        },
      });
      videoId.current = r.id;
      g.marca = Boolean(r.marca);
      subidor.current = new Subidor({
        videoId: r.id,
        parteMinima: r.parte_minima,
        progreso: (s, tot) => setProgreso(tot ? s / tot : 0),
      });
      respaldo.current = { id: r.id, tipo: g.tipo.split(';')[0]!, creado: Date.now(), duracion: 0 };
    } catch (e) {
      limpiar();
      if (e instanceof ErrorApi && e.codigo === 'version_vieja') return window.location.reload();
      setError({ texto: textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor') });
      return;
    }
    setEstado('cuenta');
    for (let n = 3; n > 0; n--) {
      setCuenta(n);
      await new Promise((ok) => setTimeout(ok, 1000));
      if (grabadora.current !== g) return; // se descartó durante la cuenta
    }
    g.empezar(flujo);
    window.setTimeout(() => {
      if (grabadora.current === g)
        void g
          .miniatura()
          .then((m) => (miniatura.current = m))
          .catch(() => undefined);
    }, 2500);
    setEstado('grabando');
  }

  const terminar = useCallback(async () => {
    const g = grabadora.current;
    const s = subidor.current;
    const id = videoId.current;
    if (!g || !s || !id) return;
    setEstado('subiendo');
    ordenar('pause');
    const foto = miniatura.current ?? (await g.miniatura().catch(() => null));
    const dur = await g.terminar('usuario');
    try {
      const partes = await s.terminar((bl) =>
        g.tipo.includes('webm')
          ? fixWebmDuration(bl, Math.round(dur * 1000), { logger: false })
          : Promise.resolve(bl),
      );
      const titulo =
        tituloReaccion(b.valor.tema, idioma) ?? tituloAutomatico(g.segmentos, idioma) ?? undefined;
      await pedir(`/datos/videos/${id}/completar`, {
        method: 'POST',
        json: { partes, duracion: dur, transcripcion: g.segmentos, titulo },
      });
      if (foto)
        await pedir(`/datos/videos/${id}/miniatura`, {
          method: 'PUT',
          body: foto,
          headers: { 'content-type': 'image/jpeg' },
        }).catch((e) => console.error('estudio: miniatura', e));
      await borrarRespaldo(id);
      const grabado = s.archivo(g.tipo.split(';')[0]!);
      void import('../logica/indice').then((m) => m.ponerIndiceDeFondo(id, grabado));
      const ok = await copiar(enlaceVideo(id));
      avisar(ok ? `${t('listo')} · ${t('enlaceCopiado')}` : t('listo'));
      limpiar();
      setEstado('listo');
      navegar(`/v/${id}`);
    } catch (e) {
      console.error('estudio: subida', e);
      setEstado('fallo');
    }
  }, [avisar, b.valor.tema, idioma, limpiar, ordenar, t]);
  terminarRef.current = terminar;

  async function descartar() {
    const id = videoId.current;
    await grabadora.current?.terminar('usuario');
    limpiar();
    setEstado('listo');
    if (id) {
      await borrarRespaldo(id);
      await pedir(`/datos/videos/${id}/cancelar`, { method: 'POST' }).catch(() => undefined);
    }
  }

  if (!usuario) return null;
  const m = armarMascara({
    idioma,
    programa: b.valor.programa,
    anfitrion: usuario.nombre,
    creador: b.valor.creador,
    tema: b.valor.tema,
  });
  const enCurso = estado === 'cuenta' || estado === 'grabando' || estado === 'pausa';

  return (
    <div className="estudio">
      <header className="estudio-cabeza">
        <h1>{tx.titulo}</h1>
        <p>{tx.intro}</p>
      </header>

      {!recorte && (
        <p className="estudio-aviso" role="status">
          {tx.sinRecorte}{' '}
          <a href="/record" onClick={alClicEnlace}>
            {tx.irGrabar}
          </a>
        </p>
      )}

      <form
        className="estudio-enlace"
        onSubmit={(e) => {
          e.preventDefault();
          void cargar(b.valor.enlace, true);
        }}
      >
        <label htmlFor="estudio-enlace">{tx.enlace}</label>
        <div className="estudio-fila">
          <input
            id="estudio-enlace"
            type="url"
            inputMode="url"
            placeholder={tx.enlacePlaceholder}
            value={b.valor.enlace}
            onChange={(e) => b.cambiar('enlace', e.target.value)}
            disabled={enCurso}
          />
          <button type="submit" className="boton" disabled={enCurso || !b.valor.enlace.trim()}>
            {tx.cargar}
          </button>
        </div>
        <p className="estudio-ayuda">
          {tx.ayudaPlataformas}{' '}
          <a href={ENTRAR_TIKTOK} target="_blank" rel="noopener noreferrer">
            {tx.entrarTiktok}
          </a>
        </p>
        {b.recuperado && (
          <p className="recuperado">
            {t('recuperado')}{' '}
            <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
              {t('empezarDeNuevo')}
            </button>
          </p>
        )}
      </form>

      {error && (
        <p className="error" role="alert">
          {error.texto}{' '}
          {error.grabar && (
            <a href="/record" onClick={alClicEnlace}>
              {tx.irGrabar}
            </a>
          )}
          {error.abrir && video?.plataforma === 'tiktok' && (
            <a href={ENTRAR_TIKTOK} target="_blank" rel="noopener noreferrer">
              {tx.entrarTiktok}
            </a>
          )}
        </p>
      )}
      {sinCamara && <p className="estudio-aviso">{tx.sinCamara}</p>}

      <div className="estudio-campos">
        {(
          [
            ['creador', tx.creador],
            ['tema', tx.tema],
            ['programa', tx.programa],
          ] as const
        ).map(([campo, etiqueta]) => (
          <div className="campo" key={campo}>
            <label htmlFor={`estudio-${campo}`}>{etiqueta}</label>
            <input
              id={`estudio-${campo}`}
              value={b.valor[campo]}
              placeholder={campo === 'programa' ? m.programa : ''}
              maxLength={campo === 'tema' ? 120 : 40}
              onChange={(e) => b.cambiar(campo, e.target.value)}
            />
          </div>
        ))}
      </div>

      <fieldset className="selector-modo estudio-formatos">
        <legend>{tx.formato}</legend>
        {FORMATOS.map((f) => (
          <label key={f} className={formato === f ? 'activo' : ''}>
            <input
              type="radio"
              name="estudio-formato"
              checked={formato === f}
              disabled={enCurso}
              onChange={() => b.cambiar('formato', f)}
            />
            <span className={`miniatura-formato miniatura-f-${f}`} aria-hidden="true">
              <i />
              <i />
            </span>
            {tx.formatos[f]}
          </label>
        ))}
      </fieldset>

      {formato === 'horizontal' && (
        <fieldset className="selector-modo estudio-posiciones">
          <legend>{tx.posicion}</legend>
          {DISENOS.map((d) => (
            <label key={d} className={diseno === d ? 'activo' : ''}>
              <input
                type="radio"
                name="estudio-diseno"
                checked={diseno === d}
                disabled={enCurso}
                onChange={() => b.cambiar('diseno', d)}
              />
              <span className={`miniatura-diseno miniatura-${d}`} aria-hidden="true">
                <i />
                <i />
              </span>
              {tx.disenos[d]}
            </label>
          ))}
        </fieldset>
      )}

      {/* El escenario: lo ÚNICO que se graba. Nada de botones aquí adentro. */}
      <div className="escenario-marco">
        <div
          ref={escenario}
          className={claseEscenario(formato, diseno, Boolean(video?.vertical))}
          data-escenario
        >
          <div className="escenario-cabeza">
            <span className="escenario-logo" aria-hidden="true">
              ▶
            </span>
            <span className="escenario-programa">{m.programa}</span>
            <span className="escenario-pildora">{m.rolCreador}</span>
          </div>
          <div className="escenario-centro">
            <figure className="escenario-tarjeta escenario-camara">
              <div ref={cajaCamara} className="escenario-caja">
                <video ref={videoCamara} muted playsInline autoPlay aria-hidden="true" />
              </div>
              <figcaption className="cartel">
                <b>{m.anfitrion}</b> · {m.rolAnfitrion}
              </figcaption>
            </figure>
            <figure className="escenario-tarjeta escenario-video">
              <div className="escenario-caja">
                {video ? (
                  <iframe
                    key={`${video.plataforma}-${video.id}`}
                    ref={marco}
                    title={m.tema}
                    src={
                      video.plataforma === 'tiktok'
                        ? urlReproductorTiktok(video.id)
                        : urlReproductor(
                            { id: video.id, short: video.vertical, inicio: video.inicio },
                            location.origin,
                          )
                    }
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={alCargarMarco}
                  />
                ) : (
                  <div className="escenario-vacio" aria-hidden="true">
                    ▶
                  </div>
                )}
              </div>
              <figcaption className="cartel cartel-video">
                <b>{m.creador}</b> · {m.rolCreador}
              </figcaption>
            </figure>
          </div>
          <div className="escenario-pie">
            <span className="escenario-etiqueta">{m.etiquetaTema}</span>
            <span className="escenario-tema">{m.tema}</span>
          </div>
        </div>
      </div>

      <div className="estudio-controles">
        <div className="estudio-reproductor" role="group" aria-label="Video">
          <button
            type="button"
            className="boton secundario"
            onClick={() => accion('atras')}
            disabled={!video}
          >
            ⏪ {tx.atras}
          </button>
          <button
            type="button"
            className="boton secundario"
            onClick={() => accion('alternar')}
            disabled={!video}
          >
            {reproduciendo ? `⏸ ${tx.pausar}` : `▶ ${tx.reproducir}`}
          </button>
          <button
            type="button"
            className="boton secundario"
            onClick={() => accion('adelante')}
            disabled={!video}
          >
            {tx.adelante} ⏩
          </button>
        </div>
        <div className="estudio-grabacion">
          {estado === 'listo' && (
            <button
              type="button"
              className="boton grabar-boton"
              onClick={() => void empezar()}
              disabled={!recorte}
            >
              <span className="punto-rojo" aria-hidden="true" /> {tx.grabar}
            </button>
          )}
          {estado === 'cuenta' && <span className="estudio-cuenta">{cuenta}</span>}
          {(estado === 'grabando' || estado === 'pausa') && (
            <>
              <span className="indicador">{estado === 'pausa' ? tx.enPausa : tx.grabando}</span>
              <span className="estudio-reloj">{formatoTiempo(segundos)}</span>
              <span className="niveles" aria-hidden="true">
                <span className="nivel" title={tx.microfono}>
                  🎤
                  <span className="nivel-barra">
                    <span style={{ width: `${Math.round(niveles.micro * 100)}%` }} />
                  </span>
                </span>
                <span className="nivel" title={tx.sonidoVideo}>
                  🔊
                  <span className="nivel-barra">
                    <span style={{ width: `${Math.round(niveles.sistema * 100)}%` }} />
                  </span>
                </span>
              </span>
              {estado === 'grabando' ? (
                <button
                  type="button"
                  className="boton secundario"
                  onClick={() => {
                    grabadora.current?.pausar();
                    setEstado('pausa');
                  }}
                >
                  {tx.pausaGrabacion}
                </button>
              ) : (
                <button
                  type="button"
                  className="boton secundario"
                  onClick={() => {
                    grabadora.current?.continuar();
                    setEstado('grabando');
                  }}
                >
                  {tx.continuar}
                </button>
              )}
              <button type="button" className="boton" onClick={() => void terminar()}>
                {tx.terminar}
              </button>
              <button type="button" className="boton secundario" onClick={() => void descartar()}>
                {tx.descartar}
              </button>
            </>
          )}
          {estado === 'subiendo' && (
            <span className="estudio-subiendo">
              {tx.subiendo} {Math.round(progreso * 100)}%
            </span>
          )}
        </div>
      </div>
      {video && (pideToque(video.plataforma, listo) || avisoVideo === 'no_arranco') && (
        <p className={`estudio-aviso${avisoVideo ? ' estudio-aviso-fuerte' : ''}`} role="status">
          {pideToque(video.plataforma, listo) && !avisoVideo
            ? tx.tocarTiktok
            : video.plataforma === 'tiktok'
              ? tx.noArrancoTiktok
              : tx.noArranco}{' '}
          <a href={enlaceOriginal(video)} target="_blank" rel="noopener noreferrer">
            {video.plataforma === 'tiktok' ? tx.abrirTiktok : tx.abrirYoutube}
          </a>
          {video.plataforma === 'tiktok' && (
            <>
              {' · '}
              <a href={ENTRAR_TIKTOK} target="_blank" rel="noopener noreferrer">
                {tx.entrarTiktok}
              </a>
            </>
          )}
        </p>
      )}
      {estado === 'fallo' && (
        <p className="error" role="alert">
          {tx.fallo}{' '}
          <a href="/record" onClick={alClicEnlace}>
            {tx.irGrabar}
          </a>
        </p>
      )}
      {sinSonido && enCurso && <p className="estudio-aviso">{tx.sinSonido}</p>}
      <p className="estudio-ayuda">{tx.atajos}</p>
      <p className="estudio-ayuda">{tx.consejo}</p>
      <p className="estudio-ayuda">{tx.derechos}</p>
    </div>
  );
}
