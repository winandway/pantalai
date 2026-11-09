// Probador de micrófono: barrita en vivo y un aviso claro cuando NO llega señal (apagado, sin batería, desconectado
// o mal elegido). Escucha el micrófono aparte y SIN filtros de voz: así un micrófono vivo siempre trae algo de ruido
// y uno muerto entrega ceros. Candado C-PROBADOR-MICROFONO.
import { useEffect, useState } from 'react';
import { useIdioma } from '../logica/idioma';
import { VigiaMicrofono, nivelDe, picoDe, type EstadoMicrofono } from '../logica/microfono';

const TEXTOS = {
  en: {
    microfono: 'Microphone',
    probando: 'Testing your microphone… say something.',
    llega: 'Sound is coming in',
    sinSenal:
      'No signal from your microphone. Check that it is on (or charged), plugged in and chosen in your browser.',
    sinMicrofono:
      'We could not find your microphone. Check that it is plugged in and that your browser has permission to use it.',
  },
  es: {
    microfono: 'Micrófono',
    probando: 'Probando tu micrófono… di algo.',
    llega: 'Llega sonido',
    sinSenal:
      'No llega señal de tu micrófono. Revisa que esté encendido (o cargado), bien conectado y elegido en el navegador.',
    sinMicrofono:
      'No encontramos tu micrófono. Revisa que esté conectado y que el navegador tenga permiso para usarlo.',
  },
};

/** `compacto`: solo aparece cuando hay un problema (para la barra de grabación). */
export function ProbadorMicrofono({
  microfonoId = 'default',
  compacto = false,
}: {
  microfonoId?: string;
  compacto?: boolean;
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
      </span>
    </div>
  );
}
