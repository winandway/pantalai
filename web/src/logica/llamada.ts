// Invitado remoto del Estudio (CANDADO C-INVITADO): la conexión directa (WebRTC) entre el anfitrión y su invitado.
// Saludo SIN goteo de candidatos: cada lado espera a juntar todas sus rutas y manda UNA descripción completa; el
// servidor solo guarda una oferta y una respuesta por intento (poquísimas escrituras). Las consultas cortas existen
// solo mientras se saludan: conectados, nadie pregunta nada al servidor.
import { ErrorApi, pedir as pedirReal } from './api';

export type EstadoLlamada =
  | 'esperando' // el anfitrión espera a su invitado / el invitado espera que el anfitrión lo deje pasar
  | 'conectando'
  | 'conectado'
  | 'caido' // se cayó la conexión: se reintenta solo
  | 'salio' // el invitado salió
  | 'vencida' // el enlace venció o lo cerraron
  | 'ocupada'; // otra persona ya está usando el enlace

export type Eventos = {
  estado: (e: EstadoLlamada, nombre: string | null) => void;
  remoto: (flujo: MediaStream | null) => void;
};

type Pedir = <T>(ruta: string, opciones?: RequestInit & { json?: unknown }) => Promise<T>;
export type Dependencias = {
  pedir: Pedir;
  Conexion: new (c: RTCConfiguration) => RTCPeerConnection;
  esperar: (ms: number) => Promise<void>;
  Flujo: new (pistas: MediaStreamTrack[]) => MediaStream;
};

const porDefecto = (): Dependencias => ({
  pedir: pedirReal,
  Conexion: RTCPeerConnection,
  esperar: (ms) => new Promise((ok) => setTimeout(ok, ms)),
  Flujo: MediaStream,
});

/** STUN público de Cloudflare (si el servidor no respondiera, al menos se intenta directo). */
export const STUN: RTCIceServer = { urls: ['stun:stun.cloudflare.com:3478'] };

/** Voz limpia en los dos lados: cancelación de eco, supresión de ruido y ganancia automática. */
export const VOZ = { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as const;

/** Servidores ICE renovados si los guardados tienen más de esto (la credencial TURN vive 2 h en el servidor). */
export const RENOVAR_ICE_MS = 60 * 60 * 1000;

/**
 * Si la conexión con el invitado queda caída este tiempo y él no vuelve a ofrecer, el anfitrión libera el asiento
 * (se le acabó la batería, cerró la pestaña sin despedirse). Más que lo que tarda el invitado en reintentar solo
 * (8 s esperando que vuelva sola + 2 s), para no cortarle la reconexión; y si vuelve después, retoma su asiento.
 */
export const LIBERAR_TRAS_MS = 20_000;

/** Mensaje del canal de datos cuando el invitado sale a propósito. */
export const ADIOS = 'adios';

/** Espera a que la conexión termine de juntar sus rutas (o hasta el tope: lo que haya, se manda). */
export function esperarRutas(pc: RTCPeerConnection, tope = 6000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((ok) => {
    const listo = () => {
      if (pc.iceGatheringState !== 'complete') return;
      pc.removeEventListener('icegatheringstatechange', listo);
      clearTimeout(reloj);
      ok();
    };
    const reloj = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', listo);
      ok();
    }, tope);
    pc.addEventListener('icegatheringstatechange', listo);
  });
}

/** Cada cuánto se pregunta durante el saludo: rápido al principio, más calmado si tarda. */
export function pausaConsulta(vuelta: number): number {
  return vuelta < 20 ? 1000 : 3000;
}

/** Espera antes de reintentar después de una caída (2, 4, 6… hasta 10 s). */
export function pausaReintento(n: number): number {
  return Math.min(10_000, 2000 * Math.max(1, n));
}

