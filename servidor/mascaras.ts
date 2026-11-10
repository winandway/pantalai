// Máscaras del Estudio de reacciones (CANDADO C-MASCARAS, fase 3): nombre del programa, logo y colores, guardados por
// cuenta, con varios estilos para elegir. Piezas del servidor sin estado; las rutas viven en app.ts.
import { z } from 'zod';

/** Estilos de máscara: el neón de siempre, un noticiero con franjas sólidas y uno limpio sin brillos. */
export const ESTILOS_MASCARA = ['podcast', 'noticiero', 'minimal'] as const;
export type EstiloMascara = (typeof ESTILOS_MASCARA)[number];

/** Una cuenta guarda hasta 12 máscaras (de sobra para varios programas y nadie llena la base). */
export const MAX_MASCARAS = 12;
/** El logo llega ya achicado por el navegador (lado largo 512 px): 300 KB alcanzan de sobra. */
export const LOGO_MAX = 300_000;
export const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * Presupuesto de filas escritas (regla «la nube no se come el dinero»): guardar una máscara nueva = 1 fila + 1 del
 * límite de intentos; cambiarla = 1; poner o quitar el logo = 1 (+1 del límite al poner); borrarla = 1. Mirar la lista
 * y el logo no escribe nada. La prueba «presupuesto» de pruebas/mascaras.test.ts falla si se pasa.
 */
export const PRESUPUESTO_FILAS_MASCARA = { crear: 2, cambiar: 1, logo: 2, quitarLogo: 1, borrar: 1 } as const;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const esquemaMascara = z.object({
  nombre: z.string().trim().min(1).max(40),
  estilo: z.enum(ESTILOS_MASCARA),
  programa: z.string().trim().max(40).default(''),
  anfitrion: z.string().trim().max(24).default(''),
  rol: z.string().trim().max(20).default(''),
  principal: color,
  secundario: color,
  fondo: color,
});
export type DatosMascara = z.infer<typeof esquemaMascara>;

export const ID_MASCARA = /^[a-z0-9]{12}$/;

/** Dónde vive el logo en el almacén. */
export const claveLogo = (usuarioId: string, id: string) => `mascaras/${usuarioId}/${id}/logo`;

/**
 * El tipo REAL de la imagen, por sus primeros bytes (no se le cree a la cabecera): PNG, JPEG o WebP. null si no es
 * ninguno (un SVG, un HTML disfrazado, un archivo cualquiera).
 */
export function tipoDeImagen(b: Uint8Array): (typeof TIPOS_LOGO)[number] | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0]!, b[1]!, b[2]!, b[3]!) === 'RIFF' &&
    String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

export type FilaMascara = DatosMascara & {
  id: string;
  usuario_id: string;
  tiene_logo: number;
  actualizado: number;
};

/** Lo que ve el navegador (sin el dueño), con la dirección del logo versionada para que no quede uno viejo. */
export function mascaraPublica(f: FilaMascara) {
  return {
    id: f.id,
    nombre: f.nombre,
    estilo: f.estilo,
    programa: f.programa,
    anfitrion: f.anfitrion,
    rol: f.rol,
    principal: f.principal,
    secundario: f.secundario,
    fondo: f.fondo,
    logo: f.tiene_logo ? `/media/mascaras/${f.id}/logo?v=${f.actualizado}` : null,
    actualizado: f.actualizado,
  };
}
