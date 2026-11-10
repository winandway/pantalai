// Karaoke del Estudio (9 nov 2026, Richard: «la voz con un reverb bonito, como los lives de canto»). La cadena y los
// valores salen de docs/investigacion-rea/FICHA-KARAOKE.md: EQ de voz, compresor, reverb de 1,7 s con pre-delay de
// 25 ms y eco corto de 120 ms. Un solo control «Efecto» de 0 a 100 que arranca en 50. Candado C-KARAOKE.

/** Lo que se guarda del karaoke en el Estudio. */
export type AjustesKaraoke = { efecto: number; audifonos: boolean };

export const KARAOKE_DEFECTO: AjustesKaraoke = { efecto: 50, audifonos: true };

/** La música va 6 dB por debajo de la voz en la grabación (ganancia 0,5): la letra se entiende. */
export const MUSICA_KARAOKE = 0.5;

/** Tope duro de la retroalimentación del eco: con más, un grito podría crecer sin fin. */
export const RETRO_MAXIMA = 0.4;

const dbAGanancia = (db: number) => 10 ** (db / 20);
const entre = (a: number, b: number, t: number) => a + (b - a) * t;

/** Recorta el control a 0–100 (si llega algo raro, el valor por defecto). */
export function efectoValido(efecto: number): number {
  if (!Number.isFinite(efecto)) return KARAOKE_DEFECTO.efecto;
  return Math.min(100, Math.max(0, Math.round(efecto)));
}

export type ParametrosKaraoke = {
  /** Ganancia del reverb respecto a la voz seca (0 = apagado). */
  reverb: number;
  /** Ganancia del eco respecto a la voz seca (0 = apagado). */
  eco: number;
  /** Retroalimentación del eco (nunca más de RETRO_MAXIMA). */
  retro: number;
  /** Ratio del compresor de voz. */
  ratio: number;
  /** Realce de presencia (3 kHz) y aire (10 kHz), en dB. */
  brillo: number;
};

/** Los valores de cada etapa según el control «Efecto» (0 a 100). Se mueven en dB, nunca en ganancia lineal. */
export function parametrosKaraoke(efecto: number): ParametrosKaraoke {
  const t = efectoValido(efecto) / 100;
  return {
    reverb: t === 0 ? 0 : dbAGanancia(entre(-26, -2, t)),
    eco: t === 0 ? 0 : dbAGanancia(entre(-30, -10, t)),
    retro: Math.min(RETRO_MAXIMA, entre(0.12, 0.35, t)),
    ratio: entre(2, 4, t),
    brillo: t <= 0.5 ? entre(0.5, 2, t / 0.5) : entre(2, 3, (t - 0.5) / 0.5),
  };
}

/**
 * Las muestras del impulso del reverb: ruido con caída exponencial (cola de 1,7 s), suavizado arriba para que no
 * suene metálico. Determinístico (siempre el mismo sonido) y en estéreo (dos canales distintos = amplitud).
 */
export function muestrasImpulso(frecuencia: number, segundos = 1.7): [Float32Array, Float32Array] {
  const largo = Math.max(1, Math.round(frecuencia * segundos));
  const canales: [Float32Array, Float32Array] = [new Float32Array(largo), new Float32Array(largo)];
  // Generador fijo (no Math.random): el mismo reverb en cada grabación.
  let semilla = 0x9e3779b9;
  const azar = () => {
    semilla ^= semilla << 13;
    semilla ^= semilla >>> 17;
    semilla ^= semilla << 5;
    return ((semilla >>> 0) / 0xffffffff) * 2 - 1;
  };
  // Caída de 60 dB en «segundos»; pasa-bajos de un polo que se cierra con el tiempo (la cola se oscurece).
  const caida = Math.log(1000) / largo;
  for (const canal of canales) {
    let previo = 0;
    for (let i = 0; i < largo; i++) {
      const suave = 0.35 + 0.6 * (i / largo);
      previo = previo * suave + azar() * (1 - suave);
      canal[i] = previo * Math.exp(-caida * i);
    }
  }
  return canales;
}

/** Lo mínimo de Web Audio que usa la cadena (así se puede probar con un contexto simulado). */
type Contexto = Pick<
  BaseAudioContext,
  | 'createBiquadFilter'
  | 'createDynamicsCompressor'
  | 'createGain'
  | 'createDelay'
  | 'createConvolver'
  | 'createBuffer'
> & { currentTime: number; sampleRate: number };

export type CadenaKaraoke = {
  entrada: AudioNode;
  salida: AudioNode;
  /** Cambia el efecto en vivo (sin chasquidos). */
  ajustar: (efecto: number) => void;
};

/**
 * Arma la cadena de la voz: pasa-altos 100 Hz → corte de barro 300 Hz → presencia 3 kHz → aire 10 kHz → compresor →
 * voz seca, que se reparte en seco + reverb (pre-delay 25 ms, retorno entre 300 Hz y 6 kHz) + eco (120 ms con
 * retroalimentación, retorno entre 300 Hz y 3,5 kHz). Todo se suma en «salida».
 */