/** Asiento del invitado: 32 letras hexadecimales al azar. Con él vuelve a entrar al mismo puesto. */
export function nuevoAsiento(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** El enlace que se le manda al invitado (dirección en inglés). */
export function enlaceInvitado(origen: string, codigo: string): string {
  return `${origen.replace(/\/+$/, '')}/join/${codigo}`;
}

/** El código de una dirección «/join/<código>» (null si no es una invitación). */
export function codigoDeRuta(ruta: string): string | null {
  const m = /^\/join\/([a-z0-9]{32})\/?$/.exec(ruta);
  return m ? m[1]! : null;
}

function flujoDe(e: RTCTrackEvent, Flujo: Dependencias['Flujo']): MediaStream {
  return e.streams[0] ?? new Flujo([e.track]);
}

/** Lado del ANFITRIÓN: espera ofertas de su invitado y responde. Se usa desde el Estudio. */
export class SalaAnfitrion {
  private pc: RTCPeerConnection | null = null;
  private atendido = 0;
  private vivo = false;
  private ice: RTCIceServer[] = [STUN];
  private iceDesde = 0;
  private relojLiberar: ReturnType<typeof setTimeout> | null = null;
  /** Se puede acortar en las pruebas. */
  liberarTras = LIBERAR_TRAS_MS;
  nombre: string | null = null;
  estado: EstadoLlamada = 'esperando';

  constructor(
    readonly codigo: string,
    private pistas: () => MediaStreamTrack[],
    private ev: Eventos,
    private d: Dependencias = porDefecto(),
  ) {}

  private poner(e: EstadoLlamada) {
    this.estado = e;
    this.ev.estado(e, this.nombre);
  }

  private async pedirIce() {
    try {
      this.ice = (await this.d.pedir<{ iceServers: RTCIceServer[] }>('/datos/estudio/ice')).iceServers;
      this.iceDesde = Date.now();
    } catch (e) {
      console.error('invitado: sin servidores ICE, se intenta directo', e);
    }
  }

  async iniciar() {
    if (this.vivo) return;
    this.vivo = true;
    await this.pedirIce();
    this.poner('esperando');
    void this.bucle();
  }

  private async bucle() {
    let vuelta = 0;
    while (this.vivo) {
      // Conectados no se pregunta nada: el servidor solo se consulta mientras se saludan.
      if (this.estado !== 'conectado') await this.consultar();
      await this.d.esperar(this.estado === 'conectado' ? 1000 : pausaConsulta(vuelta++));
      if (this.estado === 'conectado') vuelta = 0;
    }
  }

  /** Una consulta: ¿llegó una oferta nueva? (solo lee). Se expone para las pruebas. */
  async consultar() {
    let r: { intento: number; nombre: string | null; oferta: string | null };
    try {
      r = await this.d.pedir(`/datos/estudio/invitado/${this.codigo}`);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) {
        this.vivo = false;
        this.cerrar();
        this.poner('vencida');
      }
      return;
    }
    // Se detuvo mientras la consulta iba en camino: no se arma una conexión (ni se toma el micrófono) para nadie.
    if (!this.vivo || !r.oferta || r.intento <= this.atendido) return;
    this.atendido = r.intento;
    this.nombre = r.nombre;
    await this.responder(r.oferta, r.intento);
  }

  private async responder(oferta: string, intento: number) {
    this.cerrar();
    // Credenciales del puente con más de una hora: se piden otras antes de responder.
    if (Date.now() - this.iceDesde > RENOVAR_ICE_MS) await this.pedirIce();
    if (!this.vivo || this.atendido !== intento) return;
    const pc = new this.d.Conexion({ iceServers: this.ice });
    this.pc = pc;
    const pistas = this.pistas();
    const flujo = new this.d.Flujo(pistas);
    for (const p of pistas) pc.addTrack(p, flujo);
    pc.ontrack = (e) => {
      if (this.pc === pc) this.ev.remoto(flujoDe(e, this.d.Flujo));
    };
    pc.ondatachannel = (e) => {
      e.channel.onmessage = (m) => {
        if (m.data === ADIOS && this.pc === pc) void this.seFue();
      };
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      const s = pc.connectionState;
      if (s === 'connected') {
        this.pararLiberar();
        this.poner('conectado');
      } else if (s === 'disconnected' || s === 'failed') {
        // El invitado vuelve a ofrecer solo; aquí se sigue esperando su oferta nueva. Si no vuelve, se libera.
        if (s === 'failed') this.ev.remoto(null);
        this.poner('caido');
        this.liberarSiNoVuelve(pc, intento);
      }
    };
    this.poner('conectando');
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: oferta });
      await pc.setLocalDescription(await pc.createAnswer());
      await esperarRutas(pc);
      await this.d.pedir(`/datos/estudio/invitado/${this.codigo}/respuesta`, {
        method: 'POST',
        json: { intento, sdp: pc.localDescription?.sdp ?? '' },
      });
    } catch (e) {
      // Una respuesta que llega tarde (el invitado ya mandó otra oferta) no es un error: se atiende la nueva.
      if (!(e instanceof ErrorApi && e.codigo === 'intento_viejo')) console.error('invitado: responder', e);
    }
  }

  /**
   * Caída: si en `liberarTras` la conexión no volvió y el invitado no ofreció de nuevo, se libera su asiento (el
   * servidor solo lo hace si el intento sigue siendo este). Si vuelve más tarde con su asiento, entra igual.
   */
  private liberarSiNoVuelve(pc: RTCPeerConnection, intento: number) {
    if (this.relojLiberar) return;
    this.relojLiberar = setTimeout(() => {
      this.relojLiberar = null;
      if (!this.vivo || this.pc !== pc || this.atendido !== intento || pc.connectionState === 'connected')
        return;
      this.cerrar();
      this.ev.remoto(null);
      this.poner('salio');
      void this.d
        .pedir(`/datos/estudio/invitado/${this.codigo}/liberar`, { method: 'POST', json: { intento } })
        .catch((e) => console.error('invitado: liberar tras la caída', e));
    }, this.liberarTras);
  }

  private pararLiberar() {
    if (this.relojLiberar) clearTimeout(this.relojLiberar);
    this.relojLiberar = null;
  }

  /** El invitado salió a propósito: el enlace queda libre para volver a entrar. */
  private async seFue() {
    this.cerrar();
    this.ev.remoto(null);
    this.poner('salio');
    await this.d
      .pedir(`/datos/estudio/invitado/${this.codigo}/liberar`, { method: 'POST' })
      .catch((e) => console.error('invitado: liberar', e));
  }

  /** Cambia la cámara o el micrófono que ve y oye el invitado, sin cortar la llamada. */
  cambiarPista(pista: MediaStreamTrack) {
    const s = this.pc?.getSenders().find((x) => x.track?.kind === pista.kind);
    if (s) void s.replaceTrack(pista).catch((e) => console.error('invitado: cambiar pista', e));
  }

  private cerrar() {
    this.pararLiberar();
    const pc = this.pc;
    this.pc = null;
    if (pc) {
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
  }

  detener() {
    this.vivo = false;
    this.cerrar();
  }
}

