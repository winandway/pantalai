// Probador de micrófono: barrita en vivo y un aviso claro cuando NO llega señal (apagado, sin batería, desconectado
// o mal elegido). Escucha el micrófono aparte y SIN filtros de voz: así un micrófono vivo siempre trae algo de ruido
// y uno muerto entrega ceros. Candado C-PROBADOR-MICROFONO.
import { useEffect, useState } from 'react';
import { useIdioma } from '../logica/idioma';
import { PICO_SIN_SENAL, VigiaMicrofono, nivelDe, picoDe, type EstadoMicrofono } from '../logica/microfono';

/** Escucha un micrófono un momento (sin filtros) y devuelve su pico. 0 si no se pudo abrir. */
async function escucharUnMomento(deviceId: string, ms = 1300): Promise<number> {
  let flujo: MediaStream | null = null;
  const audio = new AudioContext();
  try {
    flujo = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    await audio.resume().catch(() => undefined);
    const medidor = audio.createAnalyser();
    medidor.fftSize = 32768;
    audio.createMediaStreamSource(flujo).connect(medidor);
    await new Promise((ok) => setTimeout(ok, ms));
    const muestras = new Float32Array(medidor.fftSize);
    medidor.getFloatTimeDomainData(muestras);
    return picoDe(muestras);
  } catch {
    return 0;
  } finally {
    flujo?.getTracks().forEach((p) => p.stop());
    void audio.close();
  }
}

const TEXTOS = {
  en: {
    microfono: 'Microphone',
    probando: 'Testing your microphone… say something.',
    llega: 'Sound is coming in',
    sinSenal:
      'No signal from your microphone. Check that it is on (or charged), plugged in and chosen in your browser.',
    sinMicrofono:
      'We could not find your microphone. Check that it is plugged in and that your browser has permission to use it.',
    buscando: 'Looking for another microphone with sound…',
    encontrado: 'This one does have sound:',
    usar: 'Use this microphone',
    ninguno:
      'None of your other microphones has sound either. Check the cable, the battery and that it is on.',
    elegirOtro: 'You can also choose another one in “Microphone”.',
  },
  es: {
    microfono: 'Micrófono',
    probando: 'Probando tu micrófono… di algo.',
    llega: 'Llega sonido',
    sinSenal:
      'No llega señal de tu micrófono. Revisa que esté encendido (o cargado), bien conectado y elegido en el navegador.',
    sinMicrofono:
      'No encontramos tu micrófono. Revisa que esté conectado y que el navegador tenga permiso para usarlo.',
    buscando: 'Buscando otro micrófono que sí tenga sonido…',
    encontrado: 'Este sí tiene sonido:',
    usar: 'Usar este micrófono',
    ninguno:
      'Ninguno de tus otros micrófonos tiene sonido tampoco. Revisa el cable, la batería y que esté encendido.',
    elegirOtro: 'También puedes elegir otro en «Micrófono».',
  },
};

