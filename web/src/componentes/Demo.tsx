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
            ? { x: 20 + 32 * entre(6, 8.6), y: 39 + 25 * entre(6, 8.6) }
            : { x: 52 + 30 * entre(8.6, 9.8), y: 64 - 54 * entre(8.6, 9.8) },
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

/** Las pantallas que se van turnando en cada vuelta de la demo (como si grabaras distintos programas). */
export const PANTALLAS = ['plan', 'tienda', 'ventas'] as const;

/** El presentador de la burbuja vertical (dibujo propio, no es una persona real). */
function Presentador() {
  return (
    <svg
      className="demo-persona"
      viewBox="0 0 90 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="90" height="160" fill="#d9cbb8" />
      <rect x="0" y="0" width="90" height="160" fill="url(#luz)" />
      <defs>
        <radialGradient id="luz" cx="30%" cy="20%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="62" y="18" width="2" height="70" fill="#b9a68f" />
      <ellipse cx="70" cy="22" rx="9" ry="12" fill="#6f8f5e" />
      <ellipse cx="64" cy="30" rx="7" ry="9" fill="#5c7d4d" />
      <g className="demo-persona-cuerpo">
        <path d="M8 160 C10 122 24 110 45 108 C66 110 80 122 82 160 Z" fill="#3f6fa8" />
        <path d="M37 108 L45 124 L53 108 Z" fill="#2c4f7c" />
        <path d="M39 110 L45 120 L51 110 Z" fill="#1f6b5c" />
        <rect x="39" y="92" width="12" height="18" rx="5" fill="#c98f6b" />
        <g className="demo-persona-cabeza">
          <ellipse cx="45" cy="72" rx="20" ry="24" fill="#d9a07a" />
          <path d="M25 66 C25 44 65 42 65 64 C61 54 49 52 45 56 C39 51 29 55 25 66 Z" fill="#6b6b6b" />
          <path d="M25 64 C23 70 24 76 26 78 L27 66 Z M65 64 C67 70 66 76 64 78 L63 66 Z" fill="#5a5a5a" />
          <ellipse cx="25" cy="74" rx="3" ry="5" fill="#cf9470" />
          <ellipse cx="65" cy="74" rx="3" ry="5" fill="#cf9470" />
          <rect x="29" y="64" width="14" height="10" rx="3" fill="none" stroke="#1d1d1f" strokeWidth="2.4" />
          <rect x="47" y="64" width="14" height="10" rx="3" fill="none" stroke="#1d1d1f" strokeWidth="2.4" />
          <path d="M43 68 H47" stroke="#1d1d1f" strokeWidth="2" />
          <g className="demo-persona-ojos">
            <circle cx="36" cy="69" r="1.8" fill="#2a1d17" />
            <circle cx="54" cy="69" r="1.8" fill="#2a1d17" />
          </g>
          <path d="M33 84 C38 92 52 92 57 84 C55 94 35 94 33 84 Z" fill="#7a7a7a" opacity="0.55" />
          <ellipse className="demo-persona-boca" cx="45" cy="86" rx="5" ry="2.4" fill="#7b3b33" />
        </g>
      </g>
      <path d="M4 104 L22 96" stroke="#1d1d1f" strokeWidth="3" strokeLinecap="round" />
      <rect x="18" y="88" width="10" height="16" rx="5" fill="#2b2b2e" transform="rotate(-25 23 96)" />
    </svg>
  );
}

export function Demo() {
  const { idioma } = useIdioma();
  const [reloj, setReloj] = useState(11_800);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const inicio = performance.now() - 11_800;
    const id = window.setInterval(() => setReloj(performance.now() - inicio), 50);
    return () => clearInterval(id);
  }, []);
  const t = reloj % DURACION;
  const pantalla = PANTALLAS[Math.floor(reloj / DURACION) % PANTALLAS.length]!;
  const e = escenaDemo(t);
  const es = idioma === 'es';
  const pasos = es
    ? ['Toca Grabar', 'Habla con tu cámara', 'Dibuja encima', 'Comparte el enlace']
    : ['Hit Record', 'Talk on camera', 'Draw on screen', 'Share the link'];
  const titulo = {
    plan: 'Launch plan · Q3',
    tienda: es ? 'Tienda online' : 'Online store',
    ventas: es ? 'Ventas · Octubre' : 'Sales · October',
  }[pantalla];
  const subtitulo = {
    plan: es ? 'Tres pasos para el lanzamiento' : 'Three steps to launch',
    tienda: es ? 'Los más vendidos de la semana' : 'Best sellers this week',
    ventas: es ? '+32 % frente a septiembre' : '+32% vs. September',
  }[pantalla];

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
        <div className={`demo-pantalla pantalla-${pantalla}`}>
          <div className="demo-tablero" key={pantalla}>
            <strong>
              {titulo}
              <i style={{ transform: `scaleX(${e.resaltado})` }} />
            </strong>
            <small>{subtitulo}</small>
            {pantalla === 'plan' && (
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
            )}
            {pantalla === 'tienda' && (
              <div className="demo-productos">
                {[
                  ['👟', '$89', '#ffe3d6'],
                  ['🎧', '$129', '#dff1ff'],
                  ['⌚', '$199', '#efe3ff'],
                  ['🕶️', '$59', '#e2f7e8'],
                ].map(([icono, precio, fondo]) => (
                  <div key={icono} style={{ background: fondo }}>
                    <span>{icono}</span>
                    <b>{precio}</b>
                  </div>
                ))}
              </div>
            )}
            {pantalla === 'ventas' && (
              <div className="demo-grafica">
                {[38, 52, 46, 70, 64, 92].map((h, i) => (
                  <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
                ))}
              </div>
            )}
          </div>
          <svg className="demo-dibujo" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 20 22 Q 34 44 52 36" pathLength={1} style={{ strokeDashoffset: 1 - e.flecha }} />
            {e.flecha >= 1 && <path className="punta" d="M 52 36 l -5 -1 m 5 1 l -2 4" />}
          </svg>
          {e.burbuja && (
            <div className="demo-burbuja">
              <div className="demo-burbuja-barra">
                <span>pantalay.com</span>
                <i>● REC</i>
              </div>
              <Presentador />
            </div>
          )}
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
                {['#FF0000', '#000000', '#25D366', '#0866FF'].map((c) => (
                  <span key={c} style={{ background: c }} />
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
