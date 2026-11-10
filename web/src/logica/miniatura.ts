// Miniatura para YouTube (CANDADO C-MINIATURA): todo en el navegador, sin IA y sin costo. Un cuadro del video (o una
// foto propia), texto grande encima con un estilo de alto contraste, y sale en 1280 × 720, JPG, por debajo de 2 MB
// (lo que pide YouTube). Aquí va lo puro (medidas, encuadre, texto, peso) y el dibujo en el lienzo.
import { cubrir, pintarPildoraMarca, type Rect } from './grabadora';

/** Medida que recomienda YouTube para la miniatura (16:9). */
export const ANCHO = 1280;
export const ALTO = 720;
/** YouTube rechaza miniaturas de 2 MB o más: nos quedamos siempre por debajo. */
export const MAX_BYTES = 2_000_000;
/** Pocas palabras se leen en el celular; el texto por defecto se corta aquí. */
export const MAX_PALABRAS = 5;
export const MAX_LETRAS = 40;
/** Lo más que se deja escribir en la casilla. */
export const MAX_TEXTO = 60;

export type EstiloMiniatura = 'amarillo' | 'contorno' | 'rojo' | 'mascara';
export type PosicionTexto = 'arriba' | 'centro' | 'abajo';
export type EncuadreVertical = 'desenfocado' | 'recorte';
export const ESTILOS_LISTOS: Exclude<EstiloMiniatura, 'mascara'>[] = ['amarillo', 'contorno', 'rojo'];
export const POSICIONES: PosicionTexto[] = ['arriba', 'centro', 'abajo'];

/** Cómo se pinta el texto: franja detrás (o ninguna), color de letra y contorno (o ninguno). */
export type Pintura = { franja: string | null; letra: string; contorno: string | null };

export const PINTURAS: Record<Exclude<EstiloMiniatura, 'mascara'>, Pintura> = {
  amarillo: { franja: '#ffd60a', letra: '#111111', contorno: null },
  contorno: { franja: null, letra: '#ffffff', contorno: '#000000' },
  rojo: { franja: '#e11d48', letra: '#ffffff', contorno: null },
};

