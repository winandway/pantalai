import { useCallback, useEffect, useRef, useState } from 'react';
import type { LimitesPlan } from '../logica/api';
import fixWebmDuration from 'fix-webm-duration';
import { useAviso } from '../componentes/Aviso';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { BarraLapices, CapaDibujo, useLapices } from '../componentes/Lapices';
import { Confirmar } from '../componentes/Modal';
import { ErrorApi, enlaceVideo, pedir } from '../logica/api';
import {
  AJUSTES_INICIALES,
  Grabadora,
  dispositivos,
  posicionBurbuja,
  puedeFlotar,
  puedeGrabarPantalla,
  reconocimientoDisponible,
  type Ajustes,
  type Area,
  proporcionPantallaVertical,
  REPARTO_INICIAL,
  REPARTO_MAX,
  REPARTO_MIN,
} from '../logica/grabadora';
import { ElegirArea } from '../componentes/ElegirArea';
import { textoError, useIdioma } from '../logica/idioma';
import { navegar } from '../logica/ruta';
import { abrirVentana, montarBurbuja, type Burbuja } from '../logica/burbuja';
import { fijarEstadoGrabacion } from '../logica/estadoGrabacion';
type Niveles = { micro: number; sistema: number };
import { useSesion } from '../logica/sesion';
import {
  Subidor,
  borrarRespaldo,
  subirGrabacion,
  leerRespaldo,
  listarRespaldos,
  respaldarPedazo,
  type Respaldo,
} from '../logica/subida';
import { formatoTiempo, tituloAutomatico, type Segmento } from '../logica/tiempo';
import { copiar } from './Biblioteca';

type Estado = 'ajustes' | 'preparando' | 'cuenta' | 'grabando' | 'pausa' | 'subiendo' | 'fallo';

function leerAjustes(idioma: 'en' | 'es'): Ajustes {
  try {
    const g = JSON.parse(
      localStorage.getItem('pantalai:ajustes-grabar') ?? 'null',
    ) as Partial<Ajustes> | null;
    const a = { ...AJUSTES_INICIALES, idiomaVoz: idioma === 'es' ? 'es-ES' : 'en-US', ...(g ?? {}) };
    // Ajustes guardados antes del 20 oct 2026 traían el sonido de la computadora apagado por defecto.
    if (!(g as { version?: number } | null)?.version) a.audioSistema = true;
    return a;
  } catch {
    return { ...AJUSTES_INICIALES, idiomaVoz: idioma === 'es' ? 'es-ES' : 'en-US' };
  }
}

