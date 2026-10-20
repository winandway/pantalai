// Piezas de seguridad del servidor: claves, sesiones, límite de intentos, escudo anti-robots y cabeceras.

const codificador = new TextEncoder();

export function aHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function aleatorio(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return aHex(arr);
}

/** Identificador corto para enlaces públicos: 20 caracteres de letras y números. */
export function nuevoId(largo = 20): string {
  const letras = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(largo);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => letras[b % letras.length]).join('');
}

export async function sha256(texto: string): Promise<string> {
  return aHex(await crypto.subtle.digest('SHA-256', codificador.encode(texto)));
}

// Workers acepta hasta 100 000 vueltas de PBKDF2.
const VUELTAS = 100_000;

export async function hashClave(clave: string, sal: string): Promise<string> {
  const llave = await crypto.subtle.importKey('raw', codificador.encode(clave), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: codificador.encode(sal), iterations: VUELTAS },
    llave,
    256,
  );
  return aHex(bits);
}

/** Compara sin filtrar por tiempo cuántos caracteres coinciden. */
export function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const COOKIE_SESION = 'pantalai_sesion';
export const DURACION_SESION_MS = 30 * 24 * 3600 * 1000;

export function leerCookie(cabecera: string | null | undefined, nombre: string): string | null {
  if (!cabecera) return null;
  for (const parte of cabecera.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieSesion(token: string, segura: boolean, maxAgeSeg: number): string {
  return [
    `${COOKIE_SESION}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeg}`,
    segura ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/** Límite de intentos por acción e IP en una ventana de tiempo. Devuelve true si todavía puede. */
export async function dentroDelLimite(
  db: D1Database,
  accion: string,
  ip: string,
  maximo: number,
  ventanaMs: number,
  ahora = Date.now(),
): Promise<boolean> {
  const clave = `${accion}:${ip}`;
  const desde = ahora - ventanaMs;
  const fila = await db
    .prepare('SELECT COUNT(*) AS n FROM intentos WHERE clave = ? AND momento > ?')
    .bind(clave, desde)
    .first<{ n: number }>();
  if ((fila?.n ?? 0) >= maximo) return false;
  await db.batch([
    db.prepare('INSERT INTO intentos (clave, momento) VALUES (?, ?)').bind(clave, ahora),
    db.prepare('DELETE FROM intentos WHERE momento < ?').bind(ahora - 24 * 3600 * 1000),
  ]);
  return true;
}

/**
 * Escudo anti-robots (Cloudflare Turnstile). Se apaga solo si no hay clave secreta.
 * Si Cloudflare no responde, se deja pasar: detrás siguen la contraseña y el límite de intentos.
 */
export async function pasaTurnstile(
  secreto: string | undefined,
  pase: string | null | undefined,
  ip: string,
  pedir: typeof fetch = fetch,
): Promise<boolean> {
  if (!secreto) return true;
  if (!pase) return false;
  try {
    const cuerpo = new FormData();
    cuerpo.append('secret', secreto);
    cuerpo.append('response', pase);
    cuerpo.append('remoteip', ip);
    const r = await pedir('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: cuerpo,
    });
    if (!r.ok) return true;
    const datos = (await r.json()) as { success?: boolean };
    return datos.success === true;
  } catch (e) {
    console.error('turnstile sin respuesta, se deja pasar', e);
    return true;
  }
}

export const CABECERAS_SEGURIDAD: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(self "https://js.stripe.com")',
  'Content-Security-Policy': [
    "default-src 'self'",
    // Stripe: la tarjeta se escribe en el cuadro seguro de Stripe DENTRO de nuestra página (Payment Element).
    "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.stripe.com",
    "media-src 'self' blob:",
    "connect-src 'self' https://cloudflareinsights.com https://api.stripe.com",
    "worker-src 'self' blob:",
    'frame-src https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com',
    "frame-ancestors 'self'",
  ].join('; '),
  'X-Frame-Options': 'SAMEORIGIN',
};
