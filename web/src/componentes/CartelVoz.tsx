// Cartel «Hablando / Escuchando» con barras de sonido (CANDADO C-HABLANDO, fase 4). Va DENTRO del escenario, así sale
// en la grabación. El nivel se mide aparte con un analizador (no toca la mezcla ni la grabadora).
import { useEffect, useRef, useState } from 'react';
import { DetectorVoz, alturasBarras, nivelDeMuestras } from '../logica/voz';

/** Nivel (0 a 1) y «hablando» de un sonido en vivo (el micrófono del anfitrión o la voz del invitado). */
export function useVoz(flujo: MediaStream | null): { nivel: number; hablando: boolean } {
  const [estado, setEstado] = useState({ nivel: 0, hablando: false });
  useEffect(() => {
    if (!flujo || !flujo.getAudioTracks().length) {
      setEstado({ nivel: 0, hablando: false });
      return;
    }
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const fuente = ctx.createMediaStreamSource(flujo);
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 1024;
    fuente.connect(analizador);
    const datos = new Uint8Array(analizador.fftSize);
    const detector = new DetectorVoz();
    // El navegador deja el sonido «dormido» hasta el primer toque en la página.
    const despertar = () => void ctx.resume().catch(() => undefined);
    document.addEventListener('pointerdown', despertar);
    despertar();
    let ultimo = { nivel: -1, hablando: false };
    const id = window.setInterval(() => {
      analizador.getByteTimeDomainData(datos);
      const nivel = Math.round(nivelDeMuestras(datos) * 20) / 20;
      const hablando = detector.actualizar(nivel, performance.now());
      // Solo se repinta si algo cambió (20 veces por segundo como mucho).
      if (nivel !== ultimo.nivel || hablando !== ultimo.hablando) {
        ultimo = { nivel, hablando };
        setEstado(ultimo);
      }
    }, 50);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('pointerdown', despertar);
      fuente.disconnect();
      void ctx.close().catch(() => undefined);
    };
  }, [flujo]);
  return estado;
}

export function CartelVoz({
  nivel,
  hablando,
  textos,
  quien,
}: {
  nivel: number;
  hablando: boolean;
  textos: { hablando: string; escuchando: string };
  quien: 'anfitrion' | 'invitado';
}) {
  const fase = useRef(0);
  fase.current += 0.9;
  return (
    <span
      className={`cartel-voz${hablando ? ' hablando' : ''}`}
      data-voz={quien}
      data-hablando={hablando ? '1' : '0'}
      aria-hidden="true"
    >
      <span className="barras-voz">
        {alturasBarras(nivel, 4, fase.current).map((a, i) => (
          <i key={i} style={{ transform: `scaleY(${a})` }} />
        ))}
      </span>
      {hablando ? textos.hablando : textos.escuchando}
    </span>
  );
}
