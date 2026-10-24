// «¿Qué parte quieres grabar?»: sobre la imagen de la pantalla compartida se marca un rectángulo con el mouse.
// Lo de afuera (el Dock, los íconos, la barra de arriba) no sale en el video. Se puede mover y estirar desde las
// esquinas, y la próxima vez aparece marcada la misma parte.
import { useEffect, useRef, useState } from 'react';
import {
  ajustarProporcion,
  areaEntre,
  areaValida,
  esquinaOpuesta,
  estirarArea,
  moverArea,
  rectConProporcion,
  type Esquina,
} from '../logica/area';
import type { Area } from '../logica/grabadora';
import { useIdioma } from '../logica/idioma';

type Arrastre =
  | { tipo: 'nueva'; desde: { x: number; y: number } }
  | { tipo: 'mover'; desde: { x: number; y: number }; area: Area }
  | { tipo: 'esquina'; esquina: Esquina };

export function ElegirArea({
  flujo,
  inicial,
  listo,
  proporcion,
  textos,
}: {
  flujo: MediaStream;
  inicial: Area | null | undefined;
  /** null = grabar toda la pantalla. */
  listo: (area: Area | null) => void;
  /** Forma fija del área (ancho / alto en píxeles), como la mitad del Short. Sin esto, la forma es libre. */
  proporcion?: number;
  textos?: { titulo: string; ayuda: string; boton: string };
}) {
  const { t } = useIdioma();
  const video = useRef<HTMLVideoElement>(null);
  const [area, setArea] = useState<Area | null>(areaValida(inicial) ? inicial : null);
  const [caja, setCaja] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // La forma fija en fracciones de lo compartido (depende de sus medidas en píxeles).
  const [rf, setRf] = useState<number | null>(null);
  const arrastre = useRef<Arrastre | null>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.srcObject = flujo;
    void v.play().catch(() => undefined);
    // Dónde se dibuja de verdad la pantalla dentro del recuadro (el video va «contain», con franjas).
    const medir = () => {
      if (!v.videoWidth) return;
      const r = v.getBoundingClientRect();
      const escala = Math.min(r.width / v.videoWidth, r.height / v.videoHeight);
      const w = v.videoWidth * escala;
      const h = v.videoHeight * escala;
      setCaja({ x: (r.width - w) / 2, y: (r.height - h) / 2, w, h });
      if (proporcion) {
        const forma = (proporcion * v.videoHeight) / v.videoWidth;
        setRf(forma);
        // El área de la vez anterior (o una al centro) ya con la forma del Short.
        setArea((x) => ajustarProporcion(x ?? inicial, forma));
      }
    };
    v.addEventListener('loadedmetadata', medir);
    v.addEventListener('resize', medir);
    window.addEventListener('resize', medir);
    medir();
    return () => {
      v.removeEventListener('loadedmetadata', medir);
      v.removeEventListener('resize', medir);
      window.removeEventListener('resize', medir);
    };
  }, [flujo]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && areaValida(area)) listo(area);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [area, listo]);

  const punto = (e: React.PointerEvent | PointerEvent) => {
    const r = video.current!.getBoundingClientRect();
    if (!caja) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left - caja.x) / caja.w)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top - caja.y) / caja.h)),
    };
  };

  function bajar(e: React.PointerEvent, a: Arrastre) {
    e.preventDefault();
    e.stopPropagation();
    arrastre.current = a;
    const mover = (m: PointerEvent) => {
      const p = punto(m);
      const d = arrastre.current;
      if (!d) return;
      if (d.tipo === 'nueva') setArea(rf ? rectConProporcion(d.desde, p, rf) : areaEntre(d.desde, p));
      else if (d.tipo === 'mover') setArea(moverArea(d.area, p.x - d.desde.x, p.y - d.desde.y));
      else
        setArea((x) =>
          x
            ? rf
              ? rectConProporcion(esquinaOpuesta(x, d.esquina), p, rf)
              : estirarArea(x, d.esquina, p)
            : x,
        );
    };
    const soltar = () => {
      arrastre.current = null;
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  const pct = (n: number) => `${n * 100}%`;
  return (
    <div
      className="elegir-area"
      role="dialog"
      aria-modal="true"
      aria-label={textos?.titulo ?? t('areaTitulo')}
    >
      <div className="elegir-area-cabeza">
        <div>
          <h2>{textos?.titulo ?? t('areaTitulo')}</h2>
          <p>{textos?.ayuda ?? t('areaAyuda')}</p>
        </div>
        <div className="fila-botones">
          <button type="button" className="boton secundario" onClick={() => listo(null)}>
            {t('areaToda')}
          </button>
          <button
            type="button"
            className="boton area-grabar"
            disabled={!areaValida(area)}
            onClick={() => areaValida(area) && listo(area)}
          >
            {textos?.boton ?? t('areaGrabar')}
          </button>
        </div>
      </div>
      <div className="elegir-area-pantalla">
        <video ref={video} muted playsInline />
        {caja && (
          <div
            className="elegir-area-lienzo"
            style={{ left: caja.x, top: caja.y, width: caja.w, height: caja.h }}
            onPointerDown={(e) => bajar(e, { tipo: 'nueva', desde: punto(e) })}
            data-testid="lienzo-area"
          >
            {area && (
              <>
                <div className="area-fuera" style={{ left: 0, top: 0, right: 0, height: pct(area.y) }} />
                <div
                  className="area-fuera"
                  style={{ left: 0, right: 0, top: pct(area.y + area.alto), bottom: 0 }}
                />
                <div
                  className="area-fuera"
                  style={{ left: 0, width: pct(area.x), top: pct(area.y), height: pct(area.alto) }}
                />
                <div
                  className="area-fuera"
                  style={{
                    left: pct(area.x + area.ancho),
                    right: 0,
                    top: pct(area.y),
                    height: pct(area.alto),
                  }}
                />
                <div
                  className="area-marco"
                  style={{
                    left: pct(area.x),
                    top: pct(area.y),
                    width: pct(area.ancho),
                    height: pct(area.alto),
                  }}
                  onPointerDown={(e) => bajar(e, { tipo: 'mover', desde: punto(e), area })}
                >
                  {(['no', 'ne', 'so', 'se'] as Esquina[]).map((q) => (
                    <span
                      key={q}
                      className={`area-esquina ${q}`}
                      onPointerDown={(e) => bajar(e, { tipo: 'esquina', esquina: q })}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
