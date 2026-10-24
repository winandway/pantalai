// Motor de grabación en el navegador: pantalla, cámara (burbuja), micrófono y audio del sistema.
// Pantalla + cámara se componen en un lienzo con un reloj en un Worker: así sigue grabando
// aunque la pestaña de PANTALAI quede en segundo plano mientras grabas otra ventana.
import { pintar, Pizarra } from './dibujo';
import type { Segmento } from './tiempo';

export type Modo = 'pantalla_camara' | 'pantalla' | 'camara';
export type Calidad = '720' | '1080' | '2160';
export type Esquina = 'abajo-izq' | 'abajo-der' | 'arriba-izq' | 'arriba-der';

export type Ajustes = {
  modo: Modo;
  camaraId: string;
  microfonoId: string; // '' = sin micrófono
  audioSistema: boolean;
  calidad: Calidad;
  burbujaTamano: 'chico' | 'mediano' | 'grande';
  burbujaForma: 'circulo' | 'cuadrado' | 'vertical';
  esquina: Esquina;
  /** Burbuja en una ventanita flotante encima de todos los programas (como Loom). */
  flotante: boolean;
  /** Borde de colores que va girando alrededor de la burbuja. */
  bordeColores: boolean;
  transcribir: boolean;
  idiomaVoz: string; // 'en-US' | 'es-ES' ...
  /** Con la pantalla completa: preguntar qué parte grabar (lo de afuera no sale en el video). */
  elegirArea?: boolean;
  /** La última parte elegida, en fracciones de la pantalla (0 a 1), para dejarla marcada la próxima vez. */
  area?: Area | null;
  /** Short vertical (9:16): lo que se comparte en una mitad y la cámara en la otra, sin burbuja. */
  vertical?: boolean;
  /** En el Short: la cámara arriba (true) o abajo (false). */
  camaraArriba?: boolean;
  /** En el Short: qué parte del alto ocupa la cámara (0,3 a 0,6). */
  reparto?: number;
  /** Última área elegida para el Short (tiene otra forma que la del video horizontal). */
  areaVertical?: Area | null;
};

export type Rect = { x: number; y: number; w: number; h: number };

/** Medidas del Short: 9:16, a 1080 × 1920 (720 × 1280 si el plan graba en 720). */
export function medidaVertical(calidad: Calidad): { ancho: number; alto: number } {
  return calidad === '720' ? { ancho: 720, alto: 1280 } : { ancho: 1080, alto: 1920 };
}

/** Medidas de la marca de agua según el lado corto del video (se ve igual en 720p, 1080p o 4K). */
export function marcaEn(zona: Rect, ladoCorto: number) {
  const letra = Math.round(ladoCorto * 0.026);
  return {
    letra,
    icono: Math.round(letra * 1.3),
    espacio: Math.round(letra * 0.4),
    relleno: Math.round(letra * 0.5),
    margen: Math.round(Math.min(zona.w, zona.h) * 0.04),
  };
}

export const REPARTO_MIN = 0.3;
export const REPARTO_MAX = 0.6;
export const REPARTO_INICIAL = 0.45;

/** Las dos partes del Short: la cámara y lo compartido, una arriba de la otra, sin huecos. */
export function partesVertical(
  ancho: number,
  alto: number,
  camaraArriba: boolean,
  reparto: number,
): { camara: Rect; pantalla: Rect } {
  const r = Math.min(REPARTO_MAX, Math.max(REPARTO_MIN, reparto));
  const hc = Math.round(alto * r);
  const camara = { x: 0, y: camaraArriba ? 0 : alto - hc, w: ancho, h: hc };
  const pantalla = { x: 0, y: camaraArriba ? hc : 0, w: ancho, h: alto - hc };
  return { camara, pantalla };
}

/** Proporción (ancho / alto) de la parte de lo compartido en el Short: así se encuadra con la forma exacta. */
export function proporcionPantallaVertical(calidad: Calidad, reparto: number): number {
  const { ancho, alto } = medidaVertical(calidad);
  const { pantalla } = partesVertical(ancho, alto, true, reparto);
  return pantalla.w / pantalla.h;
}

