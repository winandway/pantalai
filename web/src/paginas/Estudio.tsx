// Estudio de reacciones: se pega un enlace de YouTube o de TikTok, se reproduce con su reproductor oficial insertado y se
// graba SOLO el escenario de la máscara «Podcast» (la propia pestaña recortada con Region Capture). Los botones quedan
// fuera de lo que se graba. Plan: docs/PLAN-ESTUDIO-DE-REACCIONES.md · Candado: C-ESTUDIO-RECORTE.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { RevisionGrabar } from '../componentes/RevisionGrabar';
import { avisosAntesDeGrabar } from '../logica/revisionGrabar';
import { efectoValido, KARAOKE_DEFECTO } from '../logica/karaoke';
import fixWebmDuration from 'fix-webm-duration';
import { useAviso } from '../componentes/Aviso';
import { fijarEstadoGrabacion, useBotonGrabarDeArriba } from '../logica/estadoGrabacion';
import { ProbadorMicrofono } from '../componentes/ProbadorMicrofono';
import { ErrorApi, enlaceVideo, pedir } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import {
  DISENOS,
  DISENOS_VERTICALES,
  disenoVerticalPara,
  FORMATOS,
  claseEscenario,
  ESCUCHAR_YOUTUBE,
  accionDeTecla,
  armarMascara,
  disenoPara,
  videoDePantalay,
  esVertical,
  temaDeArchivo,
  volumenDelVideo,
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
  type DisenoVertical,
  type Formato,
  type VideoPegado,
} from '../logica/estudio';
import { AJUSTES_INICIALES, Grabadora, dispositivos } from '../logica/grabadora';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { Subidor, borrarRespaldo, respaldarPedazo, type Respaldo } from '../logica/subida';
import { TEXTOS_ESTUDIO } from '../logica/textosEstudio';
import { formatoTiempo, tituloAutomatico } from '../logica/tiempo';
import { COMMIT_PAGINA, recargarSiQuedoVieja } from '../logica/version';
import { SalaAnfitrion, VOZ, enlaceInvitado, type EstadoLlamada } from '../logica/llamada';
import { TEXTOS_INVITADO } from '../logica/textosInvitado';
import { copiar } from './Biblioteca';
import { MascarasEstudio } from '../componentes/MascarasEstudio';
import { CartelVoz, useVoz } from '../componentes/CartelVoz';
import {
  ELECCION_DEFECTO,
  claseMascara,
  vistaDePlantilla,
  variablesEscenario,
  type MascaraVista,
} from '../logica/mascaras';

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
  const ti = TEXTOS_INVITADO[idioma];
  const { usuario, cargando } = useSesion();
  const avisar = useAviso();
  const b = useBorrador(llaveBorrador('estudio', usuario?.id), {
    enlace: '',
    creador: '',
    tema: '',
    programa: '',
    diseno: 'clasico' as Diseno,
    formato: 'horizontal' as Formato,
    disenoV: 'mitades' as DisenoVertical,
    volVideo: 100,
    volMicro: 100,
    // Micrófono y cámara elegidos (antes el Estudio usaba siempre el «predeterminado» del navegador, y si ese era otra
    // entrada sin sonido no había cómo cambiarlo: le pasó a Richard el 9 nov 2026).
    micId: 'default',
    camId: '',
    // Karaoke (C-KARAOKE): apagado por defecto; al encenderlo el efecto arranca en el punto medio.
    karaoke: false,
    efecto: KARAOKE_DEFECTO.efecto,
    audifonos: KARAOKE_DEFECTO.audifonos,
    // Invitado remoto (C-INVITADO): qué va en la segunda tarjeta y el código del enlace vigente (para retomarlo si
    // se recarga la página).
    segunda: 'video' as 'video' | 'invitado',
    sala: '',
    // Máscara elegida (C-MASCARAS): «plantilla:podcast|noticiero|minimal» o el id de una máscara guardada.
    mascara: ELECCION_DEFECTO,
    // Cartel «Hablando / Escuchando» y barras de sonido (C-HABLANDO): encendido por defecto.
    cartelVoz: true,
    // Revisión antes de grabar (C-REVISION-GRABAR): el nombre del cartel escrito aquí manda sobre el de la máscara, y
    // «temaAuto» recuerda el último tema que puso SOLO un video (para avisar si una entrevista lo heredó).
    anfitrion: '',
    temaAuto: '',
  });
  const cartelVoz = b.valor.cartelVoz !== false;
  const [vistaMascara, setVistaMascara] = useState<MascaraVista>(() => vistaDePlantilla('podcast'));
  const modoInvitado = b.valor.segunda === 'invitado';
  const codigoSala = typeof b.valor.sala === 'string' ? b.valor.sala : '';
  const micId = typeof b.valor.micId === 'string' && b.valor.micId ? b.valor.micId : 'default';
  const camId = typeof b.valor.camId === 'string' ? b.valor.camId : '';
  const [microfonos, setMicrofonos] = useState<MediaDeviceInfo[]>([]);
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
  const volVideo = Number.isFinite(b.valor.volVideo) ? b.valor.volVideo : 100;
  const volMicro = Number.isFinite(b.valor.volMicro) ? b.valor.volMicro : 100;
  const karaoke = b.valor.karaoke === true;
  const efecto = efectoValido(b.valor.efecto);
  const audifonos = b.valor.audifonos !== false;
  const formato: Formato = FORMATOS.includes(b.valor.formato) ? b.valor.formato : 'horizontal';
  const diseno: Diseno = DISENOS.includes(b.valor.diseno) ? b.valor.diseno : 'clasico';
  const disenoV: DisenoVertical = DISENOS_VERTICALES.includes(b.valor.disenoV) ? b.valor.disenoV : 'mitades';
  // Los dos carteles juntos (bajo la cámara) en las posiciones donde el video manda.
  const grande =
    (formato === 'horizontal' && diseno === 'grande') ||
    (formato === 'vertical' && disenoV === 'protagonista');
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
  const [revisando, setRevisando] = useState(false);
  const [llamada, setLlamada] = useState<{ estado: EstadoLlamada; nombre: string | null }>({
    estado: 'esperando',
    nombre: null,
  });
  const [remoto, setRemoto] = useState<MediaStream | null>(null);
  const [creandoSala, setCreandoSala] = useState(false);
  const sala = useRef<SalaAnfitrion | null>(null);
  const camaraRef = useRef<MediaStream | null>(null);
  camaraRef.current = camara;
  const voz = useRef<MediaStream | null>(null);
  const videoInvitado = useRef<HTMLVideoElement>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const [recorte] = useState(() => puedeRecortarPestana());
  const [clavado, setClavado] = useState(false);
  const fijo = clavado || estado === 'cuenta' || estado === 'grabando' || estado === 'pausa';
  // Mientras se graba, la página no se puede bajar: el escenario queda entero a la vista todo el tiempo.
  useEffect(() => {
    document.documentElement.classList.toggle('estudio-sin-scroll', fijo);
    return () => document.documentElement.classList.remove('estudio-sin-scroll');
  }, [fijo]);

  // El micrófono, escuchado aparte (sin tocar la mezcla) para el cartel «Hablando» y sus barras.
  const [vozMicro, setVozMicro] = useState<MediaStream | null>(null);
  useEffect(() => {
    if (!usuario || !cartelVoz) return setVozMicro(null);
    let vivo = true;
    let flujo: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({
        audio: {
          deviceId: micId !== 'default' ? { exact: micId } : undefined,
          // Con cancelación de eco, el sonido del video que sale por los parlantes no enciende «Hablando».
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      })
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((p) => p.stop());
        flujo = f;
        setVozMicro(f);
      })
      .catch((e) => console.error('estudio: cartel de voz sin micrófono', e));
    return () => {
      vivo = false;
      flujo?.getTracks().forEach((p) => p.stop());
    };
  }, [usuario, micId, cartelVoz]);
  const vozAnfitrion = useVoz(vozMicro);
  const vozInvitado = useVoz(cartelVoz && modoInvitado ? remoto : null);
  const marco = useRef<HTMLIFrameElement>(null);
  // Video de la computadora: se reproduce aquí mismo (no se sube a ningún lado).
  const videoLocal = useRef<HTMLVideoElement>(null);
  const elegirArchivo = useRef<HTMLInputElement>(null);
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
  // El «Grabar» del encabezado arranca la grabación del Estudio, igual que «Empezar a grabar».
  const arrancarArriba = useRef<() => void>(() => undefined);
  useBotonGrabarDeArriba(useCallback(() => arrancarArriba.current(), []));

  useEffect(() => {
    if (!cargando && !usuario) navegar(`/login?volver=${encodeURIComponent('/studio')}`, true);
  }, [cargando, usuario]);

  // La cámara del anfitrión se ve dentro del escenario desde que se entra (así sale en lo que se graba).
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    let flujo: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          deviceId: camId ? { exact: camId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((p) => p.stop());
        flujo = f;
        setCamara(f);
        setSinCamara(false);
      })
      .catch((e) => {
        console.error('estudio: sin cámara', e);
        setSinCamara(true);
      });
    return () => {
      vivo = false;
      flujo?.getTracks().forEach((p) => p.stop());
    };
  }, [usuario, camId]);

  // La lista de micrófonos y cámaras (con sus nombres, ya con permiso); se refresca si se conecta otro.
  useEffect(() => {
    if (!usuario || !navigator.mediaDevices?.enumerateDevices) return;
    const leer = () =>
      void dispositivos()
        .then((d) => {
          setMicrofonos(d.microfonos);
          setCamaras(d.camaras);
        })
        .catch(() => undefined);
    leer();
    const t = window.setTimeout(leer, 1500); // los nombres aparecen recién con el permiso
    navigator.mediaDevices.addEventListener('devicechange', leer);
    return () => {
      window.clearTimeout(t);
      navigator.mediaDevices.removeEventListener('devicechange', leer);
    };
  }, [usuario]);

  useEffect(() => {
    if (videoCamara.current && camara) {
      videoCamara.current.srcObject = camara;
      void videoCamara.current.play().catch(() => undefined);
    }
  }, [camara]);

  // ---- Invitado remoto (C-INVITADO) ----
  // Con un enlace vigente, el Estudio espera a su invitado: le manda la cámara y una voz limpia (cancelación de eco,
  // supresión de ruido y ganancia automática), y pinta su imagen y su sonido en la segunda tarjeta. La grabación es la
  // misma de siempre (la pestaña recortada al escenario): si el invitado se cae, la grabación sigue.
  // La voz que oye el invitado (aparte de la que se graba): con los tres filtros encendidos.
  const vozLista = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (!usuario || !modoInvitado) return;
    let vivo = true;
    vozLista.current = (
      navigator.mediaDevices?.getUserMedia({
        audio: { ...VOZ, deviceId: micId !== 'default' ? { exact: micId } : undefined },
      }) ?? Promise.reject(new Error('sin mediaDevices'))
    )
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((p) => p.stop());
        voz.current = f;
        const p = f.getAudioTracks()[0];
        if (p) sala.current?.cambiarPista(p);
      })
      .catch((e) => console.error('estudio: sin micrófono para el invitado', e));
    return () => {
      vivo = false;
      voz.current?.getTracks().forEach((p) => p.stop());
      voz.current = null;
    };
  }, [usuario, modoInvitado, micId]);
  useEffect(() => {
    if (!usuario || !modoInvitado || !codigoSala) return;
    let vivo = true;
    const s = new SalaAnfitrion(
      codigoSala,
      () => {
        const pistas: MediaStreamTrack[] = [];
        const v = camaraRef.current?.getVideoTracks()[0];
        const a = voz.current?.getAudioTracks()[0];
        if (v) pistas.push(v);
        if (a) pistas.push(a);
        return pistas;
      },
      {
        estado: (estado, nombre) => {
          if (!vivo) return;
          setLlamada({ estado, nombre });
          if (estado === 'vencida') b.cambiar('sala', '');
        },
        remoto: (f) => vivo && setRemoto(f),
      },
    );
    sala.current = s;
    setLlamada({ estado: 'esperando', nombre: null });
    void vozLista.current.finally(() => {
      if (vivo) void s.iniciar();
    });
    return () => {
      vivo = false;
      s.detener();
      sala.current = null;
      setRemoto(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, modoInvitado, codigoSala]);
  // Otra cámara: el invitado la ve sin cortar la llamada.
  useEffect(() => {
    const p = camara?.getVideoTracks()[0];
    if (p) sala.current?.cambiarPista(p);
  }, [camara]);
  useEffect(() => {
    const v = videoInvitado.current;
    if (!v) return;
    v.srcObject = remoto;
    if (remoto) void v.play().catch((e) => console.error('estudio: video del invitado', e));
  }, [remoto, modoInvitado]);
  useEffect(() => {
    if (videoInvitado.current) videoInvitado.current.volume = Math.min(1, Math.max(0, volVideo / 100));
  }, [volVideo, remoto, modoInvitado]);

  async function crearSala() {
    setCreandoSala(true);
    setError(null);
    try {
      const r = await pedir<{ codigo: string }>('/datos/estudio/invitado', { method: 'POST' });
      b.cambiar('sala', r.codigo);
      const ok = await copiar(enlaceInvitado(location.origin, r.codigo));
      if (ok) avisar(ti.copiado);
    } catch (e) {
      setError({ texto: textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor') });
    } finally {
      setCreandoSala(false);
    }
  }
  async function cerrarSala() {
    const codigo = codigoSala;
    b.cambiar('sala', '');
    if (codigo)
      await pedir(`/datos/estudio/invitado/${codigo}`, { method: 'DELETE' }).catch((e) =>
        console.error('estudio: cerrar invitación', e),
      );
  }

  const cargar = useCallback(
    async (texto: string, rellenar: boolean) => {
      setError(null);
      // Un video de la propia biblioteca de Pantalay: se reproduce desde aquí mismo, como uno de la computadora.
      const propio = videoDePantalay(texto, location.hostname);
      if (propio) {
        try {
          const d = await pedir<{ video: { titulo: string } }>(`/datos/videos/${propio}`);
          setVideo({
            plataforma: 'archivo',
            id: `/media/${propio}/video`,
            vertical: false,
            inicio: 0,
            creador: '',
            nombre: d.video.titulo,
            deBiblioteca: true,
          });
          setReproduciendo(false);
          setListo(false);
          setAvisoVideo(null);
          tiempo.current = 0;
          duracion.current = 0;
          if (rellenar)
            b.setValor((x) => ({
              ...x,
              tema: x.tema || d.video.titulo,
              temaAuto: x.tema ? x.temaAuto : d.video.titulo,
            }));
        } catch {
          setVideo(null);
          setError({ texto: tx.noExiste });
        }
        return;
      }
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
        b.setValor((x) => ({
          ...x,
          diseno: disenoPara(v.vertical),
          disenoV: disenoVerticalPara(v.vertical),
          creador: v.creador || '',
          tema: '',
        }));
      try {
        const d = await pedir<Oembed>(`/datos/oembed?url=${encodeURIComponent(texto.trim())}`);
        if (!d.insertable) {
          setVideo(null);
          setError({ texto: tx.noInsertable, grabar: true });
          return;
        }
        if (!v.id && d.id) setVideo({ ...v, id: d.id, creador: d.creador } as VideoPegado);
        if (rellenar)
          b.setValor((x) => ({
            ...x,
            creador: d.creador || x.creador,
            tema: d.titulo || x.tema,
            temaAuto: d.titulo || x.temaAuto,
          }));
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
      const local = videoLocal.current;
      if (plataforma === 'archivo') {
        if (!local) return;
        if (accionVideo === 'play') void local.play().catch(() => undefined);
        else if (accionVideo === 'pause') local.pause();
        else local.currentTime = segundo ?? 0;
        return;
      }
      const w = marco.current?.contentWindow;
      if (!w) return;
      if (plataforma === 'tiktok') w.postMessage(ordenTiktok(accionVideo, segundo), ORIGEN_TT);
      else if (accionVideo === 'seekTo')
        w.postMessage(ordenYoutube('seekTo', [segundo ?? 0, true]), ORIGEN_YT);
      else w.postMessage(ordenYoutube(accionVideo === 'play' ? 'playVideo' : 'pauseVideo'), ORIGEN_YT);
    },
    [plataforma],
  );

  // Volumen del video (solo el video) y del micrófono en la grabación: se aplican al reproductor y al mezclador.
  useEffect(() => {
    if (!video) return;
    const { ordenes, enGrabacion } = volumenDelVideo(video.plataforma, volVideo);
    if (video.plataforma === 'archivo' && videoLocal.current) videoLocal.current.volume = volVideo / 100;
    const w = marco.current?.contentWindow;
    if (w && listo)
      for (const o of ordenes) {
        if (video.plataforma === 'tiktok') w.postMessage(ordenTiktok(o as 'mute' | 'unMute'), ORIGEN_TT);
        else if (typeof o === 'object') w.postMessage(ordenYoutube('setVolume', [o.setVolume]), ORIGEN_YT);
        else w.postMessage(ordenYoutube(o), ORIGEN_YT);
      }
    grabadora.current?.ajustarVolumen('sistema', enGrabacion);
  }, [video, volVideo, listo]);
  useEffect(() => {
    grabadora.current?.ajustarVolumen('micro', volMicro / 100);
  }, [volMicro]);
  useEffect(() => {
    grabadora.current?.ajustarKaraoke(efecto);
  }, [efecto]);

  // Cargar un video de la computadora (dos caminos: el enlace o el archivo).
  const urlLocal = useRef<string | null>(null);
  const cargarArchivo = useCallback(
    (archivo: File | undefined) => {
      if (!archivo) return;
      setError(null);
      if (!archivo.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm)$/i.test(archivo.name))
        return setError({ texto: tx.archivoMalo });
      if (urlLocal.current) URL.revokeObjectURL(urlLocal.current);
      const url = URL.createObjectURL(archivo);
      urlLocal.current = url;
      setVideo({
        plataforma: 'archivo',
        id: url,
        vertical: false,
        inicio: 0,
        creador: '',
        nombre: archivo.name,
      });
      setReproduciendo(false);
      setListo(false);
      setAvisoVideo(null);
      tiempo.current = 0;
      duracion.current = 0;
      b.setValor((x) => ({
        ...x,
        enlace: '',
        creador: '',
        tema: temaDeArchivo(archivo.name),
        temaAuto: temaDeArchivo(archivo.name),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx],
  );
  useEffect(
    () => () => {
      if (urlLocal.current) URL.revokeObjectURL(urlLocal.current);
    },
    [],
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

  // El encabezado dice «Grabando 0:12» mientras se graba en el Estudio (igual que en Grabar).
  useEffect(() => {
    fijarEstadoGrabacion({
      grabando: estado === 'cuenta' || estado === 'grabando' || estado === 'pausa',
      pausa: estado === 'pausa',
      segundos,
    });
  }, [estado, segundos]);
  useEffect(() => () => fijarEstadoGrabacion({ grabando: false, pausa: false, segundos: 0 }), []);

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
    if (!video && !modoInvitado) return setError({ texto: tx.sinVideo });
    if (!recorte || !escenario.current) return setError({ texto: tx.sinRecorte, grabar: true });
    if (await recargarSiQuedoVieja()) return;
    const g = new Grabadora(
      {
        ...AJUSTES_INICIALES,
        modo: 'pantalla',
        microfonoId: micId,
        // Sin ajuste automático de ganancia: con el micrófono cerca de la boca subía solo y saturaba. Con un invitado
        // remoto sí (pedido de Richard, 10 nov 2026): las dos voces quedan parejas.
        autoGanancia: modoInvitado,
        karaoke: karaoke ? { efecto, audifonos } : null,
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
    g.ajustarVolumen('micro', volMicro / 100);
    // Con invitado, el «sonido de la pestaña» es su voz (su volumen se ajusta en el propio video del invitado).
    g.ajustarVolumen('sistema', video ? volumenDelVideo(video.plataforma, volVideo).enGrabacion : 1);
    // El escenario se clava arriba ANTES de pedir la grabación: si cambia de lugar después, el navegador lo pierde y
    // graba en negro. Clavado, ya no se mueve aunque se baje la página (lo que no se ve no se graba).
    setClavado(true);
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    const barra = document.querySelector('.encabezado')?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: escenario.current.getBoundingClientRect().top + window.scrollY - barra - 8 });
    let flujo: MediaStream;
    try {
      flujo = await g.preparar();
    } catch (e) {
      setClavado(false);
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
      setClavado(false);
      if (e instanceof ErrorApi && e.codigo === 'version_vieja') return window.location.reload();
      setError({ texto: textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor') });
      return;
    }
    setEstado('cuenta');
    setClavado(false); // desde aquí lo sostiene «enCurso»
    for (let n = 3; n > 0; n--) {
      setCuenta(n);
      await new Promise((ok) => setTimeout(ok, 1000));
      if (grabadora.current !== g) return; // se descartó durante la cuenta
    }
    // El número grande se quita ANTES de empezar a grabar (C-CUENTA-VISIBLE): nunca sale en el video.
    setCuenta(0);
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    if (grabadora.current !== g) return;
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

  /** El crédito del video original, para que «Para YouTube» lo ponga solo en la descripción (C-CREDITO). */
  function creditoDe(): { creador: string; enlace: string } | undefined {
    if (modoInvitado || !video) return undefined;
    const creador = (b.valor.creador.trim() || video.creador).slice(0, 61);
    if (!creador) return undefined;
    return { creador, enlace: enlaceOriginal(video) };
  }
  const creditoRef = useRef(creditoDe);
  creditoRef.current = creditoDe;

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
        (modoInvitado
          ? b.valor.tema.trim() || ti.temaInvitado
          : (tituloReaccion(b.valor.tema, idioma) ?? tituloAutomatico(g.segmentos, idioma))) ?? undefined;
      await pedir(`/datos/videos/${id}/completar`, {
        method: 'POST',
        json: { partes, duracion: dur, transcripcion: g.segmentos, titulo, credito: creditoRef.current() },
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
  }, [avisar, b.valor.tema, idioma, limpiar, ordenar, t, modoInvitado, ti]);
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

  // Los dos «Grabar» (el de abajo y el de arriba) primero abren la revisión; la grabación arranca con «Todo bien».
  arrancarArriba.current = () => {
    if (estado === 'listo' && !clavado) abrirRevision();
  };
  function abrirRevision() {
    setError(null);
    if (!video && !modoInvitado) return setError({ texto: tx.sinVideo });
    if (!recorte) return setError({ texto: tx.sinRecorte, grabar: true });
    setRevisando(true);
  }

  if (!usuario) return null;
  const m = armarMascara({
    idioma,
    programa: b.valor.programa.trim() || vistaMascara.programa,
    anfitrion: usuario.nombre,
    nombreCartel:
      (typeof b.valor.anfitrion === 'string' && b.valor.anfitrion.trim()) || vistaMascara.anfitrion,
    rolAnfitrion: vistaMascara.rol,
    creador: modoInvitado ? (llamada.nombre ?? '') : b.valor.creador,
    tema: b.valor.tema,
    invitado: modoInvitado,
  });
  const enCurso = estado === 'cuenta' || estado === 'grabando' || estado === 'pausa';

  return (
    // Mientras se graba, el escenario queda fijo arriba y los botones en una barra fija abajo: bajar la página ya no lo
    // saca de la pantalla (lo que no se ve no se graba; pasó el 9 nov 2026).
    <div className={`estudio${enCurso || clavado ? ' grabando' : ''}`}>
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

      <fieldset className="selector-modo estudio-segunda">
        <legend>{ti.segunda}</legend>
        {(['video', 'invitado'] as const).map((op) => (
          <label key={op} className={b.valor.segunda === op ? 'activo' : ''}>
            <input
              type="radio"
              name="estudio-segunda"
              checked={b.valor.segunda === op}
              disabled={enCurso}
              onChange={() => b.cambiar('segunda', op)}
            />
            {op === 'video' ? `🎬 ${ti.segundaVideo}` : `🧑‍🤝‍🧑 ${ti.segundaInvitado}`}
          </label>
        ))}
      </fieldset>

      {modoInvitado && (
        <div className="estudio-invitado" data-panel-invitado>
          {codigoSala ? (
            <>
              <label htmlFor="estudio-enlace-invitado">{ti.enlace}</label>
              <div className="estudio-fila">
                <input
                  id="estudio-enlace-invitado"
                  readOnly
                  value={enlaceInvitado(location.origin, codigoSala)}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  className="boton"
                  onClick={() =>
                    void copiar(enlaceInvitado(location.origin, codigoSala)).then(
                      (ok) => ok && avisar(ti.copiado),
                    )
                  }
                >
                  {ti.copiar}
                </button>
                <button
                  type="button"
                  className="boton secundario"
                  disabled={creandoSala}
                  onClick={() => void crearSala()}
                >
                  {ti.nuevoEnlace}
                </button>
                <button
                  type="button"
                  className="boton secundario"
                  disabled={enCurso}
                  onClick={() => void cerrarSala()}
                >
                  {ti.cerrarInvitacion}
                </button>
              </div>
              <p className="estudio-ayuda">{ti.ayudaEnlace}</p>
              <p
                className={`estado-llamada estado-${llamada.estado}`}
                role="status"
                data-estado-invitado={llamada.estado}
              >
                {ti.anfitrion[llamada.estado]}
              </p>
            </>
          ) : (
            <>
              <button type="button" className="boton" disabled={creandoSala} onClick={() => void crearSala()}>
                🔗 {ti.invitar}
              </button>
              <p className="estudio-ayuda">{ti.ayudaEnlace}</p>
            </>
          )}
        </div>
      )}

      <form
        hidden={modoInvitado}
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
          <span className="estudio-o">{tx.o}</span>
          <button
            type="button"
            className="boton secundario"
            disabled={enCurso}
            onClick={() => elegirArchivo.current?.click()}
          >
            📁 {tx.subirArchivo}
          </button>
          <input
            ref={elegirArchivo}
            type="file"
            accept="video/*,.mp4,.mov,.m4v,.webm"
            hidden
            aria-label={tx.subirArchivo}
            data-archivo-estudio
            onChange={(e) => {
              cargarArchivo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        {video?.plataforma === 'archivo' && (
          <p className="estudio-ayuda estudio-archivo">
            {video.deBiblioteca ? '🎬' : '📁'} <b>{video.nombre}</b> ·{' '}
            {video.deBiblioteca ? tx.bibliotecaAyuda : tx.archivoAyuda}
          </p>
        )}
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

      <MascarasEstudio
        usuarioId={usuario.id}
        eleccion={typeof b.valor.mascara === 'string' ? b.valor.mascara : ELECCION_DEFECTO}
        elegir={(e) => b.cambiar('mascara', e)}
        deshabilitado={enCurso}
        alCambiarVista={setVistaMascara}
      />

      <div className="estudio-campos">
        {(
          [
            ['creador', tx.creador],
            ['tema', tx.tema],
            ['programa', tx.programa],
          ] as const
        )
          .filter(([campo]) => !(modoInvitado && campo === 'creador'))
          .map(([campo, etiqueta]) => (
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

      {formato === 'vertical' && (
        <fieldset className="selector-modo estudio-posiciones-v">
          <legend>{tx.posicion}</legend>
          {DISENOS_VERTICALES.map((d) => (
            <label key={d} className={disenoV === d ? 'activo' : ''}>
              <input
                type="radio"
                name="estudio-diseno-v"
                checked={disenoV === d}
                disabled={enCurso}
                onChange={() => b.cambiar('disenoV', d)}
              />
              <span className={`miniatura-formato miniatura-f-vertical miniatura-v-${d}`} aria-hidden="true">
                <i />
                <i />
              </span>
              {tx.disenosV[d]}
            </label>
          ))}
        </fieldset>
      )}

      {/* El escenario: lo ÚNICO que se graba. Nada de botones aquí adentro. */}
      <div className="escenario-marco">
        {/* Cuenta 3, 2, 1 grande y en el centro, ENCIMA del escenario pero fuera de él (no se graba). C-CUENTA-VISIBLE */}
        {estado === 'cuenta' && cuenta > 0 && (
          <div className="escenario-cuenta" role="status" aria-live="assertive" data-cuenta={cuenta}>
            <span key={cuenta}>{cuenta}</span>
            <small>{tx.cuentaPreparate}</small>
          </div>
        )}
        <div
          ref={escenario}
          className={
            claseEscenario(formato, diseno, Boolean(video?.vertical), disenoV) + claseMascara(vistaMascara)
          }
          style={variablesEscenario(vistaMascara) as CSSProperties}
          data-escenario
          data-mascara={vistaMascara.propia ? vistaMascara.estilo : undefined}
        >
          <div className="escenario-cabeza">
            {vistaMascara.logo ? (
              <span className="escenario-logo con-logo" aria-hidden="true">
                <img src={vistaMascara.logo} alt="" />
              </span>
            ) : (
              <span className="escenario-logo" aria-hidden="true">
                ▶
              </span>
            )}
            <span className="escenario-programa">{m.programa}</span>
            <span className="escenario-pildora">{m.rolCreador}</span>
          </div>
          <div className="escenario-centro">
            <figure className="escenario-tarjeta escenario-camara">
              <div ref={cajaCamara} className="escenario-caja">
                <video ref={videoCamara} muted playsInline autoPlay aria-hidden="true" />
                {cartelVoz && <CartelVoz quien="anfitrion" textos={tx} {...vozAnfitrion} />}
              </div>
              {/* En «video vertical grande» los dos carteles van bajo la cámara: el video queda limpio y entero. */}
              {grande ? (
                <figcaption className="carteles-juntos">
                  <span className="cartel">
                    <b>{m.anfitrion}</b> · {m.rolAnfitrion}
                  </span>
                  <span className="cartel cartel-video">
                    <b>{m.creador}</b> · {m.rolCreador}
                  </span>
                </figcaption>
              ) : (
                <figcaption className="cartel">
                  <b>{m.anfitrion}</b> · {m.rolAnfitrion}
                </figcaption>
              )}
            </figure>
            <figure className="escenario-tarjeta escenario-video">
              <div className="escenario-caja">
                {modoInvitado ? (
                  <>
                    <video
                      ref={videoInvitado}
                      className="video-invitado"
                      playsInline
                      autoPlay
                      data-video-invitado
                    />
                    {remoto && cartelVoz && <CartelVoz quien="invitado" textos={tx} {...vozInvitado} />}
                    {!remoto && (
                      <div className="escenario-vacio invitado-vacio" aria-hidden="true">
                        {codigoSala ? ti.tarjeta[llamada.estado] : ti.invitar}
                      </div>
                    )}
                  </>
                ) : video?.plataforma === 'archivo' ? (
                  <video
                    key={video.id}
                    ref={videoLocal}
                    className="video-local"
                    src={video.id}
                    playsInline
                    preload="auto"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      v.volume = volVideo / 100;
                      duracion.current = v.duration || 0;
                      setListo(true);
                      const vertical = esVertical(v.videoWidth, v.videoHeight);
                      setVideo((x) => (x && x.plataforma === 'archivo' ? { ...x, vertical } : x));
                      b.setValor((x) => ({
                        ...x,
                        diseno: disenoPara(vertical),
                        disenoV: disenoVerticalPara(vertical),
                      }));
                    }}
                    onPlay={() => {
                      setReproduciendo(true);
                      confirmado.current = true;
                      setAvisoVideo(null);
                    }}
                    onPause={() => setReproduciendo(false)}
                    onEnded={() => setReproduciendo(false)}
                    onTimeUpdate={(e) => (tiempo.current = e.currentTarget.currentTime)}
                    onError={() => {
                      setVideo(null);
                      setError({ texto: tx.archivoMalo });
                    }}
                  />
                ) : video ? (
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
              {!grande && (
                <figcaption className="cartel cartel-video">
                  <b>{m.creador}</b> · {m.rolCreador}
                </figcaption>
              )}
            </figure>
          </div>
          <div className="escenario-pie">
            <span className="escenario-etiqueta">{m.etiquetaTema}</span>
            <span className="escenario-tema">{m.tema}</span>
          </div>
        </div>
      </div>

      <div className="estudio-controles">
        {enCurso && <ProbadorMicrofono compacto microfonoId={micId} />}
        <div className="estudio-reproductor" role="group" aria-label="Video" hidden={modoInvitado}>
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
            <button type="button" className="boton grabar-boton" onClick={abrirRevision} disabled={!recorte}>
              <span className="punto-rojo" aria-hidden="true" /> {tx.grabar}
            </button>
          )}
          {estado === 'cuenta' && cuenta > 0 && <span className="estudio-cuenta">{cuenta}</span>}
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
        <div className="estudio-volumenes">
          <label>
            <span>
              🔊 {modoInvitado ? ti.volumenInvitado : tx.volumenVideo} <b>{volVideo}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volVideo}
              aria-label={modoInvitado ? ti.volumenInvitado : tx.volumenVideo}
              onChange={(e) => b.cambiar('volVideo', Number(e.target.value))}
            />
          </label>
          <label>
            <span>
              🎤 {tx.volumenMicro} <b>{volMicro}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={200}
              step={10}
              value={volMicro}
              aria-label={tx.volumenMicro}
              onChange={(e) => b.cambiar('volMicro', Number(e.target.value))}
            />
          </label>
        </div>
        <label className="estudio-cartel-voz" title={tx.cartelVozAyuda}>
          <input
            type="checkbox"
            checked={cartelVoz}
            onChange={(e) => b.cambiar('cartelVoz', e.target.checked)}
          />{' '}
          💬 {tx.cartelVoz}
        </label>
        <div className={`estudio-karaoke${karaoke ? ' activo' : ''}`}>
          <button
            type="button"
            className="estudio-karaoke-boton"
            aria-pressed={karaoke}
            disabled={enCurso}
            title={enCurso ? tx.karaokeDuranteGrabacion : tx.karaokeAyuda}
            onClick={() => b.cambiar('karaoke', !karaoke)}
          >
            🎤✨ {tx.karaoke}
          </button>
          {karaoke && (
            <>
              <label className="estudio-karaoke-efecto">
                <span>
                  {tx.karaokeEfecto} <b>{efecto}</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={efecto}
                  aria-label={tx.karaokeEfecto}
                  onChange={(e) => b.cambiar('efecto', Number(e.target.value))}
                />
              </label>
              <label className="estudio-karaoke-audifonos">
                <input
                  type="checkbox"
                  checked={audifonos}
                  disabled={enCurso}
                  onChange={(e) => b.cambiar('audifonos', e.target.checked)}
                />{' '}
                🎧 {tx.karaokeAudifonos}
              </label>
              <p className="estudio-ayuda">
                {tx.karaokeAyuda} {!audifonos && tx.karaokeParlantes}
              </p>
            </>
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
          {video.plataforma !== 'archivo' && (
            <a href={enlaceOriginal(video)} target="_blank" rel="noopener noreferrer">
              {video.plataforma === 'tiktok' ? tx.abrirTiktok : tx.abrirYoutube}
            </a>
          )}
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
      <p className="estudio-ayuda">
        {modoInvitado
          ? ti.volumenInvitadoAyuda
          : video?.plataforma === 'tiktok'
            ? tx.volumenAyudaTiktok
            : tx.volumenAyuda}
      </p>
      {sinSonido && enCurso && <p className="estudio-aviso">{tx.sinSonido}</p>}
      <div className="estudio-dispositivos">
        <div className="campo">
          <label htmlFor="estudio-mic">🎤 {tx.elegirMicrofono}</label>
          <select
            id="estudio-mic"
            value={micId}
            disabled={enCurso}
            onChange={(e) => b.cambiar('micId', e.target.value)}
          >
            <option value="default">
              {microfonos.find((d) => d.deviceId === 'default')?.label || tx.predeterminado}
            </option>
            {microfonos
              .filter((d) => d.deviceId !== 'default')
              .map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || d.deviceId.slice(0, 8)}
                </option>
              ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="estudio-cam">📷 {tx.elegirCamara}</label>
          <select
            id="estudio-cam"
            value={camId}
            disabled={enCurso}
            onChange={(e) => b.cambiar('camId', e.target.value)}
          >
            <option value="">{tx.predeterminada}</option>
            {camaras.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || d.deviceId.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ProbadorMicrofono
        microfonoId={micId}
        microfonos={microfonos}
        elegir={enCurso ? undefined : (id) => b.cambiar('micId', id)}
      />
      <p className="estudio-ayuda">{tx.atajos}</p>
      <p className="estudio-ayuda">{tx.consejo}</p>
      <p className="estudio-ayuda">{tx.derechos}</p>
      {revisando && (
        <RevisionGrabar
          tx={tx}
          avisos={avisosAntesDeGrabar({
            invitado: modoInvitado,
            tema: b.valor.tema,
            temaAuto: typeof b.valor.temaAuto === 'string' ? b.valor.temaAuto : '',
            karaoke,
            estadoLlamada: llamada.estado,
          })}
          invitado={modoInvitado}
          tema={b.valor.tema}
          tituloFinal={
            modoInvitado
              ? b.valor.tema.trim() || ti.temaInvitado
              : (tituloReaccion(b.valor.tema, idioma) ?? '')
          }
          programa={b.valor.programa}
          programaDefecto={m.programa}
          anfitrion={typeof b.valor.anfitrion === 'string' ? b.valor.anfitrion : ''}
          anfitrionDefecto={m.anfitrion}
          creador={b.valor.creador}
          nombreInvitado={llamada.nombre}
          karaoke={karaoke}
          cambiar={(campo, valor) => b.cambiar(campo, valor)}
          alternarKaraoke={() => b.cambiar('karaoke', !karaoke)}
          grabar={() => {
            setRevisando(false);
            void empezar();
          }}
          cerrar={() => setRevisando(false)}
        />
      )}
    </div>
  );
}