/** Lado del INVITADO: manda su oferta, espera la respuesta y, si se cae, vuelve a ofrecer solo. */
export class LlamadaInvitado {
  private pc: RTCPeerConnection | null = null;
  private canal: RTCDataChannel | null = null;
  private ice: RTCIceServer[] = [STUN];
  private intento = 0;
  private vivo = false;
  private caidas = 0;
  private relojCaida: ReturnType<typeof setTimeout> | null = null;
  estado: EstadoLlamada = 'esperando';
  /** Tope de reintentos seguidos (cada uno escribe 3 filas): después se ofrece «Volver a entrar». */
  static REINTENTOS_MAX = 8;

  constructor(
    readonly codigo: string,
    private asiento: string,
    private nombre: string,
    private local: MediaStream,
    private ev: Eventos,
    private d: Dependencias = porDefecto(),
  ) {}

  private poner(e: EstadoLlamada) {
    this.estado = e;
    this.ev.estado(e, this.nombre);
  }

  /** Servidores ICE (con credenciales TURN de 2 h). false si el enlace ya no existe. */
  private async pedirIce(): Promise<boolean> {
    try {
      this.ice = (
        await this.d.pedir<{ iceServers: RTCIceServer[] }>(`/datos/invitado/${this.codigo}/ice`)
      ).iceServers;
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) return false;
      // Sin internet o demasiados pedidos: se sigue con los que había.
      console.error('invitado: sin servidores ICE nuevos, se sigue con los de antes', e);
    }
    return true;
  }

  async unir() {
    this.vivo = true;
    this.caidas = 0;
    if (!(await this.pedirIce())) return this.poner('vencida');
    await this.ofrecer();
  }

  private async ofrecer() {
    if (!this.vivo) return;
    this.cerrar();
    const pc = new this.d.Conexion({ iceServers: this.ice });
    this.pc = pc;
    for (const p of this.local.getTracks()) pc.addTrack(p, this.local);
    this.canal = pc.createDataChannel('pantalay');
    pc.ontrack = (e) => {
      if (this.pc === pc) this.ev.remoto(flujoDe(e, this.d.Flujo));
    };
    pc.onconnectionstatechange = () => {
      if (this.pc === pc) this.alCambiar(pc.connectionState);
    };
    this.poner(this.caidas ? 'caido' : 'conectando');
    await pc.setLocalDescription(await pc.createOffer());
    await esperarRutas(pc);
    if (this.pc !== pc || !this.vivo) return;
    let intento: number;
    try {
      intento = (
        await this.d.pedir<{ intento: number }>(`/datos/invitado/${this.codigo}/oferta`, {
          method: 'POST',
          json: { nombre: this.nombre, asiento: this.asiento, sdp: pc.localDescription?.sdp ?? '' },
        })
      ).intento;
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) return this.terminar('vencida');
      if (e instanceof ErrorApi && e.codigo === 'ocupada') return this.terminar('ocupada');
      // Sin internet o demasiados intentos: se espera un poco y se vuelve a intentar.
      console.error('invitado: oferta', e);
      return this.reintentar();
    }
    this.intento = intento;
    if (!this.caidas) this.poner('esperando');
    await this.esperarRespuesta(pc, intento);
  }

  private async esperarRespuesta(pc: RTCPeerConnection, intento: number) {
    for (let vuelta = 0; this.vivo && this.pc === pc && this.intento === intento; vuelta++) {
      try {
        const r = await this.d.pedir<{ respuesta: string | null }>(
          `/datos/invitado/${this.codigo}/respuesta?intento=${intento}`,
          { headers: { 'x-asiento': this.asiento } },
        );
        if (r.respuesta && this.pc === pc) {
          this.poner('conectando');
          await pc.setRemoteDescription({ type: 'answer', sdp: r.respuesta });
          return;
        }
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 404) return this.terminar('vencida');
        if (e instanceof ErrorApi && e.codigo === 'ocupada') return this.terminar('ocupada');
      }
      await this.d.esperar(pausaConsulta(vuelta));
    }
  }

  private alCambiar(s: RTCPeerConnectionState) {
    if (s === 'connected') {
      if (this.relojCaida) clearTimeout(this.relojCaida);
      this.caidas = 0;
      this.poner('conectado');
    } else if (s === 'failed') void this.reintentar();
    else if (s === 'disconnected') {
      this.poner('caido');
      // A veces vuelve sola en unos segundos; si no, se vuelve a saludar.
      if (this.relojCaida) clearTimeout(this.relojCaida);
      const pc = this.pc;
      this.relojCaida = setTimeout(() => {
        if (this.pc === pc && pc?.connectionState !== 'connected') void this.reintentar();
      }, 8000);
    }
  }

  private async reintentar() {
    if (!this.vivo) return;
    this.caidas++;
    if (this.caidas > LlamadaInvitado.REINTENTOS_MAX) {
      this.cerrar();
      this.vivo = false;
      return this.poner('caido');
    }
    this.poner('caido');
    const pc = this.pc;
    await this.d.esperar(pausaReintento(this.caidas));
    if (this.pc !== pc || !this.vivo) return;
    // Credenciales del puente nuevas en cada reintento (las de antes pueden haber vencido: viven 2 h).
    if (!(await this.pedirIce())) return this.terminar('vencida');
    if (this.pc === pc) await this.ofrecer();
  }

  private terminar(e: EstadoLlamada) {
    this.vivo = false;
    this.cerrar();
    this.ev.remoto(null);
    this.poner(e);
  }

  /** ¿Se rindió después de muchos reintentos? (la página ofrece «Volver a entrar»). */
  rendida(): boolean {
    return !this.vivo && this.estado === 'caido';
  }

  /** Salir a propósito: se le avisa al anfitrión por el canal directo (sin escribir en el servidor). */
  salir() {
    try {
      if (this.canal?.readyState === 'open') this.canal.send(ADIOS);
    } catch {
      /* el canal ya se cerró: el anfitrión verá la caída */
    }
    this.terminar('salio');
  }

  private cerrar() {
    if (this.relojCaida) clearTimeout(this.relojCaida);
    const pc = this.pc;
    this.pc = null;
    this.canal = null;
    if (pc) {
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      // Se da un respiro para que el «adiós» alcance a salir antes de cerrar.
      setTimeout(() => pc.close(), 300);
    }
  }
}
