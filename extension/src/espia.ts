// Corre DENTRO de la página del fallo (mundo principal) desde que se toca «Grabar un reporte de error»: anota los
// mensajes de consola, los errores sin capturar y las peticiones de red (método, dirección limpia, estado, duración y
// tipo). NUNCA lee cuerpos, cookies ni cabeceras. Sin chrome.debugger: no sale la barra amarilla de «depurando».
// CANDADO C-REPORTE-ERROR.
import {
  limpiarTexto,
  limpiarUrl,
  type ConsolaCruda,
  type NivelConsola,
  type RedCruda,
} from '../../web/src/logica/registros';

type Espia = { tomar(): { consola: ConsolaCruda[]; red: RedCruda[] }; reiniciar(): void };
const w = window as unknown as { __pantalayEspia?: Espia };

/** En memoria, como mucho esto por lista (al tomar, se recorta al tope del servidor). */
const TOPE = 2000;

if (w.__pantalayEspia) {
  // Ya estaba puesto (un reporte anterior en la misma pestaña): se empieza de cero.
  w.__pantalayEspia.reiniciar();
} else {
  const consola: ConsolaCruda[] = [];
  const red: RedCruda[] = [];
  const meter = <T>(lista: T[], e: T) => {
    lista.push(e);
    if (lista.length > TOPE) lista.shift();
  };
  const aTexto = (args: unknown[]) =>
    args
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ''}`;
        try {
          return JSON.stringify(a) ?? String(a);
        } catch {
          return String(a);
        }
      })
      .join(' ');
  const anotar = (nivel: NivelConsola, args: unknown[]) => {
    try {
      meter(consola, { t: Date.now(), nivel, texto: limpiarTexto(aTexto(args)) });
    } catch {
      /* anotar nunca puede romper la página */
    }
  };

  for (const nivel of ['log', 'info', 'warn', 'error'] as const) {
    const original = console[nivel];
    console[nivel] = function (...args: unknown[]) {
      anotar(nivel, args);
      return original.apply(this, args);
    };
  }
  window.addEventListener('error', (e) => {
    if (!(e instanceof ErrorEvent)) return;
    const donde = e.filename ? ` (${limpiarUrl(e.filename)}:${e.lineno}:${e.colno})` : '';
    anotar('excepcion', [`${e.message}${donde}`]);
  });
  window.addEventListener('unhandledrejection', (e) =>
    anotar('excepcion', ['Unhandled rejection:', e.reason]),
  );

  const red1 = (metodo: string, url: string, t: number, inicio: number, estado: number, tipo: string) => {
    try {
      meter(red, {
        t,
        metodo: metodo.toUpperCase(),
        url: limpiarUrl(url, location.href),
        estado,
        ms: Math.round(performance.now() - inicio),
        tipo,
      });
    } catch {
      /* nunca rompe la página */
    }
  };

  const fetchOriginal = window.fetch;
  window.fetch = async function (entrada: RequestInfo | URL, init?: RequestInit) {
    const t = Date.now();
    const inicio = performance.now();
    const metodo = init?.method ?? (entrada instanceof Request ? entrada.method : 'GET');
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    try {
      const r = await fetchOriginal.call(this, entrada, init);
      red1(metodo, url, t, inicio, r.status, 'fetch');
      return r;
    } catch (e) {
      red1(metodo, url, t, inicio, 0, 'fetch');
      throw e;
    }
  };

  type XhrAnotado = XMLHttpRequest & { __pantalay?: { metodo: string; url: string } };
  const abrir = XMLHttpRequest.prototype.open;
  const enviar = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (
    this: XhrAnotado,
    metodo: string,
    url: string | URL,
    ...resto: unknown[]
  ) {
    this.__pantalay = { metodo, url: String(url) };
    return (abrir as (...a: unknown[]) => void).call(this, metodo, url, ...resto);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = function (
    this: XhrAnotado,
    cuerpo?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const p = this.__pantalay;
    if (p) {
      const t = Date.now();
      const inicio = performance.now();
      this.addEventListener('loadend', () => red1(p.metodo, p.url, t, inicio, this.status, 'xhr'));
    }
    return enviar.call(this, cuerpo);
  };

  // Imágenes, scripts y hojas de estilo (también las que cargaron antes de empezar), con su estado si el navegador
  // lo da. Las fetch/XHR ya se anotan arriba con su método.
  const recurso = (e: PerformanceEntry) => {
    const r = e as PerformanceResourceTiming & { responseStatus?: number };
    if (r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest' || !r.responseStatus) return;
    try {
      meter(red, {
        t: Math.round(performance.timeOrigin + r.startTime),
        metodo: 'GET',
        url: limpiarUrl(r.name),
        estado: r.responseStatus,
        ms: Math.round(r.duration),
        tipo: r.initiatorType,
      });
    } catch {
      /* nunca rompe la página */
    }
  };
  performance.getEntriesByType('resource').forEach(recurso);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach(recurso)).observe({ type: 'resource' });
  } catch {
    /* navegador sin observador */
  }

  Object.defineProperty(window, '__pantalayEspia', {
    value: {
      tomar: () => ({ consola: consola.slice(), red: red.slice() }),
      reiniciar: () => {
        consola.length = 0;
        red.length = 0;
      },
    } satisfies Espia,
    enumerable: false,
  });
}
