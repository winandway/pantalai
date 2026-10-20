// Burbuja flotante (como Loom): una ventanita de Chrome que queda encima de TODOS los programas, con tu cámara.
// Se mueve arrastrándola por su barra y se graba sola porque está en la pantalla.
// Usa «Document Picture-in-Picture» (Chrome y Edge de computadora).
import { medidaBurbuja, type Ajustes } from './grabadora';
import { formatoTiempo } from './tiempo';

declare global {
  interface Window {
    documentPictureInPicture?: { requestWindow: (o: { width: number; height: number }) => Promise<Window> };
  }
}

const BASE: Record<Ajustes['burbujaTamano'], number> = { chico: 180, mediano: 240, grande: 320 };

export function medidaVentana(a: Pick<Ajustes, 'burbujaTamano' | 'burbujaForma'>) {
  return medidaBurbuja(BASE[a.burbujaTamano], a.burbujaForma);
}

/** Se llama en el clic de «Empezar»: la ventanita necesita el gesto de la persona. */
export async function abrirVentana(
  a: Pick<Ajustes, 'burbujaTamano' | 'burbujaForma'>,
): Promise<Window | null> {
  if (!window.documentPictureInPicture) return null;
  const { ancho, alto } = medidaVentana(a);
  try {
    return await window.documentPictureInPicture.requestWindow({ width: ancho, height: alto });
  } catch (e) {
    console.error('no se pudo abrir la burbuja flotante', e);
    return null;
  }
}

export type Controles = { pausar: () => void; continuar: () => void; terminar: () => void };
export type Textos = { pausar: string; continuar: string; terminar: string };

export type Burbuja = {
  actualizar: (segundos: number, estado: 'cuenta' | 'grabando' | 'pausa', cuenta?: number) => void;
  cerrar: () => void;
};

const ESTILOS = `
@property --giro { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
html, body { margin: 0; height: 100%; background: #0d0e11; overflow: hidden; font-family: system-ui, sans-serif; }
.marco { position: absolute; inset: 0; padding: 0; display: grid; }
.marco.con-borde { padding: 5px; background: conic-gradient(from var(--giro), #ff4fa3, #ff9f43, #ffe14d, #b46bff, #ff4fa3); animation: girar 3s linear infinite; }
.marco.circulo, .marco.circulo .video { border-radius: 50%; }
.marco.cuadrado, .marco.vertical { border-radius: 18px; }
.marco.cuadrado .video, .marco.vertical .video { border-radius: 14px; }
.video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); background: #000; display: block; }
@keyframes girar { to { --giro: 360deg; } }
.barra { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); display: flex; gap: 6px; align-items: center;
  background: rgba(0,0,0,.72); color: #fff; border-radius: 999px; padding: 4px 6px 4px 10px; font-size: 12px; font-weight: 600;
  opacity: 0; transition: opacity .2s; white-space: nowrap; }
body:hover .barra, .barra.fija { opacity: 1; }
.punto { width: 8px; height: 8px; border-radius: 50%; background: #e5484d; animation: latir 1.2s infinite; }
.pausa .punto { animation: none; background: #9ca3af; }
@keyframes latir { 50% { opacity: .3; } }
button { border: 0; border-radius: 999px; padding: 4px 8px; font: inherit; cursor: pointer; background: #fff; color: #16181d; }
button.alto { background: #e5484d; color: #fff; }
.cuenta { position: absolute; inset: 0; display: grid; place-items: center; font-size: 64px; font-weight: 800; color: #fff;
  background: rgba(0,0,0,.45); }
`;

export function montarBurbuja(
  ventana: Window,
  camara: MediaStream,
  a: Pick<Ajustes, 'burbujaForma' | 'bordeColores'>,
  controles: Controles,
  textos: Textos,
): Burbuja {
  const d = ventana.document;
  d.title = 'Pantalay';
  const estilo = d.createElement('style');
  estilo.textContent = ESTILOS;
  d.head.appendChild(estilo);
  const marco = d.createElement('div');
  marco.className = `marco ${a.burbujaForma}${a.bordeColores ? ' con-borde' : ''}`;
  const video = d.createElement('video');
  video.className = 'video';
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = camara;
  marco.appendChild(video);
  d.body.appendChild(marco);
  void video.play().catch(() => undefined);

  const barra = d.createElement('div');
  barra.className = 'barra fija';
  const punto = d.createElement('span');
  punto.className = 'punto';
  const reloj = d.createElement('span');
  reloj.textContent = '0:00';
  const pausa = d.createElement('button');
  pausa.type = 'button';
  pausa.textContent = '❚❚';
  pausa.title = textos.pausar;
  const alto = d.createElement('button');
  alto.type = 'button';
  alto.className = 'alto';
  alto.textContent = '■';
  alto.title = textos.terminar;
  for (const hijo of [punto, reloj, pausa, alto]) barra.appendChild(hijo);
  d.body.appendChild(barra);
  const cuenta = d.createElement('div');
  cuenta.className = 'cuenta';
  d.body.appendChild(cuenta);

  let estadoActual: 'cuenta' | 'grabando' | 'pausa' = 'cuenta';
  pausa.onclick = () => (estadoActual === 'pausa' ? controles.continuar() : controles.pausar());
  alto.onclick = () => controles.terminar();
  // La barra se queda a la vista los primeros segundos y después aparece al pasar el mouse.
  window.setTimeout(() => barra.classList.remove('fija'), 4000);

  return {
    actualizar(segundos, estado, n) {
      estadoActual = estado;
      reloj.textContent = formatoTiempo(segundos);
      barra.classList.toggle('pausa', estado === 'pausa');
      pausa.textContent = estado === 'pausa' ? '▶' : '❚❚';
      pausa.title = estado === 'pausa' ? textos.continuar : textos.pausar;
      cuenta.style.display = estado === 'cuenta' ? 'grid' : 'none';
      if (estado === 'cuenta' && n) cuenta.textContent = String(n);
    },
    cerrar() {
      try {
        ventana.close();
      } catch {
        /* ya estaba cerrada */
      }
    },
  };
}
