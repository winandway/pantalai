// Reporte de error (CANDADO C-REPORTE-ERROR): lo que llega de la extensión pasa por zod y se vuelve a limpiar aquí,
// aunque el navegador ya lo haya limpiado (lo de afuera nunca se cree).
import { z } from 'zod';
import {
  NIVELES,
  TOPES,
  limpiarTexto,
  limpiarUrl,
  type NivelConsola,
  type Registros,
} from '../web/src/logica/registros';

/** Tope del cuerpo crudo (un poco más que el tope del JSON limpio, por los espacios y la cabecera). */
export const REGISTROS_MAX_BYTES = TOPES.bytes + 16 * 1024;

const segundo = z
  .number()
  .min(0)
  .max(24 * 3600);

export const esquemaRegistros = z.object({
  consola: z
    .array(
      z.object({
        s: segundo,
        nivel: z.enum(NIVELES as [NivelConsola, ...NivelConsola[]]),
        texto: z
          .string()
          .min(1)
          .max(TOPES.texto * 2),
        antes: z.boolean().optional(),
      }),
    )
    .max(TOPES.consola),
  red: z
    .array(
      z.object({
        s: segundo,
        metodo: z.string().min(1).max(10),
        url: z
          .string()
          .min(1)
          .max(TOPES.url * 2),
        estado: z.number().int().min(0).max(999),
        ms: z
          .number()
          .min(0)
          .max(24 * 3600 * 1000),
        tipo: z.string().max(30),
        antes: z.boolean().optional(),
      }),
    )
    .max(TOPES.red),
  pagina: z
    .object({ url: z.string().max(TOPES.url * 2), titulo: z.string().max(300) })
    .default({ url: '', titulo: '' }),
  navegador: z.string().max(300).default(''),
});

export type DatosRegistros = z.infer<typeof esquemaRegistros>;

/** Segunda limpieza en el servidor: direcciones y textos sin secretos, y solo los campos conocidos. */
export function limpiarEnServidor(d: DatosRegistros): Registros & {
  pagina: { url: string; titulo: string };
  navegador: string;
} {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    consola: d.consola.map((e) => ({
      s: r1(e.s),
      nivel: e.nivel,
      texto: limpiarTexto(e.texto),
      ...(e.antes ? { antes: true } : {}),
    })),
    red: d.red.map((e) => ({
      s: r1(e.s),
      metodo:
        e.metodo
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 10) || 'GET',
      url: limpiarUrl(e.url),
      estado: e.estado,
      ms: Math.round(e.ms),
      tipo: e.tipo,
      ...(e.antes ? { antes: true } : {}),
    })),
    pagina: {
      url: d.pagina.url ? limpiarUrl(d.pagina.url) : '',
      titulo: limpiarTexto(d.pagina.titulo).slice(0, 300),
    },
    navegador: d.navegador.slice(0, 300),
  };
}