/** Qué parte de una imagen (sw × sh) usar para LLENAR un recuadro (dw × dh) sin deformar: se recorta al centro. */
export function cubrir(sw: number, sh: number, dw: number, dh: number): Rect {
  const escala = Math.max(dw / sw, dh / sh);
  const w = dw / escala;
  const h = dh / escala;
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}

/** Una parte de la pantalla, en fracciones de su ancho y alto (sirve igual en cualquier resolución). */
export type Area = { x: number; y: number; ancho: number; alto: number };

/**
 * El área elegida en píxeles de la pantalla compartida: dentro de la pantalla, de al menos 160 px y con medidas
 * pares (el formato H.264 no acepta medidas impares).
 */
export function areaEnPixeles(
  area: Area,
  ancho: number,
  alto: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const par = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  const sw = par(Math.min(ancho, Math.max(160, area.ancho * ancho)));
  const sh = par(Math.min(alto, Math.max(160, area.alto * alto)));
  const sx = Math.round(Math.min(Math.max(0, area.x * ancho), ancho - sw));
  const sy = Math.round(Math.min(Math.max(0, area.y * alto), alto - sh));
  return { sx, sy, sw, sh };
}

export const AJUSTES_INICIALES: Ajustes = {
  modo: 'pantalla_camara',
  camaraId: '',
  microfonoId: 'default',
  audioSistema: true,
  calidad: '1080',
  burbujaTamano: 'mediano',
  burbujaForma: 'circulo',
  esquina: 'abajo-izq',
  flotante: true,
  bordeColores: true,
  transcribir: true,
  idiomaVoz: 'en-US',
};

const ALTO: Record<Calidad, number> = { '720': 720, '1080': 1080, '2160': 2160 };
const BITS: Record<Calidad, number> = { '720': 2_500_000, '1080': 5_000_000, '2160': 16_000_000 };
const BURBUJA: Record<Ajustes['burbujaTamano'], number> = { chico: 0.16, mediano: 0.22, grande: 0.3 };

/**
 * Formato de la grabación. Primero MP4 (H.264 + AAC), que Chrome, Edge y Safari graban directo: así no hay que
 * convertir nada después (antes se grababa WebM y había que reconvertir el video entero en la computadora para tener
 * el MP4 del iPhone, Final Cut y YouTube; eso era lo lento). Los códigos de perfil van completos: Chrome rechaza
 * «avc1,mp4a» a secas. 4K pide un nivel más alto (5.1).
 */
