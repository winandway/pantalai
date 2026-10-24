// Recortador de puntas, como el de los reels: tira de fotogramas con una agarradera a cada lado.
// Se arrastra el inicio y el final, se prueba con «Reproducir recorte» y se guarda.
// Al descargar o enviar, el video ya sale sin las puntas (la copia MP4 se arma con el recorte).
import { useEffect, useRef, useState } from 'react';
import { archivoVideo } from '../logica/api';
import { useIdioma } from '../logica/idioma';
import { cuadroCercano, prepararCuadros, PUNTA, type Cuadro } from '../logica/cuadros';
import { marcasRegla, moverAgarradera, segundoEn, segundosDeFotos } from '../logica/recorte';
import { formatoTiempo } from '../logica/tiempo';

const FOTOS = 12;

/** Plan B (navegadores sin WebCodecs): las fotos de la tira con un video escondido, de una en una. */
function fotosConVideo(
  id: string,
  duracion: number,
  alFoto: (i: number, imagen: string) => void,
  vivo: () => boolean,
): () => void {
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
      if (!vivo()) return;
      if (!(await ir(s))) continue;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      alFoto(i, c.toDataURL('image/jpeg', 0.7));
    }
  })();
  return () => {
    v.removeAttribute('src');
    v.load();
  };
}

/** Fotos de la tira y el acelerador de las puntas (20 s de cada lado, un cuadro cada cuarto de segundo). */
function useCuadros(id: string, duracion: number) {
  const [fotos, setFotos] = useState<(string | null)[]>(() => Array(FOTOS).fill(null));
  const [progreso, setProgreso] = useState(0);
  const [acelerado, setAcelerado] = useState<boolean | null>(null);
  const cuadros = useRef<Cuadro[]>([]);
  useEffect(() => {
    let vivo = true;
    let soltarVideo: (() => void) | null = null;
    cuadros.current = [];
    setProgreso(0);
    setAcelerado(null);
    const alFoto = (i: number, imagen: string) => setFotos((f) => f.map((x, j) => (j === i ? imagen : x)));
    prepararCuadros(`${archivoVideo(id)}?formato=webm`, duracion, {
      fotos: segundosDeFotos(duracion, FOTOS),
      alFoto,
      alCuadro: (c) => cuadros.current.push(c),
      alProgreso: (p) => {
        setProgreso(p);
        setAcelerado(true);
      },
      vivo: () => vivo,
    }).catch((e: unknown) => {
      // Sin acelerador se sigue con el reproductor normal; el motivo queda en la consola, no se esconde.
      console.warn('recortador: sin acelerador de puntas', e);
      if (!vivo) return;
      setAcelerado(false);
      soltarVideo = fotosConVideo(id, duracion, alFoto, () => vivo);
    });
    return () => {
      vivo = false;
      soltarVideo?.();
    };
  }, [id, duracion]);
  return { fotos, progreso, acelerado, cuadroEn: (s: number) => cuadroCercano(cuadros.current, s) };
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
  previsualizar,
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
  /** Muestra un cuadro encima del reproductor mientras se arrastra (null = quitarlo). */
  previsualizar?: (c: { s: number; imagen: Blob } | null) => void;
}) {
  const { t } = useIdioma();
  const { fotos, progreso, acelerado, cuadroEn } = useCuadros(id, duracion);
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
    // Si el cuadro ya está preparado se muestra al instante; si no, se busca en el video, pero sin amontonar
    // búsquedas (una cada 200 ms): muchas seguidas se cancelan entre sí y la pantalla no llega a pintar nada.
    let ultimaBusqueda = 0;
    const mover = (m: PointerEvent) => {
      actual = moverAgarradera(
        cual,
        segundoEn(m.clientX - caja.left, caja.width, duracion),
        actual.inicio,
        actual.fin,
        duracion,
      );
      cambiar(actual);
      const s = cual === 'inicio' ? actual.inicio : actual.fin;
      const cuadro = cuadroEn(s);
      if (cuadro && previsualizar) {
        previsualizar(cuadro);
        return;
      }
      previsualizar?.(null);
      if (performance.now() - ultimaBusqueda > 200) {
        ultimaBusqueda = performance.now();
        ir(s);
      }
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      // Al soltar, el video queda justo donde quedó la agarradera.
      previsualizar?.(null);
      ir(cual === 'inicio' ? actual.inicio : actual.fin);
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
        {acelerado && (
          <span className="recortador-acelerador" role="status">
            {progreso < 1
              ? `${t('preparandoPuntas')} ${Math.round(progreso * 100)} %`
              : `⚡ ${t('puntasListas').replace('{n}', String(PUNTA))}`}
          </span>
        )}
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

/** El cuadro de la punta, pintado encima del video mientras se arrastra la agarradera. */
export function CuadroPrevio({ cuadro }: { cuadro: { s: number; imagen: Blob } }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let vivo = true;
    void createImageBitmap(cuadro.imagen).then((b) => {
      const c = lienzo.current;
      if (!vivo || !c) return b.close();
      c.width = b.width;
      c.height = b.height;
      c.getContext('2d')?.drawImage(b, 0, 0);
      b.close();
    });
    return () => {
      vivo = false;
    };
  }, [cuadro]);
  return (
    <div className="cuadro-previo" aria-hidden="true">
      <canvas ref={lienzo} />
      <span>{formatoTiempo(cuadro.s)}</span>
    </div>
  );
}