export function Grabar() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const avisar = useAviso();
  const [a, setA] = useState<Ajustes>(() => leerAjustes(idioma));
  const [estado, setEstado] = useState<Estado>('ajustes');
  const [cuenta, setCuenta] = useState(3);
  const [segundos, setSegundos] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState<{ segmentos: Segmento[]; parcial: string }>({
    segmentos: [],
    parcial: '',
  });
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
  const [microfonos, setMicrofonos] = useState<MediaDeviceInfo[]>([]);
  const [confirmar, setConfirmar] = useState<'descartar' | 'reiniciar' | null>(null);
  // Elegir qué parte de la pantalla completa se graba (se muestra después de compartirla).
  const [eligiendo, setEligiendo] = useState<{
    flujo: MediaStream;
    listo: (x: Area | null) => void;
    proporcion?: number;
    inicial?: Area | null;
  } | null>(null);
  // Short vertical: la preparación espera a que la persona toque «Empezar a grabar» (o cancele).
  const preparacion = useRef<((seguir: boolean) => void) | null>(null);
  const corto = a.modo === 'pantalla_camara' && !!a.vertical;
  const grabadora = useRef<Grabadora | null>(null);
  const subidor = useRef<Subidor | null>(null);
  const videoId = useRef<string | null>(null);
  const respaldo = useRef<Respaldo | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const previa = useRef<HTMLVideoElement>(null);
  const camaraPrevia = useRef<HTMLVideoElement>(null);
  const terminarRef = useRef<() => Promise<void>>(async () => undefined);
  const miniaturaInicio = useRef<Blob | null>(null);
  const flotante = useRef<Burbuja | null>(null);
  const [niveles, setNiveles] = useState<Niveles>({ micro: 0, sistema: 0 });
  const [sinSonido, setSinSonido] = useState(false);
  const pararNiveles = useRef<() => void>(() => undefined);
  const pausarRef = useRef<() => void>(() => undefined);
  const { l: lapices, cambiar: cambiarLapices } = useLapices(grabadora, estado);
  const continuarRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!cargando && !usuario) navegar('/login?volver=/record', true);
  }, [cargando, usuario]);

  useEffect(() => {
    try {
      localStorage.setItem('pantalai:ajustes-grabar', JSON.stringify({ ...a, version: 2 }));
    } catch {
      /* sin almacenamiento */
    }
  }, [a]);

  // Lista de cámaras y micrófonos (con nombre solo después del primer permiso).
  const leerDispositivos = useCallback(async () => {
    try {
      const d = await dispositivos();
      setCamaras(d.camaras);
      setMicrofonos(d.microfonos);
    } catch (e) {
      console.error('dispositivos', e);
    }
  }, []);
  useEffect(() => {
    void leerDispositivos();
  }, [leerDispositivos]);

  // Vista previa de la cámara mientras se ajusta (la burbuja que se va a ver).
  useEffect(() => {
    if (estado !== 'ajustes' || a.modo === 'pantalla') return;
    let flujoCam: MediaStream | null = null;
    let vivo = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: a.camaraId ? { deviceId: { exact: a.camaraId } } : true, audio: false })
      .then((s) => {
        if (!vivo) return s.getTracks().forEach((p) => p.stop());
        flujoCam = s;
        if (camaraPrevia.current) camaraPrevia.current.srcObject = s;
        void leerDispositivos();
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      flujoCam?.getTracks().forEach((p) => p.stop());
    };
  }, [estado, a.modo, a.camaraId, corto, leerDispositivos]);

  useEffect(() => {
    if (estado !== 'grabando') return;
    const i = setInterval(() => setSegundos(grabadora.current?.tiempo() ?? 0), 250);
    return () => clearInterval(i);
  }, [estado]);

  // Límites del plan (solo con el cobro encendido; si no, el servidor manda «sin límite»).
  const [limites, setLimites] = useState<LimitesPlan | null>(null);
  useEffect(() => {
    pedir<{ limites: LimitesPlan }>('/datos/plan')
      .then((r) => setLimites(r.limites))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (estado !== 'grabando' || !limites?.minutos) return;
    if (segundos >= limites.minutos * 60) {
      avisar(t('limiteMinutos'));
      void terminarRef.current();
    }
  }, [estado, segundos, limites, avisar, t]);

  // La vista previa se conecta cuando el video ya está en pantalla (antes quedaba en negro: se conectaba
  // a un elemento que todavía no existía). Candado C-VISTA-PREVIA.
  useEffect(() => {
    if (estado === 'ajustes' || !previa.current || !grabadora.current?.previa) return;
    if (previa.current.srcObject !== grabadora.current.previa)
      previa.current.srcObject = grabadora.current.previa;
  }, [estado]);

  // La burbuja flotante y el encabezado muestran el tiempo y el estado.
  useEffect(() => {
    const enCurso = estado === 'grabando' || estado === 'pausa' || estado === 'cuenta';
    fijarEstadoGrabacion({ grabando: enCurso, pausa: estado === 'pausa', segundos });
    if (estado === 'grabando' || estado === 'pausa') flotante.current?.actualizar(segundos, estado);
  }, [estado, segundos]);
  useEffect(() => () => fijarEstadoGrabacion({ grabando: false, pausa: false, segundos: 0 }), []);

  // Aviso antes de cerrar la pestaña con una grabación en curso.
  useEffect(() => {
    if (estado === 'ajustes') return;
    const antes = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', antes);
    return () => window.removeEventListener('beforeunload', antes);
  }, [estado]);

  const limpiar = useCallback(() => {
    pararNiveles.current();
    pararNiveles.current = () => undefined;
    setSinSonido(false);
    flotante.current?.cerrar();
    flotante.current = null;
    grabadora.current?.liberar();
    grabadora.current = null;
    subidor.current = null;
    videoId.current = null;
    flujo.current = null;
    setSegundos(0);
    setProgreso(0);
    setTexto({ segmentos: [], parcial: '' });
  }, []);

  async function empezar() {
    setError('');
    if (a.modo !== 'camara' && !puedeGrabarPantalla()) {
      setError(t('navegadorNoSirve'));
      return;
    }
    // El plan gratis graba hasta 720p.
    const ajustes =
      limites && Number(a.calidad) > Number(limites.calidad) ? { ...a, calidad: limites.calidad } : a;
    // La ventanita flotante se abre PRIMERO, con el gesto del clic (Chrome lo exige).
    // En el Short la ventanita es vertical y muestra cómo va quedando el video.
    const ventana =
      a.modo === 'pantalla_camara' && a.flotante && puedeFlotar()
        ? await abrirVentana(corto ? { burbujaTamano: 'grande', burbujaForma: 'vertical' } : a)
        : null;
    const g = new Grabadora(ajustes, {
      pedazo: (b) => {
        subidor.current?.agregar(b);
        if (respaldo.current) {
          respaldo.current.duracion = g.tiempo();
          void respaldarPedazo(respaldo.current, b);
        }
      },
      texto: (segmentos, parcial) => setTexto({ segmentos: [...segmentos], parcial }),
      terminada: (motivo) => {
        if (motivo === 'pantalla_cerrada') void terminarRef.current();
      },
    });
    g.ventanaFlotante = ventana;
    try {
      flujo.current = await g.preparar();
    } catch (e) {
      ventana?.close();
      g.liberar();
      const nombre = (e as DOMException)?.name;
      if (nombre !== 'AbortError' && !(nombre === 'NotAllowedError' && a.modo !== 'camara'))
        setError(t('sinPermiso'));
      return;
    }
    // «Elegir qué parte»: se marca el área sobre la imagen de lo compartido (pantalla, ventana o pestaña) antes de
    // empezar. Con la pestaña de YouTube, por ejemplo, queda solo el reproductor.
    if (corto && g.pantallaCruda) {
      // Short: siempre se encuadra lo que se va a reaccionar, con la forma exacta de su mitad.
      const elegida = await encuadrar(g, ajustes.calidad, a.reparto ?? REPARTO_INICIAL, a.areaVertical);
      g.fijarArea(elegida);
    } else if (a.modo !== 'camara' && a.elegirArea && g.pantallaCruda) {
      const flujoPantalla = g.pantallaCruda;
      const elegida = await new Promise<Area | null>((listo) =>
        setEligiendo({ flujo: flujoPantalla, listo }),
      );
      setEligiendo(null);
      g.fijarArea(elegida);
      if (elegida) setA((x) => ({ ...x, area: elegida }));
    }
    grabadora.current = g;
    if (corto) {
      // Se ve el Short armado; recién al tocar «Empezar a grabar» arranca la cuenta regresiva.
      setEstado('preparando');
      const seguir = await new Promise<boolean>((ok) => (preparacion.current = ok));
      preparacion.current = null;
      if (!seguir || grabadora.current !== g) {
        ventana?.close();
        g.liberar();
        grabadora.current = null;
        setEstado('ajustes');
        return;
      }
    }
    void leerDispositivos();
    setSinSonido(g.sinSonidoSistema);
    pararNiveles.current();
    {
      // Se mide seguido (cada 50 ms) para no perder las ráfagas; la pantalla se refresca con la caída suave.
      const id = window.setInterval(() => setNiveles(g.niveles()), 50);
      pararNiveles.current = () => window.clearInterval(id);
    }
    if (ventana && g.camara) {
      flotante.current = montarBurbuja(
        ventana,
        corto && g.previa ? g.previa : g.camara,
        corto ? { burbujaForma: 'vertical', bordeColores: false, espejo: false } : a,
        {
          pausar: () => pausarRef.current(),
          continuar: () => continuarRef.current(),
          terminar: () => void terminarRef.current(),
        },
        { pausar: t('pausar'), continuar: t('continuar'), terminar: t('terminar') },
      );
    } else ventana?.close();
    // El video se crea en el servidor durante la cuenta regresiva: así el enlace existe desde el primer segundo.
    try {
      const r = await pedir<{ id: string; parte_minima: number; marca?: boolean }>('/datos/videos', {
        method: 'POST',
        json: {
          tipo: g.tipo.split(';')[0],
          ancho: g.ancho,
          alto: g.alto,
          idioma: a.idiomaVoz.startsWith('es') ? 'es' : 'en',
        },
      });
      videoId.current = r.id;
      // El plan gratis (o quien la encendió en Configuración) lleva la marca dentro del video.
      g.marca = Boolean(r.marca);
      subidor.current = new Subidor({
        videoId: r.id,
        parteMinima: r.parte_minima,
        progreso: (s, total) => setProgreso(total ? s / total : 0),
      });
      respaldo.current = { id: r.id, tipo: g.tipo.split(';')[0]!, creado: Date.now(), duracion: 0 };
    } catch (e) {
      g.liberar();
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
      return;
    }
    setEstado('cuenta');
    for (let n = 3; n > 0; n--) {
      setCuenta(n);
      flotante.current?.actualizar(0, 'cuenta', n);
      await new Promise((r) => setTimeout(r, 1000));
      if (!grabadora.current) return; // se descartó durante la cuenta
    }
    g.empezar(flujo.current);
    // La miniatura sale de los primeros segundos (lo que se ve al empezar), no del final.
    miniaturaInicio.current = null;
    window.setTimeout(() => {
      if (grabadora.current === g)
        void g
          .miniatura()
          .then((b) => (miniaturaInicio.current = b))
          .catch(() => undefined);
    }, 2500);
    if (respaldo.current) respaldo.current.tipo = g.tipo.split(';')[0]!;
    setEstado('grabando');
  }

  const terminar = useCallback(async () => {
    const g = grabadora.current;
    const s = subidor.current;
    const id = videoId.current;
    if (!g || !s || !id) return;
    setEstado('subiendo');
    flotante.current?.cerrar();
    flotante.current = null;
    const miniatura = miniaturaInicio.current ?? (await g.miniatura().catch(() => null));
    const duracion = await g.terminar('usuario');
    const segmentos = g.segmentos;
    try {
      const partes = await s.terminar((b) =>
        g.tipo.includes('webm')
          ? fixWebmDuration(b, Math.round(duracion * 1000), { logger: false })
          : Promise.resolve(b),
      );
      const titulo = tituloAutomatico(segmentos, a.idiomaVoz.startsWith('es') ? 'es' : 'en') ?? undefined;
      await pedir(`/datos/videos/${id}/completar`, {
        method: 'POST',
        json: { partes, duracion, transcripcion: segmentos, titulo },
      });
      if (miniatura)
        await pedir(`/datos/videos/${id}/miniatura`, {
          method: 'PUT',
          body: miniatura,
          headers: { 'content-type': 'image/jpeg' },
        }).catch((e) => console.error('miniatura', e));
      await borrarRespaldo(id);
      const ok = await copiar(enlaceVideo(id));
      avisar(ok ? `${t('listo')} · ${t('enlaceCopiado')}` : t('listo'));
      limpiar();
      navegar(`/v/${id}`);
    } catch (e) {
      console.error('subida', e);
      setEstado('fallo');
    }
  }, [a.idiomaVoz, avisar, limpiar, t]);
  terminarRef.current = terminar;
  pausarRef.current = () => {
    grabadora.current?.pausar();
    setEstado('pausa');
  };
  continuarRef.current = () => {
    grabadora.current?.continuar();
    setEstado('grabando');
  };

  /** Short: abre el encuadre con la forma de la mitad de lo compartido y guarda el área para la próxima vez. */
  async function encuadrar(
    g: Grabadora,
    calidad: Ajustes['calidad'],
    reparto: number,
    inicial: Area | null | undefined,
  ): Promise<Area | null> {
    const flujoPantalla = g.pantallaCruda!;
    const elegida = await new Promise<Area | null>((listo) =>
      setEligiendo({
        flujo: flujoPantalla,
        listo,
        proporcion: proporcionPantallaVertical(calidad, reparto),
        inicial,
      }),
    );
    setEligiendo(null);
    if (elegida) setA((x) => ({ ...x, areaVertical: elegida }));
    return elegida;
  }

  async function descartar() {
    const id = videoId.current;
    await grabadora.current?.terminar('usuario');
    limpiar();
    setEstado('ajustes');
    if (id) {
      await borrarRespaldo(id);
      await pedir(`/datos/videos/${id}/cancelar`, { method: 'POST' }).catch(() => undefined);
    }
  }

  async function reiniciar() {
    await descartar();
    await empezar();
  }

  function descargarLocal() {
    const g = grabadora.current;
    const s = subidor.current;
    if (!s) return;
    const url = URL.createObjectURL(s.archivo(g?.tipo.split(';')[0] ?? 'video/webm'));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `pantalay-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // Atajos mientras graba: Alt+Shift+P pausa, Alt+Shift+S termina, Alt+Shift+D lápices.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const grabando = estado === 'grabando' || estado === 'pausa';
      // Cmd/Ctrl+Z deshace el último trazo mientras dibujas.
      if (grabando && lapices.activo && (e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
        e.preventDefault();
        grabadora.current?.pizarra.deshacer();
        return;
      }
      if (!e.altKey || !e.shiftKey) return;
      if (e.code === 'KeyD' && grabando) cambiarLapices({ activo: !lapices.activo });
      if (e.code === 'KeyP') {
        if (estado === 'grabando') pausarRef.current();
        else if (estado === 'pausa') continuarRef.current();
      }
      if (e.code === 'KeyS' && (estado === 'grabando' || estado === 'pausa')) void terminar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [estado, terminar, lapices.activo, cambiarLapices]);

  if (!usuario) return null;
  const cambiar = <K extends keyof Ajustes>(k: K, v: Ajustes[K]) => setA((x) => ({ ...x, [k]: v }));
  const enCurso = estado === 'grabando' || estado === 'pausa' || estado === 'cuenta';
  const burbuja = posicionBurbuja(320, 180, a);

  return (
    <div className="grabar">
      {eligiendo && (
        <ElegirArea
          flujo={eligiendo.flujo}
          inicial={eligiendo.proporcion ? eligiendo.inicial : a.area}
          listo={eligiendo.listo}
          proporcion={eligiendo.proporcion}
          textos={
            eligiendo.proporcion
              ? {
                  titulo: t('shortEncuadreTitulo'),
                  ayuda: t('shortEncuadreAyuda'),
                  boton: t('shortEncuadreListo'),
                }
              : undefined
          }
        />
      )}
      {estado === 'ajustes' && (
        <div className="grabar-ajustes">
          <section className="tarjeta">
            <h1>{t('nuevaGrabacion')}</h1>
            <fieldset className="selector-modo">
              <legend>{t('modo')}</legend>
              {(
                [
                  ['pantalla_camara', t('modoPantallaCamara'), '🖥️👤'],
                  ['pantalla', t('modoPantalla'), '🖥️'],
                  ['camara', t('modoCamara'), '👤'],
                ] as const
              ).map(([v, etiqueta, icono]) => (
                <label key={v} className={a.modo === v ? 'activo' : ''}>
                  <input
                    type="radio"
                    name="modo"
                    checked={a.modo === v}
                    onChange={() => cambiar('modo', v)}
                  />
                  <span className="modo-icono" aria-hidden="true">
                    {icono}
                  </span>
                  {etiqueta}
                </label>
              ))}
            </fieldset>
            {a.modo === 'pantalla_camara' && (
              <fieldset className="selector-modo selector-formato">
                <legend>{t('formato')}</legend>
                {(
                  [
                    [false, t('formatoHorizontal'), '▭'],
                    [true, t('formatoShort'), '▯'],
                  ] as const
                ).map(([v, etiqueta, icono]) => (
                  <label key={String(v)} className={!!a.vertical === v ? 'activo' : ''}>
                    <input
                      type="radio"
                      name="formato"
                      checked={!!a.vertical === v}
                      onChange={() => cambiar('vertical', v)}
                    />
                    <span className="modo-icono" aria-hidden="true">
                      {icono}
                    </span>
                    {etiqueta}
                  </label>
                ))}
              </fieldset>
            )}
            {corto && <p className="ayuda">{t('formatoShortAyuda')}</p>}

            {a.modo !== 'pantalla' && (
              <div className="campo">
                <label htmlFor="camara">{t('camara')}</label>
                <select id="camara" value={a.camaraId} onChange={(e) => cambiar('camaraId', e.target.value)}>
                  <option value="">{camaras[0]?.label || t('camara')}</option>
                  {camaras.slice(1).map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || c.deviceId.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="campo">
              <label htmlFor="micro">{t('microfono')}</label>
              <select
                id="micro"
                value={a.microfonoId}
                onChange={(e) => cambiar('microfonoId', e.target.value)}
              >
                <option value="default">
                  {microfonos.find((m) => m.deviceId === 'default')?.label || t('microfono')}
                </option>
                {microfonos
                  .filter((m) => m.deviceId !== 'default')
                  .map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label || m.deviceId.slice(0, 8)}
                    </option>
                  ))}
                <option value="">{t('sinMicrofono')}</option>
              </select>
            </div>
            {a.modo !== 'camara' && (
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={a.audioSistema}
                  onChange={(e) => cambiar('audioSistema', e.target.checked)}
                />
                {t('audioSistema')}
              </label>
            )}
            {a.modo !== 'camara' && !corto && (
              <>
                <label className="interruptor">
                  <input
                    type="checkbox"
                    checked={!!a.elegirArea}
                    onChange={(e) => cambiar('elegirArea', e.target.checked)}
                  />
                  {t('areaOpcion')}
                </label>
                <p className="ayuda">{t('areaOpcionAyuda')}</p>
              </>
            )}
            <div className="campo">
              <label htmlFor="calidad">{t('calidad')}</label>
              <select
                id="calidad"
                value={a.calidad}
                onChange={(e) => cambiar('calidad', e.target.value as Ajustes['calidad'])}
              >
                <option value="720">720p</option>
                <option value="1080" disabled={limites?.calidad === '720'}>
                  1080p HD{limites?.calidad === '720' ? ` · ${t('soloBusiness')}` : ''}
                </option>
                <option value="2160" disabled={limites?.calidad === '720'}>
                  4K{limites?.calidad === '720' ? ` · ${t('soloBusiness')}` : ''}
                </option>
              </select>
            </div>
            <label className="interruptor">
              <input
                type="checkbox"
                checked={a.transcribir && reconocimientoDisponible()}
                disabled={!reconocimientoDisponible() || !a.microfonoId}
                onChange={(e) => cambiar('transcribir', e.target.checked)}
              />
              {t('subtitulosEnVivo')}
            </label>
            <p className="ayuda">{t('subtitulosAyuda')}</p>
            {a.transcribir && reconocimientoDisponible() && (
              <div className="campo">
                <label htmlFor="voz">{t('idiomaVoz')}</label>
                <select id="voz" value={a.idiomaVoz} onChange={(e) => cambiar('idiomaVoz', e.target.value)}>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">español (España)</option>
                  <option value="es-US">español (Estados Unidos)</option>
                  <option value="es-MX">español (México)</option>
                  <option value="pt-BR">português (Brasil)</option>
                  <option value="fr-FR">français</option>
                  <option value="de-DE">Deutsch</option>
                  <option value="it-IT">italiano</option>
                </select>
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="boton grande ancho" onClick={() => void empezar()}>
              <span className="punto-rojo" aria-hidden="true" /> {t('empezarGrabacion')}
            </button>
            <p className="ayuda centro">
              {a.modo !== 'camara' ? t('permisoPantalla') : ''} {t('limiteSinLimite')}
            </p>
          </section>

          <section className="tarjeta grabar-previa-ajustes">
            <h2>{t('vistaPrevia')}</h2>
            {corto ? (
              <div className={`maqueta-short ${(a.camaraArriba ?? true) ? 'arriba' : 'abajo'}`}>
                <div
                  className="maqueta-short-camara"
                  style={{ flexBasis: `${(a.reparto ?? REPARTO_INICIAL) * 100}%` }}
                >
                  <video ref={camaraPrevia} autoPlay muted playsInline className="camara-previa" />
                </div>
                <div className="maqueta-short-pantalla">
                  <span>▶</span>
                </div>
              </div>
            ) : (
              <div className={`maqueta-pantalla modo-${a.modo}`}>
                {a.modo !== 'camara' && <div className="maqueta-escritorio" aria-hidden="true" />}
                {a.modo !== 'pantalla' && (
                  <div
                    className={`camara-previa-marco forma-${a.burbujaForma} ${a.bordeColores && a.modo !== 'camara' ? 'con-borde' : ''} ${a.modo === 'camara' ? 'completa' : ''}`}
                    style={
                      a.modo === 'camara'
                        ? undefined
                        : {
                            left: `${(burbuja.x / 320) * 100}%`,
                            top: `${(burbuja.y / 180) * 100}%`,
                            width: `${(burbuja.ancho / 320) * 100}%`,
                            height: `${(burbuja.alto / 180) * 100}%`,
                          }
                    }
                  >
                    <video ref={camaraPrevia} autoPlay muted playsInline className="camara-previa" />
                  </div>
                )}
              </div>
            )}
            {corto && (
              <div className="fila-botones izquierda" role="group" aria-label={t('shortCamara')}>
                <button
                  type="button"
                  className={`boton chico ${(a.camaraArriba ?? true) ? '' : 'secundario'}`}
                  aria-pressed={a.camaraArriba ?? true}
                  onClick={() => cambiar('camaraArriba', true)}
                >
                  ⬆ {t('shortCamaraArriba')}
                </button>
                <button
                  type="button"
                  className={`boton chico ${(a.camaraArriba ?? true) ? 'secundario' : ''}`}
                  aria-pressed={!(a.camaraArriba ?? true)}
                  onClick={() => cambiar('camaraArriba', false)}
                >
                  ⬇ {t('shortCamaraAbajo')}
                </button>
              </div>
            )}
            {a.modo === 'pantalla_camara' && !corto && (
              <div className="ajustes-burbuja">
                <div className="campo">
                  <label htmlFor="tam">{t('burbujaTamano')}</label>
                  <select
                    id="tam"
                    value={a.burbujaTamano}
                    onChange={(e) => cambiar('burbujaTamano', e.target.value as Ajustes['burbujaTamano'])}
                  >
                    <option value="chico">{t('chico')}</option>
                    <option value="mediano">{t('mediano')}</option>
                    <option value="grande">{t('grande')}</option>
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="forma">{t('forma')}</label>
                  <select
                    id="forma"
                    value={a.burbujaForma}
                    onChange={(e) => cambiar('burbujaForma', e.target.value as Ajustes['burbujaForma'])}
                  >
                    <option value="circulo">{t('circulo')}</option>
                    <option value="cuadrado">{t('cuadrado')}</option>
                    <option value="vertical">{t('vertical')}</option>
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="esquina">{t('esquina')}</label>
                  <select
                    id="esquina"
                    value={a.esquina}
                    onChange={(e) => cambiar('esquina', e.target.value as Ajustes['esquina'])}
                  >
                    <option value="abajo-izq">↙</option>
                    <option value="abajo-der">↘</option>
                    <option value="arriba-izq">↖</option>
                    <option value="arriba-der">↗</option>
                  </select>
                </div>
                <label className="interruptor opcion-ancha">
                  <input
                    type="checkbox"
                    checked={a.bordeColores}
                    onChange={(e) => cambiar('bordeColores', e.target.checked)}
                  />
                  {t('bordeColores')}
                </label>
                {puedeFlotar() && (
                  <label className="interruptor opcion-ancha">
                    <input
                      type="checkbox"
                      checked={a.flotante}
                      onChange={(e) => cambiar('flotante', e.target.checked)}
                    />
                    {t('burbujaFlotante')}
                  </label>
                )}
                {puedeFlotar() && a.flotante && (
                  <p className="ayuda opcion-ancha">{t('burbujaFlotanteAyuda')}</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {(enCurso || estado === 'preparando' || estado === 'subiendo' || estado === 'fallo') && (
        <div className={`grabar-en-curso ${grabadora.current?.esVertical() ? 'es-short' : ''}`}>
          {estado === 'preparando' && (
            <div className="tarjeta short-preparar">
              <h2>{t('shortPrepararTitulo')}</h2>
              <p className="ayuda">{t('shortPrepararAyuda')}</p>
              <div className="fila-botones izquierda" role="group" aria-label={t('shortCamara')}>
                <button
                  type="button"
                  className={`boton chico ${(a.camaraArriba ?? true) ? '' : 'secundario'}`}
                  aria-pressed={a.camaraArriba ?? true}
                  onClick={() => {
                    cambiar('camaraArriba', true);
                    grabadora.current?.ajustarVertical({ camaraArriba: true });
                  }}
                >
                  ⬆ {t('shortCamaraArriba')}
                </button>
                <button
                  type="button"
                  className={`boton chico ${(a.camaraArriba ?? true) ? 'secundario' : ''}`}
                  aria-pressed={!(a.camaraArriba ?? true)}
                  onClick={() => {
                    cambiar('camaraArriba', false);
                    grabadora.current?.ajustarVertical({ camaraArriba: false });
                  }}
                >
                  ⬇ {t('shortCamaraAbajo')}
                </button>
              </div>
              <div className="campo">
                <label htmlFor="reparto">
                  {t('shortReparto')}: {Math.round((a.reparto ?? REPARTO_INICIAL) * 100)} %
                </label>
                <input
                  id="reparto"
                  type="range"
                  min={REPARTO_MIN}
                  max={REPARTO_MAX}
                  step={0.01}
                  value={a.reparto ?? REPARTO_INICIAL}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    cambiar('reparto', r);
                    grabadora.current?.ajustarVertical({ reparto: r });
                  }}
                />
              </div>
              <button
                type="button"
                className="boton secundario"
                onClick={() => {
                  const g = grabadora.current;
                  if (!g) return;
                  void encuadrar(g, a.calidad, a.reparto ?? REPARTO_INICIAL, a.areaVertical).then((x) =>
                    g.fijarArea(x),
                  );
                }}
              >
                ⬚ {t('shortReencuadrar')}
              </button>
              <div className="fila-botones izquierda short-arrancar">
                <button type="button" className="boton grande" onClick={() => preparacion.current?.(true)}>
                  <span className="punto-rojo" aria-hidden="true" /> {t('empezarGrabacion')}
                </button>
                <button
                  type="button"
                  className="boton secundario"
                  onClick={() => preparacion.current?.(false)}
                >
                  {t('cancelar')}
                </button>
              </div>
            </div>
          )}
          <div className="grabar-previa">
            <video ref={previa} autoPlay muted playsInline />
            {(estado === 'grabando' || estado === 'pausa') && (
              <CapaDibujo l={lapices} grabadora={grabadora} video={previa} />
            )}
            {estado === 'subiendo' && (
              <div className="subiendo-capa" role="status" aria-live="polite">
                <span className="ruedita" aria-hidden="true" />
                <strong>
                  {progreso >= 0.999 ? t('procesando') : `${t('subiendo')} ${Math.round(progreso * 100)} %`}
                </strong>
                <span className="ayuda-clara">{t('subiendoAyuda')}</span>
              </div>
            )}
            {estado === 'cuenta' && (
              <div className="cuenta-regresiva" aria-live="assertive">
                <span>{t('cuentaRegresiva')}</span>
                <strong>{cuenta}</strong>
              </div>
            )}
            {(texto.parcial || texto.segmentos.length > 0) && enCurso && (
              <p className="subtitulo-vivo">
                {texto.parcial || texto.segmentos[texto.segmentos.length - 1]?.texto}
              </p>
            )}
          </div>
          {estado !== 'preparando' && (
            <div className="barra-grabacion" role="toolbar">
              <span className={`indicador ${estado === 'grabando' ? 'vivo' : ''}`}>
                {estado === 'pausa'
                  ? t('enPausa')
                  : estado === 'subiendo'
                    ? t('procesando')
                    : estado === 'cuenta'
                      ? `${t('cuentaRegresiva')} ${cuenta}`
                      : t('grabando')}
              </span>
              <span className="cronometro">{formatoTiempo(segundos)}</span>
              {enCurso && (
                <span className="niveles" aria-label={t('nivelesSonido')}>
                  {grabadora.current?.pistaMicro && (
                    <span className="nivel" title={t('microfono')}>
                      🎤
                      <span className="nivel-barra">
                        <span style={{ width: `${Math.round(niveles.micro * 100)}%` }} />
                      </span>
                    </span>
                  )}
                  {grabadora.current?.pistaSistema && (
                    <span className="nivel" title={t('sonidoComputadora')}>
                      🔊
                      <span className="nivel-barra">
                        <span style={{ width: `${Math.round(niveles.sistema * 100)}%` }} />
                      </span>
                    </span>
                  )}
                </span>
              )}
              {estado === 'grabando' && (
                <button type="button" className="boton secundario" onClick={() => pausarRef.current()}>
                  ⏸ {t('pausar')}
                </button>
              )}
              {estado === 'pausa' && (
                <button type="button" className="boton secundario" onClick={() => continuarRef.current()}>
                  ▶ {t('continuar')}
                </button>
              )}
              {(estado === 'grabando' || estado === 'pausa') && (
                <>
                  <button
                    type="button"
                    className={`boton ${lapices.activo ? '' : 'secundario'}`}
                    aria-pressed={lapices.activo}
                    disabled={limites?.lapices === false}
                    title={limites?.lapices === false ? t('soloBusiness') : undefined}
                    onClick={() => cambiarLapices({ activo: !lapices.activo })}
                  >
                    ✏️ {lapices.activo ? t('dejarDeDibujar') : t('dibujar')}
                  </button>
                  <button
                    type="button"
                    className="boton secundario"
                    onClick={() => setConfirmar('reiniciar')}
                  >
                    ↺ {t('reiniciar')}
                  </button>
                  <button
                    type="button"
                    className="boton secundario"
                    onClick={() => setConfirmar('descartar')}
                  >
                    {t('descartar')}
                  </button>
                  <button type="button" className="boton" onClick={() => void terminar()}>
                    ■ {t('terminar')}
                  </button>
                </>
              )}
              {estado === 'subiendo' && (
                <div className="progreso" aria-label={t('subiendo')}>
                  <div style={{ width: `${Math.round(progreso * 100)}%` }} />
                </div>
              )}
            </div>
          )}
          {(estado === 'grabando' || estado === 'pausa') && (
            <BarraLapices
              l={lapices}
              cambiar={cambiarLapices}
              grabadora={grabadora}
              pantallaCompleta={grabadora.current?.pantallaCompleta() ?? false}
            />
          )}
          {sinSonido && enCurso && (
            <div className="tarjeta alerta">
              <p>{t('sinSonidoSistema')}</p>
            </div>
          )}
          {estado === 'fallo' && (
            <div className="tarjeta alerta">
              <p>{t('fallaSubida')}</p>
              <div className="fila-botones izquierda">
                <button type="button" className="boton" onClick={() => void terminar()}>
                  {t('reintentar')}
                </button>
                <button type="button" className="boton secundario" onClick={descargarLocal}>
                  {t('descargarGrabacion')}
                </button>
              </div>
            </div>
          )}
          {texto.segmentos.length > 0 && (
            <details className="tarjeta transcripcion-viva">
              <summary>{t('transcripcion')}</summary>
              {texto.segmentos.map((s, i) => (
                <p key={i}>
                  <span className="minuto">{formatoTiempo(s.inicio)}</span> {s.texto}
                </p>
              ))}
            </details>
          )}
        </div>
      )}

      {confirmar && (
        <Confirmar
          texto={confirmar === 'descartar' ? t('confirmarDescartar') : t('confirmarReiniciar')}
          etiquetaSi={confirmar === 'descartar' ? t('descartar') : t('reiniciar')}
          etiquetaNo={t('cancelar')}
          no={() => setConfirmar(null)}
          si={() => {
            const c = confirmar;
            setConfirmar(null);
            void (c === 'descartar' ? descartar() : reiniciar());
          }}
        />
      )}
    </div>
  );
}

/** Grabaciones que no terminaron de subir: se quedan en esta computadora hasta que se descarguen o borren. */
export function Respaldos() {
  const { t, idioma } = useIdioma();
  const [lista, setLista] = useState<Respaldo[]>([]);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [avance, setAvance] = useState(0);
  const avisar = useAviso();
  async function reintentar(r: Respaldo) {
    setSubiendo(r.id);
    setAvance(0);
    try {
      const archivo = await leerRespaldo(r.id, r.tipo);
      const nuevo = await subirGrabacion(archivo, r.duracion, idioma, (s, total) =>
        setAvance(Math.round((s / Math.max(1, total)) * 100)),
      );
      // El video a medias del servidor se cancela y el respaldo local se borra: ya está a salvo arriba.
      await pedir(`/datos/videos/${r.id}/cancelar`, { method: 'POST' }).catch(() => undefined);
      await borrarRespaldo(r.id);
      navegar(`/v/${nuevo}`);
    } catch (e) {
      console.error('subir otra vez', e);
      avisar(t('fallaSubida'));
    } finally {
      setSubiendo(null);
    }
  }
  useEffect(() => {
    void listarRespaldos().then(setLista);
  }, []);
  if (!lista.length) return null;
  return (
    <div className="tarjeta alerta respaldos">
      <strong>{t('respaldos')}</strong>
      <p className="ayuda">{t('respaldosAyuda')}</p>
      {lista.map((r) => (
        <div key={r.id} className="respaldo-fila">
          <span>
            {new Date(r.creado).toLocaleString(idioma)} · {formatoTiempo(r.duracion)}
          </span>
          <button
            type="button"
            className="boton chico"
            disabled={subiendo === r.id}
            onClick={() => void reintentar(r)}
          >
            {subiendo === r.id ? `${t('subiendo')} ${avance} %` : t('subirOtraVez')}
          </button>
          <button
            type="button"
            className="boton secundario chico"
            onClick={() =>
              void leerRespaldo(r.id, r.tipo).then((b) => {
                const url = URL.createObjectURL(b);
                const enlace = document.createElement('a');
                enlace.href = url;
                enlace.download = `pantalay-${r.id}.${r.tipo.includes('mp4') ? 'mp4' : 'webm'}`;
                enlace.click();
                setTimeout(() => URL.revokeObjectURL(url), 10_000);
              })
            }
          >
            {t('descargarGrabacion')}
          </button>
          <MenuPuntos
            opciones={[
              {
                etiqueta: t('eliminar'),
                peligro: true,
                accion: () =>
                  void borrarRespaldo(r.id).then(() => setLista((l) => l.filter((x) => x.id !== r.id))),
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
