// Subir una imagen (regla global: TODA casilla de imagen ofrece «Subir desde archivos» y «Tomar foto»). Lo puro y lo
// que achica la imagen en el navegador, para que pase siempre por la misma validación y compresión. CANDADO C-CAMARA-FOTO.

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const ACEPTA_IMAGEN = TIPOS_IMAGEN.join(',');
/** Más de esto no se intenta ni leer (una foto de celular pesa 3 a 8 MB). */
export const IMAGEN_MAX_ENTRADA = 15_000_000;

export type ErrorImagen = 'tipo' | 'pesada' | 'ilegible';
export type ErrorCamara = 'sin_permiso' | 'sin_camara' | 'ocupada' | 'otro';

export function imagenAceptable(a: { type: string; size: number }): ErrorImagen | null {
  if (!(TIPOS_IMAGEN as readonly string[]).includes(a.type)) return 'tipo';
  if (a.size <= 0 || a.size > IMAGEN_MAX_ENTRADA) return 'pesada';
  return null;
}

/** Medida achicada (sin agrandar nunca) con el lado largo en `maximo`, en números enteros. */
export function medidaAchicada(ancho: number, alto: number, maximo: number): { ancho: number; alto: number } {
  if (ancho <= 0 || alto <= 0) return { ancho: 0, alto: 0 };
  const f = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * f)), alto: Math.max(1, Math.round(alto * f)) };
}

/** ¿Es un celular o una tableta? Ahí «Tomar foto» abre la cámara trasera del sistema; en la computadora, la webcam. */
export function esCelular(agente: string, dedo: boolean): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(agente) || (dedo && /Macintosh/.test(agente));
}

/** Por qué no se pudo abrir la cámara, en palabras de la persona. */
export function errorDeCamara(e: unknown): ErrorCamara {
  const n = (e as { name?: string })?.name ?? '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'sin_permiso';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'sin_camara';
  if (n === 'NotReadableError' || n === 'AbortError') return 'ocupada';
  return 'otro';
}

/** Achica la imagen en el navegador y la devuelve en PNG (conserva lo transparente de un logo). */
export async function achicarImagen(archivo: Blob, maximo = 512): Promise<Blob> {
  const foto = await createImageBitmap(archivo);
  const m = medidaAchicada(foto.width, foto.height, maximo);
  const lienzo = document.createElement('canvas');
  lienzo.width = m.ancho;
  lienzo.height = m.alto;
  lienzo.getContext('2d')!.drawImage(foto, 0, 0, m.ancho, m.alto);
  foto.close();
  const png = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/png'));
  if (!png) throw new Error('ilegible');
  // Un logo fotografiado puede pesar mucho en PNG: entonces va en WebP, que es mucho más liviano.
  if (png.size <= 280_000) return png;
  const webp = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/webp', 0.9));
  if (!webp) throw new Error('ilegible');
  return webp;
}

/** Blob → «data:…» (para guardarlo en el borrador del formulario y que no se pierda al recargar). */
export function aDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(r.error);
    r.readAsDataURL(b);
  });
}

/** «data:…» → Blob (para subirlo). */
export async function deDataUrl(d: string): Promise<Blob> {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(d);
  if (!m) throw new Error('ilegible');
  const bin = atob(m[2]!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}
