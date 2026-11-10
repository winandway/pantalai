// Acelerador del recortador: los primeros y los últimos 20 segundos, cuadro por cuadro, listos en memoria.
// El MP4 que graba el navegador viene en pedacitos y sin índice: para mostrar un segundo cualquiera, el reproductor
// tiene que ir leyendo el archivo desde la nube y al arrastrar la agarradera no alcanzaba a pintar nada. Aquí se leen
// SOLO esas dos puntas (con pedidos por rangos) y se decodifican con WebCodecs, así arrastrar es instantáneo.
import { ALL_FORMATS, CanvasSink, Input, UrlSource } from 'mediabunny';

/** Segundos de cada punta que quedan listos (lo que una persona recorta como mucho). */
export const PUNTA = 20;
/** Un cuadro cada cuarto de segundo: fluido al arrastrar y liviano en memoria. */
export const PASO = 0.25;

/** Tramos que se preparan: el principio y el final (uno solo si el video es corto). */
export function tramosPuntas(duracion: number, punta = PUNTA): [number, number][] {
  if (!(duracion > 0)) return [];
  if (duracion <= punta * 2) return [[0, duracion]];
  return [
    [0, punta],
    [duracion - punta, duracion],
  ];
}

/** El cuadro guardado más cercano a «s», si está a menos de un paso (si no, hay que buscarlo en el video). */
export function cuadroCercano<T extends { s: number }>(cuadros: T[], s: number, tolerancia = PASO): T | null {
  let mejor: T | null = null;
  for (const c of cuadros) if (!mejor || Math.abs(c.s - s) < Math.abs(mejor.s - s)) mejor = c;
  return mejor && Math.abs(mejor.s - s) <= tolerancia ? mejor : null;
}

export type Cuadro = { s: number; imagen: Blob };

const aJpeg = (c: HTMLCanvasElement | OffscreenCanvas, calidad: number): Promise<Blob | null> =>
  'convertToBlob' in c
    ? c.convertToBlob({ type: 'image/jpeg', quality: calidad })
    : new Promise((ok) => c.toBlob(ok, 'image/jpeg', calidad));

/**
 * Prepara las puntas y las fotos de la tira. Avisa cada cuadro listo; si el navegador no puede decodificar el video
 * (por ejemplo, WebM en Safari), lanza error y el recortador sigue con el reproductor normal.
 */
export async function prepararCuadros(
  url: string,
  duracion: number,
  opciones: {
    fotos: number[];
    alFoto: (i: number, imagen: string) => void;
    alCuadro: (c: Cuadro) => void;
    alProgreso: (hecho: number) => void;
    vivo: () => boolean;
  },
): Promise<void> {
  const input = new Input({
    source: new UrlSource(url, { requestInit: { credentials: 'same-origin' }, parallelism: 4 }),
    formats: ALL_FORMATS,
  });
  try {
    const pista = await input.getPrimaryVideoTrack();
    if (!pista || !(await pista.canDecode())) throw new Error('no se puede decodificar el video aquí');
    const tramos = tramosPuntas(duracion);
    // Video corto (todo es «punta»): UNA sola pasada de principio a fin saca las fotos de la tira y los cuadros a la
    // vez. Saltar foto por foto en un WebM sin índice es lentísimo.
    if (tramos.length === 1) {
      const grande = new CanvasSink(pista, { height: 270 });
      const total = Math.ceil(duracion / PASO) || 1;
      const chico = new OffscreenCanvas(1, 72);
      let foto = 0;
      let siguiente = 0;
      let hechos = 0;
      for await (const { canvas, timestamp } of grande.canvases(0, duracion + 0.01)) {
        if (!opciones.vivo()) return;
        while (foto < opciones.fotos.length && timestamp + 0.02 >= opciones.fotos[foto]!) {
          chico.width = Math.round((72 * canvas.width) / canvas.height);
          chico.getContext('2d')!.drawImage(canvas, 0, 0, chico.width, 72);
          const imagen = await aJpeg(chico, 0.7);
          if (imagen) opciones.alFoto(foto, URL.createObjectURL(imagen));
          foto++;
        }
        if (timestamp + 0.02 < siguiente) continue;
        const imagen = await aJpeg(canvas, 0.8);
        if (imagen) opciones.alCuadro({ s: timestamp, imagen });
        siguiente = timestamp + PASO;
        opciones.alProgreso(Math.min(1, ++hechos / total));
      }
      opciones.alProgreso(1);
      return;
    }
    // Video largo: primero la tira de fotos (12 chiquitas), que es lo primero que se ve.
    const chica = new CanvasSink(pista, { height: 72 });
    let i = 0;
    for await (const r of chica.canvasesAtTimestamps(opciones.fotos)) {
      if (!opciones.vivo()) return;
      const imagen = r && (await aJpeg(r.canvas, 0.7));
      if (imagen) opciones.alFoto(i, URL.createObjectURL(imagen));
      i++;
    }
    // Después las puntas, cuadro por cuadro.
    const grande = new CanvasSink(pista, { height: 270 });
    const total = tramos.reduce((n, [a, b]) => n + Math.ceil((b - a) / PASO), 0) || 1;
    let hechos = 0;
    for (const [desde, hasta] of tramos) {
      let siguiente = desde;
      for await (const { canvas, timestamp } of grande.canvases(desde, hasta + 0.01)) {
        if (!opciones.vivo()) return;
        if (timestamp + 0.02 < siguiente) continue;
        const imagen = await aJpeg(canvas, 0.8);
        if (imagen) opciones.alCuadro({ s: timestamp, imagen });
        siguiente = timestamp + PASO;
        opciones.alProgreso(Math.min(1, ++hechos / total));
      }
    }
    opciones.alProgreso(1);
  } finally {
    input.dispose();
  }
}

