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
