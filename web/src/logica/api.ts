// Llamadas al servidor. Toda escritura lleva la cabecera propia (el servidor la exige).
import { origenPublico } from './sitio';
import type { Capitulo, Segmento, Tramo } from './tiempo';

export class ErrorApi extends Error {
  constructor(
    public codigo: string,
    public estado: number,
  ) {
    super(codigo);
  }
}

export async function pedir<T>(ruta: string, opciones: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...resto } = opciones;
  const h = new Headers(headers);
  if (resto.method && resto.method !== 'GET') h.set('x-pantalai', '1');
  if (json !== undefined) h.set('content-type', 'application/json');
  let r: Response;
  try {
    r = await fetch(ruta, {
      ...resto,
      headers: h,
      body: json !== undefined ? JSON.stringify(json) : resto.body,
      credentials: 'same-origin',
    });
  } catch {
    throw new ErrorApi('sin_red', 0);
  }
  const datos = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new ErrorApi(datos.error ?? 'servidor', r.status);
  return datos;
}

export type Usuario = {
  id: string;
  correo: string;
  nombre: string;
  superadmin?: boolean;
  panel?: string | null;
};

export type Superposicion = {
  tipo: 'texto' | 'flecha' | 'recuadro' | 'difuminar';
  inicio: number;
  fin: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  texto: string;
};

export type Video = {
  id: string;
  tiene_mp4?: boolean;
  marca?: boolean;
  /** La marca de agua ya va grabada dentro de la imagen. */
  marca_grabada?: boolean;
  titulo: string;
  descripcion: string;
  estado: string;
  tipo: string;
  bytes: number;
  duracion: number;
  ancho: number;
  alto: number;
  privacidad: 'enlace' | 'privado';
  carpeta_id: string | null;
  archivado: boolean;
  tiene_miniatura: boolean;
  idioma: 'en' | 'es';
  transcripcion: Segmento[];
  capitulos: Capitulo[];
  cortes: Tramo[];
  recorte_inicio: number;
  recorte_fin: number;
  superposiciones: Superposicion[];
  cta_texto: string;
  cta_url: string;
  permitir_descarga: boolean;
  permitir_comentarios: boolean;
  creado: number;
  actualizado: number;
  autor: string;
  es_dueno: boolean;
};

export type VideoLista = {
  id: string;
  titulo: string;
  estado: string;
  duracion: number;
  creado: number;
  carpeta_id: string | null;
  privacidad: string;
  tiene_miniatura: number;
  archivado: number;
  vistas: number;
  comentarios: number;
};

export type Carpeta = { id: string; nombre: string; videos: number };

export type Comentario = {
  id: string;
  nombre: string;
  texto: string;
  segundo: number | null;
  creado: number;
  usuario_id: string | null;
};

export type Estadisticas = {
  vistas: number;
  promedio_segundos: number;
  completado_pct: number;
  cta_clics: number;
  cta_pct: number;
  por_dia: { dia: string; vistas: number }[];
};

export const enlaceVideo = (id: string) => `${origenPublico()}/v/${id}`;
export const archivoVideo = (id: string) => `/media/${id}/video`;
export const miniaturaVideo = (id: string, v = 0) => `/media/${id}/miniatura?v=${v}`;

/** Visitante anónimo para contar vistas únicas sin cookies. */
export function visitante(): string {
  try {
    let v = localStorage.getItem('pantalai:visitante');
    if (!v) {
      v = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');
      localStorage.setItem('pantalai:visitante', v);
    }
    return v;
  } catch {
    return 'anonimo00';
  }
}

/** Lo que permite el plan de la cuenta (lo manda /datos/plan; con el cobro apagado, todo). */
export type LimitesPlan = {
  videos: number | null;
  minutos: number | null;
  calidad: '720' | '1080' | '2160';
  ia: boolean;
  lapices: boolean;
  marca: boolean;
};
