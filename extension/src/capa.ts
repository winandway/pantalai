// Capa transparente encima de cualquier página web: los mismos lápices de Pantalay (web/src/logica/dibujo.ts) y el
// énfasis del cursor (un círculo suave que sigue al puntero y un destello al hacer clic). Como se graba la pantalla
// o la pestaña, lo dibujado sale en el video. CANDADO C-EXTENSION.
import { COLORES, Pizarra, aCoordenadas, pintar, type Herramienta } from '../../web/src/logica/dibujo';
import type { Capa, EstadoCapa } from './mensajes';

type Api = { alternar(que: Capa | 'estado'): EstadoCapa };
const w = window as unknown as { __pantalayCapa?: Api };

const NOMBRE_COLOR: Record<string, string> = {
  '#ff3b30': 'rojo',
  '#ffcc00': 'amarillo',
  '#34c759': 'verde',
  '#0a84ff': 'azul',
  '#ffffff': 'blanco',
  '#111111': 'negro',
};
const HERRAMIENTAS: [Herramienta, string][] = [
  ['lapiz', '✏️'],
  ['resaltador', '🖍️'],
  ['flecha', '↗'],
  ['cuadro', '▭'],
  ['circulo', '◯'],
];

const ESTILO = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; }
canvas.activo { pointer-events: auto; cursor: crosshair; }
.barra { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); display: none; gap: 4px;
  align-items: center; padding: 6px 8px; background: #fff; color: #16181d; border: 1px solid #e2e4e9;
  border-radius: 12px; box-shadow: 0 4px 16px rgba(16,24,40,.18); pointer-events: auto; }