/** Un cuadro listo para dibujar en otro lienzo, con sus medidas. */
export type CuadroSuelto = { imagen: HTMLCanvasElement; ancho: number; alto: number };

function copiar(origen: CanvasImageSource, ancho: number, alto: number): CuadroSuelto {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  c.getContext('2d')!.drawImage(origen, 0, 0, ancho, alto);
  return { imagen: c, ancho, alto };
}

/** ¿Este navegador decodifica con WebCodecs? (Sin eso, el plan B: el elemento de video.) */
export const hayWebCodecs = (): boolean => typeof VideoDecoder !== 'undefined';

/**
 * Saca cuadros sueltos de un video en la nube (miniatura para YouTube, C-MINIATURA). Primero con mediabunny y
 * WebCodecs (lee solo los pedazos que hacen falta); si el navegador no puede, plan B con un elemento de video que
 * salta al segundo pedido. Nunca devuelve un cuadro vacío: si todo falla, lanza error y la pantalla lo dice.
 */
export class LectorCuadros {
  private input: Input | null = null;
  private sink: CanvasSink | null = null;
  private video: HTMLVideoElement | null = null;
  /** Por dónde salió el último cuadro (para las pruebas y el registro). */
  modo: 'webcodecs' | 'video' | null = null;

  constructor(
    private readonly url: string,
    /** Dirección para el plan B (la copia MP4 si existe: Safari no abre WebM). */
    private readonly urlRespaldo: string,
    private readonly sinWebCodecs = !hayWebCodecs(),
  ) {}

  async cuadro(segundo: number): Promise<CuadroSuelto> {
    if (!this.sinWebCodecs) {
      try {
        const c = await this.conWebCodecs(segundo);
        this.modo = 'webcodecs';
        return c;
      } catch (e) {
        console.warn('miniatura: WebCodecs no pudo, sigue el plan B', e);
      }
    }
    const c = await this.conVideo(segundo);
    this.modo = 'video';
    return c;
  }

  private async conWebCodecs(segundo: number): Promise<CuadroSuelto> {
    if (!this.sink) {
      this.input = new Input({
        source: new UrlSource(this.url, { requestInit: { credentials: 'same-origin' } }),
        formats: ALL_FORMATS,
      });
      const pista = await this.input.getPrimaryVideoTrack();
      if (!pista || !(await pista.canDecode())) throw new Error('no se puede decodificar el video aquí');
      this.sink = new CanvasSink(pista, { poolSize: 0 });
    }
    const r = await this.sink.getCanvas(Math.max(0, segundo));
    if (!r) throw new Error('sin cuadro en ese segundo');
    return copiar(r.canvas, r.canvas.width, r.canvas.height);
  }

  private async conVideo(segundo: number): Promise<CuadroSuelto> {
    const v = this.video ?? document.createElement('video');
    if (!this.video) {
      this.video = v;
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.src = this.urlRespaldo;
    }
    const esperar = (evento: string) =>
      new Promise<void>((ok, mal) => {
        const t = setTimeout(() => mal(new Error(`el video no respondió (${evento})`)), 20_000);
        const listo = () => {
          clearTimeout(t);
          v.removeEventListener('error', fallo);
          ok();
        };
        const fallo = () => {
          clearTimeout(t);
          v.removeEventListener(evento, listo);
          mal(new Error('el video no se pudo abrir'));
        };
        v.addEventListener(evento, listo, { once: true });
        v.addEventListener('error', fallo, { once: true });
      });
    if (v.readyState < 1) await esperar('loadedmetadata');
    const fin = Number.isFinite(v.duration) ? Math.max(0, v.duration - 0.05) : segundo;
    const destino = Math.min(Math.max(0, segundo), fin);
    if (Math.abs(v.currentTime - destino) > 0.01 || v.readyState < 2) {
      const saltado = esperar('seeked');
      v.currentTime = destino;
      await saltado;
    }
    if (!v.videoWidth) throw new Error('el video no tiene imagen');
    return copiar(v, v.videoWidth, v.videoHeight);
  }

  cerrar(): void {
    this.input?.dispose();
    this.input = null;
    this.sink = null;
    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }
  }
}
