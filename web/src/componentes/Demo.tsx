// Demo animada de la portada: un «videíto» hecho en la página (sin archivo de video, pesa casi nada).
// Cuenta la historia en 14 segundos: tocar Grabar → cuenta regresiva → grabando con la burbuja → dibujar con el
// lápiz → Terminar → el enlace está copiado y se comparte. Con «reducir movimiento» se muestra quieta.
import { useEffect, useState } from 'react';
import { useIdioma } from '../logica/idioma';

const DURACION = 14_000;

/** Lo que se ve en cada instante de la demo (t en milisegundos dentro del ciclo). */
export function escenaDemo(t: number) {
  const s = t / 1000;
  const entre = (a: number, b: number) => Math.min(1, Math.max(0, (s - a) / (b - a)));
  const cuenta = s >= 1.6 && s < 3.4 ? 3 - Math.floor((s - 1.6) / 0.6) : null;
  const grabando = s >= 3.4 && s < 10.2;
  return {
    // Posición del cursor (en % del cuadro).
    cursor:
      s < 1.4
        ? { x: 30 + 50 * entre(0.2, 1.4), y: 60 - 50 * entre(0.2, 1.4) }
        : s < 6
          ? { x: 80, y: 10 }
          : s < 8.6
            ? { x: 28 + 40 * entre(6, 8.6), y: 34 + 28 * entre(6, 8.6) }
            : { x: 68 + 14 * entre(8.6, 9.8), y: 62 - 52 * entre(8.6, 9.8) },
    clic: (s >= 1.3 && s < 1.6) || (s >= 9.8 && s < 10.1),
    cuenta,
    grabando,
    segundos: grabando ? Math.floor(s - 3.4) : 0,
    burbuja: s >= 3.2 && s < 10.4,
    resaltado: entre(4.4, 5.6),
    flecha: entre(6.2, 8.4),
    terminado: s >= 10.2,
    compartir: entre(10.8, 11.6),
    paso: s < 3.4 ? 0 : s < 10.2 ? (s < 6 ? 1 : 2) : 3,
  };
}

export function Demo() {
  const { idioma } = useIdioma();
  const [t, setT] = useState(11_800);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const inicio = performance.now();
    const id = window.setInterval(() => setT((performance.now() - inicio) % DURACION), 50);
    return () => clearInterval(id);
  }, []);
  const e = escenaDemo(t);
  const es = idioma === 'es';
  const pasos = es
    ? ['Toca Grabar', 'Habla con tu cámara', 'Dibuja encima', 'Comparte el enlace']
    : ['Hit Record', 'Talk on camera', 'Draw on screen', 'Share the link'];

  return (
    <div
      className="demo"
      aria-label={es ? 'Demostración de cómo se graba con Pantalay' : 'How recording with Pantalay works'}
      role="img"
    >
      <div className="demo-ventana">
        <div className="demo-barra">
          <span />
          <span />
          <span />
          <em>pantalay.com</em>
          <b className={`demo-boton ${e.grabando ? 'grabando' : ''} ${e.clic ? 'clic' : ''}`}>
            {e.grabando
              ? `● ${es ? 'Terminar' : 'Finish'} 0:${String(e.segundos).padStart(2, '0')}`
              : `● ${es ? 'Grabar' : 'Record'}`}
          </b>
        </div>
        <div className="demo-pantalla">
          <div className="demo-tablero">
            <strong>
              Launch plan · Q3
              <i style={{ transform: `scaleX(${e.resaltado})` }} />
            </strong>
            <small>{es ? 'Tres pasos para el lanzamiento' : 'Three steps to launch'}</small>
            <div className="demo-tarjetas">
              {[
                ['Research', 100],
                ['Design', 60],
                ['Ship', 20],
              ].map(([n, v]) => (
                <div key={n}>
                  <span>{n}</span>
                  <p>
                    <i style={{ width: `${v}%` }} />
                  </p>
                </div>
              ))}
            </div>
          </div>
          <svg className="demo-dibujo" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 30 22 Q 48 44 64 34" pathLength={1} style={{ strokeDashoffset: 1 - e.flecha }} />
            {e.flecha >= 1 && <path className="punta" d="M 64 34 l -5 -1 m 5 1 l -2 4" />}
          </svg>
          {e.burbuja && (
            <div className="demo-burbuja">
              <div className="demo-cara">
                <span className="ojo" />
                <span className="ojo" />
                <span className="boca" />
              </div>
            </div>
          )}
          {e.grabando && <span className="demo-rec">● REC</span>}
          {e.cuenta && (
            <div className="demo-cuenta">
              <span key={e.cuenta}>{e.cuenta}</span>
            </div>
          )}
          {e.terminado && (
            <div className="demo-listo" style={{ opacity: Math.min(1, e.compartir * 2 + 0.3) }}>
              <p>✓ {es ? 'Enlace copiado' : 'Link copied'}</p>
              <code>pantalay.com/v/8f2k…</code>
              <div
                className="demo-redes"
                style={{ transform: `translateY(${(1 - e.compartir) * 14}px)`, opacity: e.compartir }}
              >
                {['#FF0000', '#000000', '#25D366', '#0866FF'].map((c, i) => (
                  <span key={c} style={{ background: c, transitionDelay: `${i * 80}ms` }} />
                ))}
              </div>
            </div>
          )}
          <svg
            className={`demo-cursor ${e.clic ? 'clic' : ''}`}
            style={{ left: `${e.cursor.x}%`, top: `${e.cursor.y}%` }}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 2l16 9-7 2-3 7z" />
          </svg>
        </div>
      </div>
      <ol className="demo-pasos">
        {pasos.map((p, i) => (
          <li key={p} className={e.paso === i ? 'activo' : e.paso > i ? 'hecho' : ''}>
            <span>{i + 1}</span> {p}
          </li>
        ))}
      </ol>
    </div>
  );
}