export function crearCadenaKaraoke(ctx: Contexto, efecto = KARAOKE_DEFECTO.efecto): CadenaKaraoke {
  const p = parametrosKaraoke(efecto);
  const filtro = (tipo: BiquadFilterType, hz: number, q = 0.707, db = 0) => {
    const f = ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = hz;
    f.Q.value = q;
    f.gain.value = db;
    return f;
  };
  const pasaAltos = filtro('highpass', 100);
  const barro = filtro('peaking', 300, 1, -2);
  const presencia = filtro('peaking', 3000, 0.9, p.brillo);
  const aire = filtro('highshelf', 10000, 0.707, p.brillo);
  const compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -24;
  compresor.knee.value = 12;
  compresor.ratio.value = p.ratio;
  compresor.attack.value = 0.01;
  compresor.release.value = 0.2;
  pasaAltos.connect(barro);
  barro.connect(presencia);
  presencia.connect(aire);
  aire.connect(compresor);

  const salida = ctx.createGain();
  compresor.connect(salida); // seco

  // Reverb.
  const revEntrada = filtro('highpass', 300);
  const revPre = ctx.createDelay(0.1);
  revPre.delayTime.value = 0.025;
  const sala = ctx.createConvolver();
  const [izq, der] = muestrasImpulso(ctx.sampleRate);
  const impulso = ctx.createBuffer(2, izq.length, ctx.sampleRate);
  impulso.copyToChannel(izq as Float32Array<ArrayBuffer>, 0);
  impulso.copyToChannel(der as Float32Array<ArrayBuffer>, 1);
  sala.normalize = true;
  sala.buffer = impulso;
  const revSalida = filtro('lowpass', 6000);
  const revNivel = ctx.createGain();
  revNivel.gain.value = p.reverb;
  compresor.connect(revEntrada);
  revEntrada.connect(revPre);
  revPre.connect(sala);
  sala.connect(revSalida);
  revSalida.connect(revNivel);
  revNivel.connect(salida);

  // Eco con retroalimentación (pasa-bajos dentro del lazo: cada repetición más oscura).
  const ecoEntrada = filtro('highpass', 300);
  const ecoRetardo = ctx.createDelay(1);
  ecoRetardo.delayTime.value = 0.12;
  const ecoOscuro = filtro('lowpass', 3500);
  const ecoRetro = ctx.createGain();
  ecoRetro.gain.value = p.retro;
  const ecoNivel = ctx.createGain();
  ecoNivel.gain.value = p.eco;
  compresor.connect(ecoEntrada);
  ecoEntrada.connect(ecoRetardo);
  ecoRetardo.connect(ecoOscuro);
  ecoOscuro.connect(ecoRetro);
  ecoRetro.connect(ecoRetardo);
  ecoOscuro.connect(ecoNivel);
  ecoNivel.connect(salida);

  return {
    entrada: pasaAltos,
    salida,
    ajustar: (valor) => {
      const n = parametrosKaraoke(valor);
      const ahora = ctx.currentTime;
      revNivel.gain.setTargetAtTime(n.reverb, ahora, 0.03);
      ecoNivel.gain.setTargetAtTime(n.eco, ahora, 0.03);
      ecoRetro.gain.setTargetAtTime(Math.min(RETRO_MAXIMA, n.retro), ahora, 0.03);
      compresor.ratio.setTargetAtTime(n.ratio, ahora, 0.03);
      presencia.gain.setTargetAtTime(n.brillo, ahora, 0.03);
      aire.gain.setTargetAtTime(n.brillo, ahora, 0.03);
    },
  };
}

/**
 * Cómo se pide el micrófono para cantar: sin supresión de ruido ni ganancia automática (le quitan el cuerpo a la voz
 * cantada y suben y bajan solas). La cancelación de eco se apaga solo con audífonos; con parlantes queda encendida
 * para que la música no entre por el micrófono y se duplique.
 */
export function restriccionesKaraoke(
  audifonos: boolean,
): Pick<MediaTrackConstraints, 'echoCancellation' | 'noiseSuppression' | 'autoGainControl'> {
  return { echoCancellation: !audifonos, noiseSuppression: false, autoGainControl: false };
}

/**
 * Cuánto se atrasa la música en la mezcla para que quede a tiempo con la voz: la persona oye la música con el
 * retraso de la salida y canta encima; el micrófono la recoge con su propio retraso. Tope de 0,3 s.
 */
export function atrasoMusica(salida: number, base: number): number {
  const s =
    (Number.isFinite(salida) ? Math.max(0, salida) : 0) + (Number.isFinite(base) ? Math.max(0, base) : 0);
  return Math.min(0.3, s);
}
