// Lápices y colores para dibujar sobre la pantalla mientras se graba (como el dibujo de Loom).
// La capa va encima de la vista previa; lo que se dibuja lo pinta la grabadora en el video.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { aCoordenadas, COLORES, NOMBRE_COLOR, type Grosor, type Herramienta } from '../logica/dibujo';
import type { Grabadora } from '../logica/grabadora';
import { useIdioma } from '../logica/idioma';

export type EstadoLapices = {
  activo: boolean;
  herramienta: Herramienta;
  color: string;
  grosor: Grosor;
  desvanecer: boolean;
  congelar: boolean;
};

/** «etapa» cambia cuando arranca una grabación nueva, para pasarle los ajustes a esa grabadora. */
export function useLapices(grabadora: RefObject<Grabadora | null>, etapa: string) {
  const [l, setL] = useState<EstadoLapices>({
    activo: false,
    herramienta: 'lapiz',
    color: COLORES[0],
    grosor: 'medio',
    desvanecer: false,
    congelar: true,
  });
  // La grabadora lee lo que necesita en cada cuadro.
  useEffect(() => {
    const g = grabadora.current;
    if (!g) return;
    g.pizarra.desvanecer = l.desvanecer;
    // Congelar solo hace falta con la pantalla completa: con una pestaña o ventana se dibuja en vivo.
    g.congelar = l.activo && l.congelar && g.pantallaCompleta();
  }, [grabadora, etapa, l.activo, l.desvanecer, l.congelar]);
  const cambiar = useCallback((x: Partial<EstadoLapices>) => setL((v) => ({ ...v, ...x })), []);
  return { l, cambiar };
}

/** La capa transparente encima de la vista previa que recibe el lápiz (mouse, dedo o lápiz óptico). */
export function CapaDibujo({
  l,
  grabadora,
  video,
}: {
  l: EstadoLapices;
  grabadora: RefObject<Grabadora | null>;
  video: RefObject<HTMLVideoElement | null>;
}) {
  const capa = useRef<HTMLDivElement>(null);
  if (!l.activo) return null;
  const punto = (e: React.PointerEvent) => {
    const v = video.current;
    const c = capa.current;
    if (!c) return null;
    return aCoordenadas(
      e.clientX,
      e.clientY,
      c.getBoundingClientRect(),
      v?.videoWidth ?? 0,
      v?.videoHeight ?? 0,
    );
  };
  return (
    <div
      ref={capa}
      className={`capa-dibujo herramienta-${l.herramienta}`}
      data-testid="capa-dibujo"
      onPointerDown={(e) => {
        const p = punto(e);
        if (!p || !grabadora.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        grabadora.current.pizarra.empezar(l.herramienta, l.color, l.grosor, p);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const p = punto(e);
        if (p) grabadora.current?.pizarra.mover(p);
      }}
      onPointerUp={() => grabadora.current?.pizarra.soltar(performance.now())}
      onPointerCancel={() => grabadora.current?.pizarra.soltar(performance.now())}
    />
  );
}

const HERRAMIENTAS: [Herramienta, string, string][] = [
  ['lapiz', '✏️', 'lapiz'],
  ['resaltador', '🖍️', 'resaltador'],
  ['flecha', '➜', 'flecha'],
  ['cuadro', '▭', 'cuadro'],
  ['circulo', '◯', 'circuloDibujo'],
];

/** La barra de lápices: herramienta, color, grosor, deshacer y borrar. */
export function BarraLapices({
  l,
  cambiar,
  grabadora,
  pantallaCompleta,
}: {
  l: EstadoLapices;
  cambiar: (x: Partial<EstadoLapices>) => void;
  grabadora: RefObject<Grabadora | null>;
  pantallaCompleta: boolean;
}) {
  const { t, idioma } = useIdioma();
  if (!l.activo) return null;
  return (
    <div className="barra-lapices" role="toolbar" aria-label={t('herramientasDibujo')}>
      <div className="grupo-lapices">
        {HERRAMIENTAS.map(([h, icono, clave]) => (
          <button
            key={h}
            type="button"
            className={`lapiz-boton ${l.herramienta === h ? 'activo' : ''}`}
            aria-pressed={l.herramienta === h}
            title={t(clave as 'lapiz')}
            aria-label={t(clave as 'lapiz')}
            onClick={() => cambiar({ herramienta: h })}
          >
            <span aria-hidden="true">{icono}</span>
          </button>
        ))}
      </div>
      <div className="grupo-lapices">
        {COLORES.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-boton ${l.color === c ? 'activo' : ''}`}
            style={{ background: c }}
            aria-pressed={l.color === c}
            aria-label={NOMBRE_COLOR[c]?.[idioma] ?? c}
            title={NOMBRE_COLOR[c]?.[idioma] ?? c}
            onClick={() => cambiar({ color: c })}
          />
        ))}
      </div>
      <div className="grupo-lapices">
        {(
          [
            ['fino', 'grosorFino', 4],
            ['medio', 'grosorMedio', 8],
            ['grueso', 'grosorGrueso', 13],
          ] as const
        ).map(([g, clave, px]) => (
          <button
            key={g}
            type="button"
            className={`lapiz-boton ${l.grosor === g ? 'activo' : ''}`}
            aria-pressed={l.grosor === g}
            aria-label={t(clave)}
            title={t(clave)}
            onClick={() => cambiar({ grosor: g })}
          >
            <span className="muestra-grosor" style={{ width: px, height: px, background: l.color }} />
          </button>
        ))}
      </div>
      <div className="grupo-lapices">
        <button
          type="button"
          className="boton secundario chico"
          onClick={() => grabadora.current?.pizarra.deshacer()}
        >
          ↶ {t('deshacer')}
        </button>
        <button
          type="button"
          className="boton secundario chico"
          onClick={() => grabadora.current?.pizarra.borrar()}
        >
          {t('borrarDibujo')}
        </button>
      </div>
      <label className="interruptor chico">
        <input
          type="checkbox"
          checked={l.desvanecer}
          onChange={(e) => cambiar({ desvanecer: e.target.checked })}
        />
        {t('desvanecer')}
      </label>
      {pantallaCompleta && (
        <label className="interruptor chico" title={t('congelarAyuda')}>
          <input
            type="checkbox"
            checked={l.congelar}
            onChange={(e) => cambiar({ congelar: e.target.checked })}
          />
          {t('congelar')}
        </label>
      )}
      <p className="ayuda ancho-total">{pantallaCompleta ? t('congelarAyuda') : t('dibujarAyuda')}</p>
    </div>
  );
}
