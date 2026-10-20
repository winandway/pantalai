// Motor de grabación en el navegador: pantalla, cámara (burbuja), micrófono y audio del sistema.
// Pantalla + cámara se componen en un lienzo con un reloj en un Worker: así sigue grabando
// aunque la pestaña de PANTALAI quede en segundo plano mientras grabas otra ventana.
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
  burbujaForma: 'circulo' | 'cuadrado';
  esquina: Esquina;
  transcribir: boolean;
  idiomaVoz: string; // 'en-US' | 'es-ES' ...
};

export const AJUSTES_INICIALES: Ajustes = {
  modo: 'pantalla_camara',
  camaraId: '',
  microfonoId: 'default',
  audioSistema: false,
  calidad: '1080',
  burbujaTamano: 'mediano',
  burbujaForma: 'circulo',
  esquina: 'abajo-izq',
  transcribir: true,
  idiomaVoz: 'en-US',
};

const ALTO: Record<Calidad, number> = { '720': 720, '1080': 1080, '2160': 2160 };
const BITS: Record<Calidad, number> = { '720': 2_500_000, '1080': 5_000_000, '2160': 16_000_000 };
const BURBUJA: Record<Ajustes['burbujaTamano'], number> = { chico: 0.16, mediano: 0.22, grande: 0.3 };

export function tipoDeGrabacion(
  soporta: (t: string) => boolean = (t) => MediaRecorder.isTypeSupported(t),
): string {
  const opciones = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a',
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

/** Dónde va la burbuja dentro del lienzo. */
export function posicionBurbuja(ancho: number, alto: number, a: Pick<Ajustes, 'burbujaTamano' | 'esquina'>) {
  const lado = Math.round(Math.min(ancho, alto) * BURBUJA[a.burbujaTamano]);
  const margen = Math.round(Math.min(ancho, alto) * 0.03);
  const x = a.esquina.endsWith('izq') ? margen : ancho - lado - margen;
  const y = a.esquina.startsWith('abajo') ? alto - lado - margen : margen;
  return { x, y, lado };
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
  private videoPantalla: HTMLVideoElement | null = null;
  private videoCamara: HTMLVideoElement | null = null;

  constructor(
    private a: Ajustes,
    private ev: Eventos = {},
  ) {}

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
        audio: this.a.audioSistema,
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
          width: { ideal: this.a.modo === 'camara' ? Math.round((alto * 16) / 9) : 640 },
          height: { ideal: this.a.modo === 'camara' ? alto : 640 },
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
    let audio: MediaStreamTrack | null = null;
    if (pistasAudio.length === 1) audio = pistasAudio[0]!;
    else if (pistasAudio.length > 1) {
      this.audio = new AudioContext();
      const destino = this.audio.createMediaStreamDestination();
      for (const p of pistasAudio) this.audio.createMediaStreamSource(new MediaStream([p])).connect(destino);
      audio = destino.stream.getAudioTracks()[0] ?? null;
    }

    let video: MediaStreamTrack;
    if (pantalla && camara) video = await this.componer(pantalla, camara);
    else {
      video = (pantalla ?? camara)!.getVideoTracks()[0]!;
      const s = video.getSettings();
      this.ancho = s.width ?? 0;
      this.alto = s.height ?? 0;
    }
    this.previa = new MediaStream([video]);
    return new MediaStream(audio ? [video, audio] : [video]);
  }

  private async componer(pantalla: MediaStream, camara: MediaStream): Promise<MediaStreamTrack> {
    const vp = document.createElement('video');
    const vc = document.createElement('video');
    for (const [v, s] of [
      [vp, pantalla],
      [vc, camara],
    ] as const) {
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
    const lienzo = document.createElement('canvas');
    lienzo.width = this.ancho;
    lienzo.height = this.alto;
    this.lienzo = lienzo;
    const ctx = lienzo.getContext('2d')!;
    const dibujar = () => {
      if (vp.videoWidth && (vp.videoWidth !== lienzo.width || vp.videoHeight !== lienzo.height)) {
        // La ventana compartida cambió de tamaño: el lienzo la sigue.
        lienzo.width = vp.videoWidth;
        lienzo.height = vp.videoHeight;
      }
      ctx.drawImage(vp, 0, 0, lienzo.width, lienzo.height);
      const { x, y, lado } = posicionBurbuja(lienzo.width, lienzo.height, this.a);
      const cw = vc.videoWidth || 1;
      const chh = vc.videoHeight || 1;
      const corte = Math.min(cw, chh);
      ctx.save();
      ctx.beginPath();
      if (this.a.burbujaForma === 'circulo') ctx.arc(x + lado / 2, y + lado / 2, lado / 2, 0, Math.PI * 2);
      else ctx.roundRect(x, y, lado, lado, lado * 0.12);
      ctx.clip();
      // Espejo, como se ve uno en la cámara.
      ctx.translate(x + lado, y);
      ctx.scale(-1, 1);
      ctx.drawImage(vc, (cw - corte) / 2, (chh - corte) / 2, corte, corte, 0, 0, lado, lado);
      ctx.restore();
    };
    const codigo = 'let t=setInterval(()=>postMessage(0),1000/30);onmessage=()=>clearInterval(t)';
    this.reloj = new Worker(URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' })));
    this.reloj.onmessage = dibujar;
    dibujar();
    return lienzo.captureStream(30).getVideoTracks()[0]!;
  }

  empezar(flujo: MediaStream) {
    this.tipo = tipoDeGrabacion();
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