.barra.activo { display: flex; }
.barra button { width: 32px; height: 32px; border: 1px solid transparent; border-radius: 8px; background: none;
  font-size: 16px; line-height: 1; cursor: pointer; color: #16181d; padding: 0; }
.barra button:hover { background: #f6f7f9; }
.barra button[aria-pressed="true"] { border-color: #e5484d; background: #fdecec; }
.barra .color { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #e2e4e9; }
.barra .color[aria-pressed="true"] { outline: 2px solid #16181d; outline-offset: 1px; background-clip: padding-box; }
.barra .sep { width: 1px; height: 22px; background: #e2e4e9; margin: 0 4px; }
.marca { font-weight: 700; font-size: 13px; color: #e5484d; margin-right: 4px; }
.cursor { position: fixed; left: 0; top: 0; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
  background: rgba(255, 204, 0, .28); border: 2px solid rgba(255, 184, 0, .85); pointer-events: none; display: none;
  transition: width .12s, height .12s, margin .12s; }
.cursor.activo { display: block; }
.destello { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
  border: 3px solid rgba(229, 72, 77, .9); pointer-events: none; animation: destello .5s ease-out forwards; }
@keyframes destello { from { transform: scale(.4); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
`;

if (!w.__pantalayCapa) {
  const t = (k: string) => chrome.i18n.getMessage(k) || k;
  const estado: EstadoCapa = { dibujo: false, cursor: false };
  const pizarra = new Pizarra();
  let herramienta: Herramienta = 'lapiz';
  let color: string = COLORES[0];
  let partes: {
    host: HTMLDivElement;
    lienzo: HTMLCanvasElement;
    barra: HTMLDivElement;
    cursor: HTMLDivElement;
    raiz: ShadowRoot;
  } | null = null;
  let cuadroPedido = false;

  const dibujarAhora = () => {
    cuadroPedido = false;
    if (!partes) return;
    const { lienzo } = partes;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    pintar(ctx, pizarra, lienzo.width, lienzo.height, performance.now());
  };
  const pedirCuadro = () => {
    if (cuadroPedido) return;
    cuadroPedido = true;
    requestAnimationFrame(dibujarAhora);
  };
  const medir = () => {
    if (!partes) return;
    const r = devicePixelRatio || 1;
    partes.lienzo.width = Math.round(innerWidth * r);
    partes.lienzo.height = Math.round(innerHeight * r);
    pedirCuadro();
  };
  const punto = (e: PointerEvent) =>
    aCoordenadas(
      e.clientX,
      e.clientY,
      { left: 0, top: 0, width: innerWidth, height: innerHeight },
      innerWidth,
      innerHeight,
    );

  const boton = (etiqueta: string, contenido: string, alTocar: () => void, clase = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = etiqueta;
    b.setAttribute('aria-label', etiqueta);
    b.textContent = contenido;
    if (clase) b.className = clase;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      alTocar();
      marcar();
    });
    return b;
  };

  /** Pinta qué herramienta y qué color están elegidos. */
  const marcar = () => {
    partes?.barra.querySelectorAll<HTMLButtonElement>('[data-herramienta]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.herramienta === herramienta));
    });
    partes?.barra.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.color === color));
    });
  };

  const montar = () => {
    if (partes) return partes;
    const host = document.createElement('div');
    host.id = 'pantalay-capa';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const raiz = host.attachShadow({ mode: 'open' });
    const estilo = document.createElement('style');
    estilo.textContent = ESTILO;
    const lienzo = document.createElement('canvas');
    const barra = document.createElement('div');
    barra.className = 'barra';
    barra.setAttribute('role', 'toolbar');
    barra.setAttribute('aria-label', t('herramientas'));
    const marca = document.createElement('span');
    marca.className = 'marca';
    marca.textContent = 'Pantalay';
    barra.appendChild(marca);
    for (const [h, icono] of HERRAMIENTAS) {
      const b = boton(t(h), icono, () => (herramienta = h));
      b.dataset.herramienta = h;
      barra.appendChild(b);
    }
    const sep = () => Object.assign(document.createElement('span'), { className: 'sep' });
    barra.appendChild(sep());
    for (const c of COLORES) {
      const b = boton(t(NOMBRE_COLOR[c] ?? c), '', () => (color = c), 'color');
      b.dataset.color = c;
      b.style.background = c;
      barra.appendChild(b);
    }
    barra.appendChild(sep());
    barra.appendChild(
      boton(t('deshacer'), '↶', () => {
        pizarra.deshacer();
        pedirCuadro();
      }),
    );
    barra.appendChild(
      boton(t('borrarTodo'), '🗑', () => {
        pizarra.borrar();
        pedirCuadro();
      }),
    );
    barra.appendChild(boton(t('dejarDeDibujar'), '✕', () => fijar('dibujo', false)));
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    for (const n of [estilo, lienzo, barra, cursor]) raiz.appendChild(n);
    document.documentElement.appendChild(host);

    lienzo.addEventListener('pointerdown', (e) => {
      if (!estado.dibujo || e.button !== 0) return;
      const p = punto(e);
      if (!p) return;
      e.preventDefault();
      lienzo.setPointerCapture(e.pointerId);
      pizarra.empezar(herramienta, color, 'medio', p);
      pedirCuadro();
    });
    lienzo.addEventListener('pointermove', (e) => {
      if (!lienzo.hasPointerCapture(e.pointerId)) return;
      const p = punto(e);
      if (p) pizarra.mover(p);
      pedirCuadro();
    });
    const soltar = () => {
      pizarra.soltar(performance.now());
      pedirCuadro();
    };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);

    window.addEventListener('resize', medir);
    window.addEventListener(
      'pointermove',
      (e) => {
        if (estado.cursor) cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      },
      { capture: true, passive: true },
    );
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (!estado.cursor) return;
        const d = document.createElement('div');
        d.className = 'destello';
        d.style.left = `${e.clientX}px`;
        d.style.top = `${e.clientY}px`;
        raiz.appendChild(d);
        setTimeout(() => d.remove(), 600);
      },
      { capture: true, passive: true },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (!estado.dibujo) return;
        if (e.key === 'Escape') fijar('dibujo', false);
        else if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
          e.preventDefault();
          e.stopPropagation();
          pizarra.deshacer();
          pedirCuadro();
        }
      },
      { capture: true },
    );
    partes = { host, lienzo, barra, cursor, raiz };
    medir();
    marcar();
    return partes;
  };

  const fijar = (que: Capa, valor: boolean) => {
    const p = montar();
    estado[que] = valor;
    p.lienzo.classList.toggle('activo', estado.dibujo);
    p.barra.classList.toggle('activo', estado.dibujo);
    p.cursor.classList.toggle('activo', estado.cursor);
    // Con el dibujo apagado, los trazos se quedan (como en Pantalay) y la página vuelve a recibir los clics.
    pedirCuadro();
  };

  w.__pantalayCapa = {
    alternar(que) {
      if (que !== 'estado') fijar(que, !estado[que]);
      return { ...estado };
    },
  };
}
