// Invitado remoto del Estudio (CANDADO C-INVITADO): piezas del servidor sin estado. Las rutas viven en app.ts.
// Saludo WebRTC SIN goteo de candidatos: cada lado espera a terminar de juntar sus rutas (ICE) y manda UNA sola
// descripción. Así una entrevista escribe poquísimas filas y no hace falta un Durable Object ni un Worker aparte.
import { z } from 'zod';

/** El enlace del invitado vale 24 horas. */
export const VENCE_SALA_MS = 24 * 3600 * 1000;
/** Código del enlace: 32 letras y números al azar (unos 165 bits: no se puede adivinar). */
export const CODIGO_SALA = /^[a-z0-9]{32}$/;
/** Asiento: lo genera el navegador del invitado y lo guarda; con él vuelve a entrar si se le cae la conexión. */
export const ASIENTO = /^[a-f0-9]{32}$/;
/** Una descripción completa (con todas sus rutas) pesa unos pocos KB; más de esto no es una descripción. */
export const SDP_MAX = 30_000;
/** Reintentos del invitado por ventana: cada uno escribe 2 filas (su intento y la sala). */
export const OFERTAS_MAX = 20;
export const VENTANA_OFERTAS_MS = 15 * 60 * 1000;

/**
 * Presupuesto de filas escritas (regla «la nube no se come el dinero»). Una entrevista normal, sin cortes:
 * crear la sala (1 sala + 1 intento) + la oferta del invitado (1 intento + 1 sala) + la respuesta (1) + cerrarla (1)
 * = 6. Mirar, esperar y consultar no escriben nada. Cada reconexión suma 3 (oferta 2 + respuesta 1).
 * La prueba «presupuesto de escrituras» de pruebas/invitado.test.ts falla si se pasa.
 */
export const PRESUPUESTO_FILAS = { entrevista: 8, reconexion: 3 } as const;

const descripcion = z
  .string()
  .max(SDP_MAX)
  .refine((s) => s.startsWith('v=0'), 'sdp');

export const esquemaOferta = z.object({
  nombre: z.string().trim().min(1).max(40),
  asiento: z.string().regex(ASIENTO),
  sdp: descripcion,
});

export const esquemaRespuesta = z.object({
  intento: z.number().int().min(1).max(100_000),
  sdp: descripcion,
});

export type EnvTurn = { TURN_LLAVE_ID?: string; TURN_LLAVE_TOKEN?: string };
export type ServidorIce = { urls: string | string[]; username?: string; credential?: string };

/** STUN público de Cloudflare: gratis y sin llave. Sirve cuando las dos redes dejan conectar directo. */
export const STUN: ServidorIce = { urls: ['stun:stun.cloudflare.com:3478'] };

/** ¿Está puesta la llave del puente TURN (variables del sitio)? Sin ella se usa solo STUN. */
export function turnConfigurado(env: EnvTurn): boolean {
  return Boolean(env.TURN_LLAVE_ID?.trim() && env.TURN_LLAVE_TOKEN?.trim());
}

/**
 * El puerto 53 lo bloquean los navegadores: sin goteo de candidatos, esa ruta haría esperar hasta que venza.
 * (Lo avisa la guía oficial de Cloudflare.)
 */
export function sinPuerto53(lista: ServidorIce[]): ServidorIce[] {
  return lista
    .map((s) => {
      const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u));
      return { ...s, urls };
    })
    .filter((s) => s.urls.length > 0);
}

/**
 * Los servidores ICE para un navegador. Con la llave TURN, el servidor pide a Cloudflare credenciales de corta vida
 * (la llave nunca sale de aquí). Si Cloudflare no responde, se sigue con STUN y queda en el registro de errores.
 */
export async function servidoresIce(
  env: EnvTurn,
  pedir: typeof fetch = fetch,
): Promise<{ iceServers: ServidorIce[]; turn: boolean }> {
  if (!turnConfigurado(env)) return { iceServers: [STUN], turn: false };
  try {
    const r = await pedir(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_LLAVE_ID!.trim())}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.TURN_LLAVE_TOKEN!.trim()}`,
          'Content-Type': 'application/json',
        },
        // Lo que dura el enlace: una entrevista larga no se queda sin puente a mitad.
        body: JSON.stringify({ ttl: VENCE_SALA_MS / 1000 }),
      },
    );
    if (!r.ok) throw new Error(`turn ${r.status}`);
    const d = (await r.json()) as { iceServers?: ServidorIce[] | ServidorIce };
    const lista = Array.isArray(d.iceServers) ? d.iceServers : d.iceServers ? [d.iceServers] : [];
    const limpia = sinPuerto53(lista);
    if (!limpia.length) throw new Error('turn sin servidores');
    return { iceServers: limpia, turn: true };
  } catch (e) {
    console.error('invitado: el puente TURN no respondió, se sigue con STUN', e);
    return { iceServers: [STUN], turn: false };
  }
}

/** El primer nombre del anfitrión (lo que ve el invitado). */
export function primerNombre(nombre: string): string {
  return (nombre.trim().split(/\s+/)[0] ?? '').slice(0, 24);
}