export function tipoDeGrabacion(
  soporta: (t: string) => boolean = (t) => MediaRecorder.isTypeSupported(t),
  calidad: Calidad = '1080',
): string {
  const opciones = [
    ...(calidad === '2160' ? ['video/mp4;codecs=avc1.640033,mp4a.40.2'] : []),
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return opciones.find((t) => soporta(t)) ?? 'video/webm';
}

export function puedeGrabarPantalla(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** Medidas de la burbuja: cuadrada para círculo y cuadrado, 9:16 (tipo short) para vertical. */
export function medidaBurbuja(base: number, forma: Ajustes['burbujaForma']): { ancho: number; alto: number } {
  if (forma === 'vertical') {
    const alto = Math.round(base * 1.45);
    return { ancho: Math.round((alto * 9) / 16), alto };
  }
  return { ancho: base, alto: base };
}

/** Dónde va la burbuja dentro del lienzo. «lado» queda por compatibilidad (= ancho). */
export function posicionBurbuja(
  ancho: number,
  alto: number,
  a: Pick<Ajustes, 'burbujaTamano' | 'esquina'> & { burbujaForma?: Ajustes['burbujaForma'] },
) {
  const m = medidaBurbuja(
    Math.round(Math.min(ancho, alto) * BURBUJA[a.burbujaTamano]),
    a.burbujaForma ?? 'circulo',
  );
  const margen = Math.round(Math.min(ancho, alto) * 0.03);
  const x = a.esquina.endsWith('izq') ? margen : ancho - m.ancho - margen;
  const y = a.esquina.startsWith('abajo') ? alto - m.alto - margen : margen;
  return { x, y, lado: m.ancho, ancho: m.ancho, alto: m.alto };
}

/** La ventanita flotante existe en Chrome y Edge de computadora. */
export function puedeFlotar(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

type Eventos = {
  pedazo?: (b: Blob) => void;
  terminada?: (motivo: 'usuario' | 'pantalla_cerrada') => void;
  texto?: (segmentos: Segmento[], parcial: string) => void;
};

type ReconocimientoVoz = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export function reconocimientoDisponible(): boolean {
  const w = globalThis as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export class Grabadora {
  private flujos: MediaStream[] = [];
  private grabador: MediaRecorder | null = null;
  private lienzo: HTMLCanvasElement | null = null;
  private reloj: Worker | null = null;
  private audio: AudioContext | null = null;
  private voz: ReconocimientoVoz | null = null;
  private vozActiva = false;
  private inicioFrase: number | null = null;
  private acumulado = 0;
  private desde = 0;
  private pausada = false;
  segmentos: Segmento[] = [];
  tipo = 'video/webm';
  ancho = 0;
  alto = 0;
  previa: MediaStream | null = null;
  /** true si se pidió el sonido de la computadora y el navegador no lo entregó. */
  sinSonidoSistema = false;
  pistaMicro: MediaStreamTrack | null = null;
  private medidores: { micro?: AnalyserNode; sistema?: AnalyserNode } = {};
  private muestras = new Float32Array(512);
  private ultimos = { micro: 0, sistema: 0 };

  /** Nivel de sonido de 0 a 1 del micrófono y de la computadora, medido dentro del mezclador que se graba. */
  niveles(): { micro: number; sistema: number } {
    const nivel = (a?: AnalyserNode) => {
      if (!a) return 0;
      a.getFloatTimeDomainData(this.muestras);
      let suma = 0;
      for (const v of this.muestras) suma += v * v;
      return Math.min(1, Math.sqrt(suma / this.muestras.length) * 4);
    };
    // Caída suave (como un vúmetro): el sonido capturado llega a ráfagas y una lectura suelta puede caer en un hueco.
    this.ultimos.micro = Math.max(nivel(this.medidores.micro), this.ultimos.micro * 0.85);
    this.ultimos.sistema = Math.max(nivel(this.medidores.sistema), this.ultimos.sistema * 0.85);
    return { ...this.ultimos };
  }
  pistaSistema: MediaStreamTrack | null = null;
  /** En modo flotante: la cámara que se muestra en la ventanita. */
  camara: MediaStream | null = null;
  /** La ventanita flotante, abierta por la página antes de pedir la pantalla. */
  ventanaFlotante: Window | null = null;
  /** Los lápices: lo que se dibuja aquí sale en el video. */
  pizarra = new Pizarra();
  /** Graba la última foto de la pantalla (de cuando estabas en otro programa) mientras dibujas. */
  congelar = false;
  private videoPantalla: HTMLVideoElement | null = null;
  private videoCamara: HTMLVideoElement | null = null;
  /** Parte de la pantalla que se graba (null = toda). */
  private area: Area | null = null;
  /** Marca de agua «pantalay.com» grabada dentro del video (la decide el servidor al crear el video). */
  marca = false;
  private logo: HTMLImageElement | null = null;
  /** La pantalla compartida tal cual (para elegir el área sobre ella). */
  pantallaCruda: MediaStream | null = null;

  /** Qué se compartió: «monitor» (pantalla completa), «window» (una ventana) o «browser» (una pestaña). */
  superficie(): string {
    const p = this.flujos[0]?.getVideoTracks()[0];
    return (p?.getSettings() as { displaySurface?: string } | undefined)?.displaySurface ?? '';
  }

  /** Graba solo esta parte de la pantalla (null = toda). Se elige antes de empezar. */
  fijarArea(area: Area | null) {
    this.area = area;
    const vp = this.videoPantalla;
    // En el Short el lienzo es siempre 9:16: el área solo cambia qué se ve en su mitad.
    if (this.a.vertical || !vp?.videoWidth || !this.lienzo) return;
    const r = area ? areaEnPixeles(area, vp.videoWidth, vp.videoHeight) : null;
    this.lienzo.width = r ? r.sw : vp.videoWidth;
    this.lienzo.height = r ? r.sh : vp.videoHeight;
    this.ancho = this.lienzo.width;
    this.alto = this.lienzo.height;
  }

  constructor(
    private a: Ajustes,
    private ev: Eventos = {},
  ) {
    // Se sabe desde el principio: el servidor crea el video con este formato antes de empezar a grabar.
    if (typeof MediaRecorder !== 'undefined') this.tipo = tipoDeGrabacion(undefined, a.calidad);
  }

  /** true si se comparte la pantalla completa (ahí Pantalay mismo sale en el video al volver a dibujar). */
  pantallaCompleta(): boolean {
    const p = this.flujos[0]?.getVideoTracks()[0];
    return (
      this.a.modo !== 'camara' &&
      (p?.getSettings() as { displaySurface?: string } | undefined)?.displaySurface === 'monitor'
    );
  }

  /** Segundos grabados (sin contar las pausas). */
  tiempo(): number {
    return this.acumulado + (this.pausada || !this.desde ? 0 : (performance.now() - this.desde) / 1000);
  }

  /** Pide permisos y prepara los flujos. Lanza si la persona niega el permiso. */
  async preparar(): Promise<MediaStream> {
    const alto = ALTO[this.a.calidad];
    let pantalla: MediaStream | null = null;
    let camara: MediaStream | null = null;
    let micro: MediaStream | null = null;

    if (this.a.modo !== 'camara') {
      pantalla = await navigator.mediaDevices.getDisplayMedia({
        // «monitor» deja preseleccionada la pantalla completa en Chrome: así salen también los programas instalados.
        video: { height: { ideal: alto }, frameRate: { ideal: 30 }, displaySurface: 'monitor' },
        // Sonido de la computadora (videos, música, reuniones): SIN los filtros de voz, que lo apagan.
        audio: this.a.audioSistema
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              suppressLocalAudioPlayback: false,
            }
          : false,
        systemAudio: this.a.audioSistema ? 'include' : 'exclude',
        selfBrowserSurface: 'include',
        surfaceSwitching: 'include',
      } as DisplayMediaStreamOptions);
      this.flujos.push(pantalla);
      pantalla.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (this.grabador && this.grabador.state !== 'inactive') this.terminar('pantalla_cerrada');
      });
    }
    if (this.a.modo !== 'pantalla') {
      camara = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: this.a.camaraId ? { exact: this.a.camaraId } : undefined,
          // La cámara sola y el Short la usan grande (ocupa media pantalla o toda); la burbuja, chica.
          width: { ideal: this.a.modo === 'camara' || this.a.vertical ? Math.round((alto * 16) / 9) : 640 },
          height: { ideal: this.a.modo === 'camara' || this.a.vertical ? alto : 640 },
        },
        audio: false,
      });
      this.flujos.push(camara);
    }
    if (this.a.microfonoId) {
      micro = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.a.microfonoId !== 'default' ? { exact: this.a.microfonoId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.flujos.push(micro);
    }

    const pistasAudio = [...(pantalla?.getAudioTracks() ?? []), ...(micro?.getAudioTracks() ?? [])];
    // Todo el sonido pasa por UN mezclador: lo que mide la barrita es exactamente lo que se graba.
    let audio: MediaStreamTrack | null = null;
    if (pistasAudio.length) {
      this.audio = new AudioContext();
      // Un mezclador «suspendido» graba silencio: se despierta siempre.
      if (this.audio.state === 'suspended') await this.audio.resume().catch(() => undefined);
      const destino = this.audio.createMediaStreamDestination();
      // El medidor tiene que terminar en la salida (en silencio) para que el navegador lo procese siempre.
      const silencio = this.audio.createGain();
      silencio.gain.value = 0;
      silencio.connect(this.audio.destination);
      const conectar = (p: MediaStreamTrack | undefined, cual: 'micro' | 'sistema') => {
        if (!p || !this.audio) return;
        const fuente = this.audio.createMediaStreamSource(new MediaStream([p]));
        const medidor = this.audio.createAnalyser();
        medidor.fftSize = 512;
        fuente.connect(destino);
        fuente.connect(medidor);
        medidor.connect(silencio);
        this.medidores[cual] = medidor;
      };
      conectar(pantalla?.getAudioTracks()[0], 'sistema');
      conectar(micro?.getAudioTracks()[0], 'micro');
      audio = destino.stream.getAudioTracks()[0] ?? null;
    }
    // ¿Llegó el sonido de la computadora? Si se pidió y no vino, la página lo avisa.
    this.sinSonidoSistema = Boolean(pantalla && this.a.audioSistema && !pantalla.getAudioTracks().length);
    this.pistaMicro = micro?.getAudioTracks()[0] ?? null;
    this.pistaSistema = pantalla?.getAudioTracks()[0] ?? null;

    // Todo pasa por el lienzo (también la pantalla sola y la cámara sola): ahí se pintan los lápices.
    let video: MediaStreamTrack;
    this.pantallaCruda = pantalla;
    if (pantalla && camara && this.a.vertical) {
      // Short vertical: la cámara SIEMPRE va dentro del video (en su mitad); la ventanita flotante, si está abierta,
      // muestra cómo va quedando el Short.
      this.camara = camara;
      video = await this.componer(pantalla, camara);
    } else if (pantalla && camara && this.a.flotante && this.ventanaFlotante) {
      // Modo flotante: la burbuja vive en su ventanita encima de todo y sale en la propia pantalla.
      this.camara = camara;
      // Pero si se compartió UNA pestaña o UNA ventana, la ventanita queda fuera de lo que se graba: entonces la
      // cámara se pinta dentro del video (la ventanita queda solo para verse uno mismo).
      const s = pantalla.getVideoTracks()[0]?.getSettings() as { displaySurface?: string } | undefined;
      video = await this.componer(
        pantalla,
        s?.displaySurface && s.displaySurface !== 'monitor' ? camara : null,
      );
    } else if (pantalla) video = await this.componer(pantalla, camara);
    else video = await this.componer(camara!, null);
    this.previa = new MediaStream([video]);
    return new MediaStream(audio ? [video, audio] : [video]);
  }

  private async componer(pantalla: MediaStream, camara: MediaStream | null): Promise<MediaStreamTrack> {
    const vp = document.createElement('video');
    const vc = camara ? document.createElement('video') : null;
    const fuentes: [HTMLVideoElement, MediaStream][] = [[vp, pantalla]];
    if (vc && camara) fuentes.push([vc, camara]);
    for (const [v, s] of fuentes) {
      v.muted = true;
      v.playsInline = true;
      v.srcObject = s;
      await v.play();
    }
    this.videoPantalla = vp;
    this.videoCamara = vc;
    const s = pantalla.getVideoTracks()[0]!.getSettings();
    this.ancho = (s.width ?? vp.videoWidth) || 1920;
    this.alto = (s.height ?? vp.videoHeight) || 1080;
    const vertical = Boolean(this.a.vertical && vc);
    if (vertical) {
      const m = medidaVertical(this.a.calidad);
      this.ancho = m.ancho;
      this.alto = m.alto;
    }
    const lienzo = document.createElement('canvas');
    lienzo.width = this.ancho;
    lienzo.height = this.alto;
    this.lienzo = lienzo;
    const ctx = lienzo.getContext('2d')!;
    const fija = document.createElement('canvas');
    const fctx = fija.getContext('2d')!;
    let ultimaFija = 0;
    // Qué parte de la pantalla va al video: toda, o el área elegida.
    const fuente = () =>
      this.area && vp.videoWidth
        ? areaEnPixeles(this.area, vp.videoWidth, vp.videoHeight)
        : { sx: 0, sy: 0, sw: vp.videoWidth, sh: vp.videoHeight };
    const dibujar = () => {
      if (
        !vertical &&
        !this.area &&
        vp.videoWidth &&
        (vp.videoWidth !== lienzo.width || vp.videoHeight !== lienzo.height)
      ) {
        // La ventana compartida cambió de tamaño: el lienzo la sigue.
        lienzo.width = vp.videoWidth;
        lienzo.height = vp.videoHeight;
      }
      const { sx, sy, sw, sh } = fuente();
      const ahora = performance.now();
      // Mientras la persona está en OTRO programa se guarda una foto de su pantalla cada medio segundo.
      // Al volver a Pantalay para dibujar, «congelar» graba esa foto y no a Pantalay mismo (sin efecto espejo).
      if (vp.videoWidth && ahora - ultimaFija > 500 && (document.hidden || !document.hasFocus())) {
        fija.width = lienzo.width;
        fija.height = lienzo.height;
        if (sw && sh) fctx.drawImage(vp, sx, sy, sw, sh, 0, 0, fija.width, fija.height);
        ultimaFija = ahora;
      }
      const congelada = this.congelar && ultimaFija;
      if (vertical && vc) {
        this.pintarVertical(ctx, congelada ? fija : vp, congelada ? null : { sx, sy, sw, sh }, vc);
      } else {
        if (congelada) ctx.drawImage(fija, 0, 0, lienzo.width, lienzo.height);
        else if (sw && sh) ctx.drawImage(vp, sx, sy, sw, sh, 0, 0, lienzo.width, lienzo.height);
        if (vc) this.pintarBurbuja(ctx, vc, lienzo.width, lienzo.height);
      }
      pintar(ctx, this.pizarra, lienzo.width, lienzo.height, ahora);
      if (this.marca) this.pintarMarca(ctx, vertical);
    };
    const codigo = 'let t=setInterval(()=>postMessage(0),1000/30);onmessage=()=>clearInterval(t)';
    this.reloj = new Worker(URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' })));
    this.reloj.onmessage = dibujar;
    dibujar();
    return lienzo.captureStream(30).getVideoTracks()[0]!;
  }

  /** Short: lo compartido llena su mitad (recortado al centro, sin deformar) y la cámara la otra, en espejo. */
  private pintarVertical(
    ctx: CanvasRenderingContext2D,
    fuente: HTMLVideoElement | HTMLCanvasElement,
    recorte: { sx: number; sy: number; sw: number; sh: number } | null,
    vc: HTMLVideoElement,
  ) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const arriba = this.a.camaraArriba ?? true;
    const { camara, pantalla } = partesVertical(W, H, arriba, this.a.reparto ?? REPARTO_INICIAL);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const r = recorte ?? { sx: 0, sy: 0, sw: fuente.width, sh: fuente.height };
    if (r.sw && r.sh) {
      const c = cubrir(r.sw, r.sh, pantalla.w, pantalla.h);
      ctx.drawImage(fuente, r.sx + c.x, r.sy + c.y, c.w, c.h, pantalla.x, pantalla.y, pantalla.w, pantalla.h);
    }
    if (vc.videoWidth) {
      const c = cubrir(vc.videoWidth, vc.videoHeight, camara.w, camara.h);
      ctx.save();
      ctx.translate(camara.x + camara.w, camara.y);
      ctx.scale(-1, 1);
      ctx.drawImage(vc, c.x, c.y, c.w, c.h, 0, 0, camara.w, camara.h);
      ctx.restore();
    }
    // Línea fina entre las dos partes: separa sin robar espacio.
    const linea = Math.max(2, Math.round(H * 0.002));
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, (arriba ? camara.h : pantalla.h) - linea / 2, W, linea);
  }

  /** true si este video es un Short vertical (cámara dentro, 9:16). */
  esVertical(): boolean {
    return Boolean(this.a.vertical && this.videoCamara);
  }

  /**
   * Marca de agua grabada en la imagen: logo + «pantalay.com», gris y discreta. En el Short va sobre la cámara (la
   * parte que es nuestra); en lo demás, abajo a la derecha.
   */
  private pintarMarca(ctx: CanvasRenderingContext2D, vertical: boolean) {
    if (!this.logo) {
      this.logo = new Image();
      this.logo.src = '/icon.png';
    }
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const zona = vertical
      ? partesVertical(W, H, this.a.camaraArriba ?? true, this.a.reparto ?? REPARTO_INICIAL).camara
      : { x: 0, y: 0, w: W, h: H };
    const m = marcaEn(zona, Math.min(W, H));
    ctx.save();
    ctx.font = `700 ${m.letra}px Inter, system-ui, sans-serif`;
    const texto = 'pantalay.com';
    const ancho = m.icono + m.espacio + ctx.measureText(texto).width + m.relleno * 2;
    const alto = m.icono + m.relleno;
    const x = zona.x + zona.w - m.margen - ancho;
    const y = zona.y + zona.h - m.margen - alto;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(x, y, ancho, alto, alto / 2);
    ctx.fill();
    if (this.logo.complete && this.logo.naturalWidth) {
      ctx.filter = 'grayscale(1) brightness(1.6)';
      ctx.drawImage(this.logo, x + m.relleno, y + m.relleno / 2, m.icono, m.icono);
      ctx.filter = 'none';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, x + m.relleno + m.icono + m.espacio, y + alto / 2);
    ctx.restore();
  }

  /** En la preparación del Short: cámara arriba o abajo y cuánto ocupa (se ve al instante). */
  ajustarVertical(cambios: { camaraArriba?: boolean; reparto?: number }) {
    this.a = { ...this.a, ...cambios };
  }

  private pintarBurbuja(ctx: CanvasRenderingContext2D, vc: HTMLVideoElement, ancho: number, alto: number) {
    const { x, y, ancho: bw, alto: bh } = posicionBurbuja(ancho, alto, this.a);
    const cw = vc.videoWidth || 1;
    const chh = vc.videoHeight || 1;
    // Recorte centrado de la cámara con la proporción de la burbuja.
    const escala = Math.min(cw / bw, chh / bh);
    const sw = bw * escala;
    const sh = bh * escala;
    const forma = () => {
      ctx.beginPath();
      if (this.a.burbujaForma === 'circulo') ctx.arc(x + bw / 2, y + bh / 2, bw / 2, 0, Math.PI * 2);
      else ctx.roundRect(x, y, bw, bh, Math.min(bw, bh) * 0.14);
    };
    ctx.save();
    forma();
    ctx.clip();
    // Espejo, como se ve uno en la cámara.
    ctx.translate(x + bw, y);
    ctx.scale(-1, 1);
    ctx.drawImage(vc, (cw - sw) / 2, (chh - sh) / 2, sw, sh, 0, 0, bw, bh);
    ctx.restore();
    if (this.a.bordeColores) {
      // Borde de colores (rosado, naranja, amarillo, lila) que va girando.
      const g = ctx.createConicGradient((performance.now() / 1000) * 2, x + bw / 2, y + bh / 2);
      for (const [i, c] of ['#ff4fa3', '#ff9f43', '#ffe14d', '#b46bff', '#ff4fa3'].entries())
        g.addColorStop(i / 4, c);
      ctx.save();
      ctx.lineWidth = Math.max(4, Math.min(bw, bh) * 0.035);
      ctx.strokeStyle = g;
      forma();
      ctx.stroke();
      ctx.restore();
    }
  }

  empezar(flujo: MediaStream) {
    const grabador = new MediaRecorder(flujo, {
      mimeType: this.tipo,
      videoBitsPerSecond: BITS[this.a.calidad],
      audioBitsPerSecond: 128_000,
    });
    grabador.ondataavailable = (e) => {
      if (e.data.size) this.ev.pedazo?.(e.data);
    };
    grabador.start(1000);
    this.grabador = grabador;
    this.desde = performance.now();
    this.acumulado = 0;
    this.pausada = false;
    if (this.a.transcribir) this.encenderVoz();
  }

  pausar() {
    if (this.grabador?.state !== 'recording') return;
    this.grabador.pause();
    this.acumulado = this.tiempo();
    this.pausada = true;
    this.apagarVoz();
  }

  continuar() {
    if (this.grabador?.state !== 'paused') return;
    this.grabador.resume();
    this.desde = performance.now();
    this.pausada = false;
    if (this.a.transcribir) this.encenderVoz();
  }

  /** Termina y espera el último pedazo. */
  terminar(motivo: 'usuario' | 'pantalla_cerrada' = 'usuario'): Promise<number> {
    const duracion = this.tiempo();
    this.acumulado = duracion;
    this.pausada = true;
    this.apagarVoz();
    const g = this.grabador;
    return new Promise((ok) => {
      if (!g || g.state === 'inactive') {
        this.liberar();
        ok(duracion);
        return;
      }
      g.addEventListener(
        'stop',
        () => {
          this.liberar();
          this.ev.terminada?.(motivo);
          ok(duracion);
        },
        { once: true },
      );
      g.stop();
    });
  }

  /** Foto del momento actual para la miniatura. */
  async miniatura(): Promise<Blob | null> {
    const fuente = this.lienzo ?? this.videoPreviaParaFoto();
    if (!fuente) return null;
    const ancho = 640;
    const c = document.createElement('canvas');
    const w = 'videoWidth' in fuente ? fuente.videoWidth : fuente.width;
    const h = 'videoHeight' in fuente ? fuente.videoHeight : fuente.height;
    if (!w || !h) return null;
    c.width = ancho;
    c.height = Math.round((ancho * h) / w);
    c.getContext('2d')!.drawImage(fuente, 0, 0, c.width, c.height);
    return new Promise((ok) => c.toBlob((b) => ok(b), 'image/jpeg', 0.8));
  }

  private fotoVideo: HTMLVideoElement | null = null;
  private videoPreviaParaFoto(): HTMLVideoElement | null {
    if (!this.previa) return null;
    if (!this.fotoVideo) {
      const v = document.createElement('video');
      v.muted = true;
      v.srcObject = this.previa;
      void v.play();
      this.fotoVideo = v;
    }
    return this.fotoVideo;
  }

  private encenderVoz() {
    const w = globalThis as unknown as Record<string, new () => ReconocimientoVoz>;
    const Clase = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Clase) return;
    const voz = new Clase();
    voz.continuous = true;
    voz.interimResults = true;
    voz.lang = this.a.idiomaVoz;
    voz.onresult = (e) => {
      let parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        const texto = r[0].transcript.trim();
        if (this.inicioFrase === null) this.inicioFrase = Math.max(0, this.tiempo() - 0.8);
        if (r.isFinal) {
          if (texto)
            this.segmentos.push({ inicio: this.inicioFrase, fin: this.tiempo(), texto: mayuscula(texto) });
          this.inicioFrase = null;
        } else parcial += texto + ' ';
      }
      this.ev.texto?.(this.segmentos, parcial.trim());
    };
    // El reconocimiento se apaga solo tras un silencio: se vuelve a encender mientras se graba.
    voz.onend = () => {
      if (this.vozActiva) {
        try {
          voz.start();
        } catch {
          /* ya estaba encendido */
        }
      }
    };
    voz.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.vozActiva = false;
    };
    this.voz = voz;
    this.vozActiva = true;
    try {
      voz.start();
    } catch (e) {
      console.error('reconocimiento de voz no arrancó', e);
    }
  }

  private apagarVoz() {
    this.vozActiva = false;
    try {
      this.voz?.stop();
    } catch {
      /* ya estaba apagado */
    }
    this.voz = null;
    this.inicioFrase = null;
  }

  liberar() {
    this.reloj?.postMessage('fin');
    this.reloj?.terminate();
    this.reloj = null;
    for (const f of this.flujos) for (const p of f.getTracks()) p.stop();
    this.flujos = [];
    void this.audio?.close();
    this.audio = null;
    for (const v of [this.videoPantalla, this.videoCamara, this.fotoVideo]) if (v) v.srcObject = null;
  }
}

function mayuscula(t: string): string {
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

export async function dispositivos(): Promise<{ camaras: MediaDeviceInfo[]; microfonos: MediaDeviceInfo[] }> {
  const lista = await navigator.mediaDevices.enumerateDevices();
  return {
    camaras: lista.filter((d) => d.kind === 'videoinput'),
    microfonos: lista.filter((d) => d.kind === 'audioinput'),
  };
}