/** Luminancia relativa (WCAG) de un color «#rrggbb». */
export function luminancia(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  const canal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Letra negra o blanca, la que más se lea sobre ese fondo. */
export function letraLegible(fondo: string): string {
  const l = luminancia(fondo);
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#111111' : '#ffffff';
}

/** La pintura del estilo elegido. Con la máscara del Estudio: franja de su color principal y letra legible. */
export function pinturaDe(estilo: EstiloMiniatura, mascara?: { principal: string } | null): Pintura {
  if (estilo === 'mascara' && mascara)
    return { franja: mascara.principal, letra: letraLegible(mascara.principal), contorno: null };
  return PINTURAS[estilo === 'mascara' ? 'amarillo' : estilo];
}

/** El texto por defecto: el título impactante (o el del video), cortado a pocas palabras. */
export function textoCorto(titulo: string, maxPalabras = MAX_PALABRAS, maxLetras = MAX_LETRAS): string {
  const palabras = titulo.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const salida: string[] = [];
  for (const p of palabras) {
    if (salida.length >= maxPalabras) break;
    if ([...salida, p].join(' ').length > maxLetras) break;
    salida.push(p);
  }
  // Una sola palabra larguísima: se corta a la fuerza.
  if (!salida.length && palabras[0]) return palabras[0].slice(0, maxLetras);
  // Que no termine en una palabra suelta de unión («de», «the», «y»…) ni con dos puntos o coma.
  while (
    salida.length > 1 &&
    /^(de|del|la|el|los|las|y|o|a|en|con|para|por|the|a|an|of|and|or|to|in|on|for|with)$/i.test(
      salida.at(-1)!,
    )
  )
    salida.pop();
  return salida.join(' ').replace(/[,:;\-–—]+$/, '');
}

/** Parte el texto en líneas que caben en «anchoMax»; null si no cabe en «maxLineas» o una palabra sola no cabe. */
export function partirLineas(
  texto: string,
  medir: (s: string) => number,
  anchoMax: number,
  maxLineas: number,
): string[] | null {
  const palabras = texto.split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if (medir(p) > anchoMax) return null;
    const prueba = actual ? `${actual} ${p}` : p;
    if (medir(prueba) <= anchoMax) actual = prueba;
    else {
      lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length <= maxLineas ? lineas : null;
}

/**
 * El tamaño de letra más grande con el que el texto cabe: hasta 3 líneas, dentro del ancho y del alto dados.
 * «medir(s, px)» devuelve el ancho de «s» con letra de «px» píxeles.
 */
export function ajustarLetra(
  texto: string,
  medir: (s: string, px: number) => number,
  anchoMax: number,
  altoMax: number,
  { max = 160, min = 40, maxLineas = 3, interlineado = 1.12 } = {},
): { px: number; lineas: string[] } {
  for (let px = max; px >= min; px -= 4) {
    const lineas = partirLineas(texto, (s) => medir(s, px), anchoMax, maxLineas);
    if (lineas && lineas.length * px * interlineado <= altoMax) return { px, lineas };
  }
  // No cabe ni con la letra más chica: se parte igual (sin límite de líneas) para no perder palabras.
  return { px: min, lineas: partirLineas(texto, (s) => medir(s, min), Infinity, Infinity) ?? [texto] };
}

/** ¿La imagen ya es 16:9 (como la miniatura)? Con un margen: 1920 × 1080, 1280 × 720, 854 × 480… */
export function esPanoramica(ancho: number, alto: number): boolean {
  return alto > 0 && Math.abs(ancho / alto - ANCHO / ALTO) < 0.03;
}

/**
 * Cómo se acomoda la imagen (ancho × alto) en la miniatura. Si ya es 16:9 o se elige «recorte», llena todo (se
 * recorta al centro). Un video vertical con «desenfocado» va entero en el medio, con la misma imagen agrandada y
 * borrosa de fondo para no dejar barras negras.
 */
export function encuadrar(
  ancho: number,
  alto: number,
  modo: EncuadreVertical,
): { fondo: Rect | null; origen: Rect; destino: Rect } {
  const lleno = { x: 0, y: 0, w: ANCHO, h: ALTO };
  if (esPanoramica(ancho, alto) || modo === 'recorte' || ancho / alto > ANCHO / ALTO)
    return { fondo: null, origen: cubrir(ancho, alto, ANCHO, ALTO), destino: lleno };
  const escala = ALTO / alto;
  const w = ancho * escala;
  return {
    fondo: cubrir(ancho, alto, ANCHO, ALTO),
    origen: { x: 0, y: 0, w: ancho, h: alto },
    destino: { x: (ANCHO - w) / 2, y: 0, w, h: ALTO },
  };
}

/** Dónde va el bloque de texto (alto total «altoTexto»), con su margen. */
export function yDelTexto(posicion: PosicionTexto, altoTexto: number, margen = 56): number {
  if (posicion === 'arriba') return margen;
  if (posicion === 'abajo') return ALTO - margen - altoTexto;
  return (ALTO - altoTexto) / 2;
}

/** Calidades que se prueban de mejor a peor hasta quedar por debajo del límite. */
export const CALIDADES = [0.92, 0.86, 0.8, 0.72, 0.64, 0.55, 0.45, 0.35];

/** Codifica con la mejor calidad que quede por debajo de «max» bytes. Si ninguna alcanza, lanza error. */
export async function bajoElLimite(
  codificar: (calidad: number) => Promise<Blob>,
  max = MAX_BYTES,
): Promise<{ archivo: Blob; calidad: number }> {
  for (const calidad of CALIDADES) {
    const archivo = await codificar(calidad);
    if (archivo.size > 0 && archivo.size < max) return { archivo, calidad };
  }
  throw new Error('miniatura: no baja de 2 MB');
}

/** Nombre del archivo que se descarga: «miniatura-<titulo>.jpg», sin acentos ni símbolos. */
export function nombreMiniatura(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `miniatura-${base || 'video'}.jpg`;
}

/** Lo que se dibuja. «fuente» null = todavía no hay imagen: fondo oscuro con el texto (nunca un lienzo en blanco). */
export type Dibujo = {
  fuente: { imagen: CanvasImageSource; ancho: number; alto: number } | null;
  texto: string;
  idioma: string;
  pintura: Pintura;
  posicion: PosicionTexto;
  encuadre: EncuadreVertical;
  /** Logo de la máscara del Estudio (arriba a la izquierda). */
  logo?: CanvasImageSource | null;
  /** Marca de agua del plan gratis (misma regla que el video: «marca» del servidor). */
  marca: boolean;
  iconoMarca?: HTMLImageElement | null;
};

const LETRA = (px: number) => `900 ${px}px Inter, "Arial Black", system-ui, sans-serif`;

export function dibujarMiniatura(ctx: CanvasRenderingContext2D, d: Dibujo): void {
  const c = ctx.canvas;
  c.width = ANCHO;
  c.height = ALTO;
  ctx.save();
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  if (d.fuente) {
    const e = encuadrar(d.fuente.ancho, d.fuente.alto, d.encuadre);
    if (e.fondo) {
      ctx.filter = 'blur(28px) brightness(0.6)';
      // Un poco más grande que el lienzo: el desenfoque no deja bordes claros.
      ctx.drawImage(
        d.fuente.imagen,
        e.fondo.x,
        e.fondo.y,
        e.fondo.w,
        e.fondo.h,
        -40,
        -40,
        ANCHO + 80,
        ALTO + 80,
      );
      ctx.filter = 'none';
    }
    ctx.drawImage(
      d.fuente.imagen,
      e.origen.x,
      e.origen.y,
      e.origen.w,
      e.origen.h,
      e.destino.x,
      e.destino.y,
      e.destino.w,
      e.destino.h,
    );
  }
  if (d.logo) {
    const lado = 120;
    const w = 'width' in d.logo && 'height' in d.logo ? Number(d.logo.width) : lado;
    const h = 'width' in d.logo && 'height' in d.logo ? Number(d.logo.height) : lado;
    const escala = Math.min(lado / (w || lado), lado / (h || lado));
    ctx.drawImage(d.logo, 40, 40, (w || lado) * escala, (h || lado) * escala);
  }
  const texto = d.texto.trim().toLocaleUpperCase(d.idioma);
  if (texto) {
    const margen = 56;
    const relleno = 22;
    const anchoMax = ANCHO - margen * 2 - relleno * 2;
    const { px, lineas } = ajustarLetra(
      texto,
      (s, p) => {
        ctx.font = LETRA(p);
        return ctx.measureText(s).width;
      },
      anchoMax,
      ALTO * 0.62,
    );
    ctx.font = LETRA(px);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const alto = px * 1.12;
    let y = yDelTexto(d.posicion, lineas.length * alto + relleno, margen);
    for (const l of lineas) {
      const w = ctx.measureText(l).width;
      const x = margen;
      if (d.pintura.franja) {
        ctx.fillStyle = d.pintura.franja;
        ctx.beginPath();
        ctx.roundRect(x, y, w + relleno * 2, alto + 4, 14);
        ctx.fill();
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 18;
      }
      if (d.pintura.contorno) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(8, px * 0.16);
        ctx.strokeStyle = d.pintura.contorno;
        ctx.strokeText(l, x + relleno, y + alto / 2 + 2);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = d.pintura.letra;
      ctx.fillText(l, x + relleno, y + alto / 2 + 2);
      y += alto;
    }
  }
  // La marca va ARRIBA a la derecha: abajo a la derecha YouTube pone la duración encima y la taparía.
  if (d.marca) pintarPildoraMarca(ctx, { x: 0, y: 0, w: ANCHO, h: ALTO }, ALTO, d.iconoMarca ?? null, true);
  ctx.restore();
}