/** `compacto`: solo aparece cuando hay un problema (para la barra de grabación). */
export function ProbadorMicrofono({
  microfonoId = 'default',
  compacto = false,
  microfonos = [],
  elegir,
}: {
  microfonoId?: string;
  compacto?: boolean;
  /** Los micrófonos conectados: si el elegido no tiene señal, se busca entre los demás uno que sí. */
  microfonos?: MediaDeviceInfo[];
  /** Cambia el micrófono elegido (botón «Usar este micrófono»). */
  elegir?: (deviceId: string) => void;
}) {
  const { idioma } = useIdioma();
  const tx = TEXTOS[idioma];
  const [nivel, setNivel] = useState(0);
  const [estado, setEstado] = useState<EstadoMicrofono>('probando');

  useEffect(() => {
    if (!microfonoId || !navigator.mediaDevices?.getUserMedia) return;
    let vivo = true;
    let flujo: MediaStream | null = null;
    let audio: AudioContext | null = null;
    let reloj = 0;
    const despertar = () => void audio?.resume().catch(() => undefined);
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: microfonoId !== 'default' ? { exact: microfonoId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((p) => p.stop());
        flujo = f;
        const pista = f.getAudioTracks()[0];
        pista?.addEventListener('ended', () => vivo && setEstado('sin_microfono'));
        audio = new AudioContext();
        const medidor = audio.createAnalyser();
        // Ventana larga (unos 0,7 s): cada lectura cubre todo lo que sonó desde la anterior, sin perder un sonido corto.
        medidor.fftSize = 32768;
        audio.createMediaStreamSource(f).connect(medidor);
        const muestras = new Float32Array(medidor.fftSize);
        const vigia = new VigiaMicrofono();
        // El navegador puede dejar el sonido «dormido» hasta el primer toque: se despierta con cualquier clic o tecla.
        window.addEventListener('pointerdown', despertar);
        window.addEventListener('keydown', despertar);
        despertar();
        reloj = window.setInterval(() => {
          if (!audio || audio.state !== 'running') return; // dormido: no se juzga (no es falta de señal)
          medidor.getFloatTimeDomainData(muestras);
          // La barrita mira solo lo último (para que se mueva con la voz); el vigía mira la ventana entera.
          setNivel(nivelDe(muestras.subarray(muestras.length - 2048)));
          setEstado((e) => (e === 'sin_microfono' ? e : vigia.leer(picoDe(muestras), performance.now())));
        }, 100);
      })
      .catch((e) => {
        console.error('probador: sin micrófono', e);
        if (vivo) setEstado('sin_microfono');
      });
    return () => {
      vivo = false;
      window.clearInterval(reloj);
      window.removeEventListener('pointerdown', despertar);
      window.removeEventListener('keydown', despertar);
      flujo?.getTracks().forEach((p) => p.stop());
      void audio?.close();
    };
  }, [microfonoId]);

  // Sin señal: se escucha un momento cada uno de los otros micrófonos y se ofrece el primero que sí suena.
  const [busqueda, setBusqueda] = useState<
    | { estado: 'buscando' }
    | { estado: 'encontrado'; id: string; nombre: string }
    | { estado: 'ninguno' }
    | null
  >(null);
  const otros = microfonos.filter(
    (d) => d.deviceId && d.deviceId !== microfonoId && d.deviceId !== 'default',
  );
  const hayOtros = otros.length > 0;
  useEffect(() => setBusqueda(null), [microfonoId]);
  useEffect(() => {
    if (estado !== 'sin_senal' || !elegir || !hayOtros || busqueda) return;
    let vivo = true;
    setBusqueda({ estado: 'buscando' });
    void (async () => {
      for (const d of otros) {
        const pico = await escucharUnMomento(d.deviceId);
        if (!vivo) return;
        if (pico >= PICO_SIN_SENAL) {
          setBusqueda({ estado: 'encontrado', id: d.deviceId, nombre: d.label || d.deviceId.slice(0, 8) });
          return;
        }
      }
      if (vivo) setBusqueda({ estado: 'ninguno' });
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, elegir, hayOtros, microfonoId]);

  const problema = estado === 'sin_senal' || estado === 'sin_microfono';
  if (compacto && !problema) return null;
  return (
    <div className={`probador-micro${problema ? ' con-problema' : ''}`} data-estado={estado}>
      {!compacto && (
        <span className="probador-micro-medidor">
          🎤 {tx.microfono}
          <span className="nivel-barra" aria-hidden="true">
            <span style={{ width: `${Math.round(nivel * 100)}%` }} />
          </span>
        </span>
      )}
      <span className="probador-micro-texto" role={problema ? 'alert' : 'status'}>
        {estado === 'sin_senal'
          ? `⚠️ ${tx.sinSenal}`
          : estado === 'sin_microfono'
            ? `⚠️ ${tx.sinMicrofono}`
            : estado === 'llega'
              ? `✓ ${tx.llega}`
              : tx.probando}
        {problema && elegir && hayOtros && !busqueda && ` ${tx.elegirOtro}`}
      </span>
      {problema && busqueda && (
        <span className="probador-micro-busqueda" role="status">
          {busqueda.estado === 'buscando' && tx.buscando}
          {busqueda.estado === 'ninguno' && tx.ninguno}
          {busqueda.estado === 'encontrado' && (
            <>
              {tx.encontrado} <b>{busqueda.nombre}</b>{' '}
              <button type="button" className="boton" onClick={() => elegir?.(busqueda.id)}>
                {tx.usar}
              </button>
            </>
          )}
        </span>
      )}
    </div>
  );
}
