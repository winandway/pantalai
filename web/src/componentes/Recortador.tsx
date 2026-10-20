// Recortador de puntas, como el de los reels: tira de fotogramas con una agarradera a cada lado.
// Se arrastra el inicio y el final, se prueba con «Reproducir recorte» y se guarda.
// Al descargar o enviar, el video ya sale sin las puntas (la copia MP4 se arma con el recorte).
import { useEffect, useRef, useState } from 'react';
import { archivoVideo } from '../logica/api';
import { useIdioma } from '../logica/idioma';
import { marcasRegla, moverAgarradera, segundoEn, segundosDeFotos } from '../logica/recorte';
import { formatoTiempo } from '../logica/tiempo';

const FOTOS = 12;

/** Saca las fotos de la tira de una en una, en segundo plano. */
function useFotos(id: string, duracion: number): (string | null)[] {
  const [fotos, setFotos] = useState<(string | null)[]>(() => Array(FOTOS).fill(null));
  useEffect(() => {
    let vivo = true;
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.crossOrigin = 'use-credentials';
    v.src = `${archivoVideo(id)}?formato=webm`;
    const c = document.createElement('canvas');
    const ir = (s: number) =>
      new Promise<boolean>((ok) => {
        const listo = () => ok(true);
        v.addEventListener('seeked', listo, { once: true });
        setTimeout(() => {
          v.removeEventListener('seeked', listo);
          ok(false);
        }, 5000);
        v.currentTime = s;
      });
    void (async () => {
      await new Promise((ok) => {
        v.addEventListener('loadeddata', ok, { once: true });
        v.addEventListener('error', ok, { once: true });
        setTimeout(ok, 8000);
      });
      if (!v.videoWidth) return;
      c.height = 72;
      c.width = Math.round((72 * v.videoWidth) / v.videoHeight);
      const ctx = c.getContext('2d')!;
      for (const [i, s] of segundosDeFotos(duracion, FOTOS).entries()) {
        if (!vivo) return;
        if (!(await ir(s))) continue;
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/jpeg', 0.7);
        setFotos((f) => f.map((x, j) => (j === i ? url : x)));
      }
    })();
    return () => {
      vivo = false;
      v.removeAttribute('src');
      v.load();
    };
  }, [id, duracion]);
  return fotos;
}

export function Recortador({
  id,
  duracion,
  inicio,
  fin,
  ahora,
  cambiar,
  ir,
  reproducir,
  pausar,
}: {
  id: string;
  duracion: number;
  inicio: number;
  fin: number;
  /** Segundo que está sonando en el reproductor. */
  ahora: number;
  cambiar: (r: { inicio: number; fin: number }) => void;
  ir: (s: number) => void;
  reproducir: () => void;
  pausar: () => void;
}) {
  const { t } = useIdioma();
  const fotos = useFotos(id, duracion);
  const tira = useRef<HTMLDivElement>(null);
  const [probando, setProbando] = useState(false);
  const pct = (s: number) => `${(s / Math.max(duracion, 0.001)) * 100}%`;

  // «Reproducir recorte»: arranca en el inicio y se para solo en el final.
  useEffect(() => {
    if (probando && ahora >= fin - 0.05) {
      pausar();
      setProbando(false);
    }
  }, [probando, ahora, fin, pausar]);

  function arrastrar(cual: 'inicio' | 'fin', e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const caja = tira.current?.getBoundingClientRect();
    if (!caja) return;
    setProbando(false);
    pausar();
    // Se lleva la cuenta aquí: mientras se arrastra, los valores de la pantalla llegan con un cuadro de atraso.
    let actual = { inicio, fin };
    const mover = (m: PointerEvent) => {
      actual = moverAgarradera(
        cual,
        segundoEn(m.clientX - caja.left, caja.width, duracion),
        actual.inicio,
        actual.fin,
        duracion,
      );
      cambiar(actual);
      ir(cual === 'inicio' ? actual.inicio : actual.fin);
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  function teclas(cual: 'inicio' | 'fin', e: React.KeyboardEvent) {
    const paso = e.shiftKey ? 1 : 0.1;
    const delta = e.key === 'ArrowLeft' ? -paso : e.key === 'ArrowRight' ? paso : 0;
    if (!delta) return;
    e.preventDefault();
    const r = moverAgarradera(cual, (cual === 'inicio' ? inicio : fin) + delta, inicio, fin, duracion);
    cambiar(r);
    ir(cual === 'inicio' ? r.inicio : r.fin);
  }

  return (
    <div className="recortador">
      <div className="recortador-cabeza">
        <button
          type="button"
          className="boton secundario chico"
          onClick={() => {
            if (probando) {
              pausar();
              setProbando(false);
              return;
            }
            ir(inicio);
            reproducir();
            setProbando(true);
          }}
        >
          {probando ? `⏸ ${t('pausar')}` : `▶ ${t('reproducirRecorte')}`}
        </button>
        <span className="recortador-datos">
          {formatoTiempo(inicio)} → {formatoTiempo(fin)} ·{' '}
          <strong data-testid="duracion-recorte">{(fin - inicio).toFixed(1)} s</strong>
        </span>
        {(inicio > 0 || fin < duracion) && (
          <button
            type="button"
            className="enlace chico"
            onClick={() => cambiar({ inicio: 0, fin: duracion })}
          >
            {t('quitarRecorte')}
          </button>
        )}
      </div>
      <div className="recortador-regla" aria-hidden="true">
        {marcasRegla(duracion).map((s) => (
          <span key={s} style={{ left: pct(s) }}>
            {s >= 60 ? formatoTiempo(s) : `${s}s`}
          </span>
        ))}
      </div>
      <div
        ref={tira}
        className="recortador-tira"
        onPointerDown={(e) => {
          const caja = tira.current?.getBoundingClientRect();
          if (caja) ir(segundoEn(e.clientX - caja.left, caja.width, duracion));
        }}
      >
        <div className="recortador-fotos">
          {fotos.map((f, i) => (
            <span key={i} style={f ? { backgroundImage: `url(${f})` } : undefined} />
          ))}
        </div>
        <div className="recortador-fuera" style={{ left: 0, width: pct(inicio) }} />
        <div className="recortador-fuera" style={{ left: pct(fin), right: 0 }} />
        <div className="recortador-marco" style={{ left: pct(inicio), width: pct(fin - inicio) }}>
          <span className="recortador-largo">{(fin - inicio).toFixed(1)} s</span>
        </div>
        <button
          type="button"
          className="recortador-agarradera inicio"
          style={{ left: pct(inicio) }}
          role="slider"
          aria-label={t('inicioVideo')}
          aria-valuemin={0}
          aria-valuemax={duracion}
          aria-valuenow={inicio}
          aria-valuetext={formatoTiempo(inicio)}
          onPointerDown={(e) => arrastrar('inicio', e)}
          onKeyDown={(e) => teclas('inicio', e)}
        />
        <button
          type="button"
          className="recortador-agarradera fin"
          style={{ left: pct(fin) }}
          role="slider"
          aria-label={t('finVideo')}
          aria-valuemin={0}
          aria-valuemax={duracion}
          aria-valuenow={fin}
          aria-valuetext={formatoTiempo(fin)}
          onPointerDown={(e) => arrastrar('fin', e)}
          onKeyDown={(e) => teclas('fin', e)}
        />
        <div className="recortador-cabezal" style={{ left: pct(Math.min(ahora, duracion)) }} />
      </div>
      <p className="ayuda">{t('recortadorAyuda')}</p>
    </div>
  );
}
