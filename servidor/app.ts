// Servidor de PANTALAI. Corre en YaDominios Cloud como _worker.js.
// Rutas de datos bajo /datos y archivos bajo /media (NUNCA /api: choca con los estáticos).
import { Hono, type Context } from 'hono';
import {
  correoBienvenida,
  correoClaveCambiada,
  correoListo,
  correoPagoFallido,
  correoPagoRecibido,
  correoPlanActivo,
  correoPlanCancelado,
  correoRecuperar,
  enviar,
  type EnvCorreo,
  type Idioma,
  type Mensaje,
} from './correo';
import {
  archivoGoogle,
  codigosGoogle,
  DOMINIO,
  prepararCabecera,
  redireccion,
  robots,
  sitemap,
} from './dominio';
import { cobroActivo, esPlan, limitesDe, PRECIOS, type Limites, type Plan } from './planes';
import {
  cancelarAlFinal,
  crearCliente,
  crearSuscripcion,
  ErrorPago,
  firmaValida,
  leerAviso,
  leerFactura,
  pagoListo,
  precioDe,
  ingresoMensual,
  cambiarPlan,
  cancelarAhora,
  leerSuscripcion,
  VIVA,
  type EnvPago,
} from './pagos';
import { z } from 'zod';
import {
  CABECERAS_SEGURIDAD,
  COOKIE_SESION,
  DURACION_SESION_MS,
  aleatorio,
  cookieSesion,
  dentroDelLimite,
  hashClave,
  iguales,
  leerCookie,
  nuevoId,
  pasaTurnstile,
  sha256,
  yaExcedido,
} from './seguridad';
import {
  ErrorIA,
  PLANTILLAS,
  analizar,
  gastoDelMes,
  generar,
  iaConfigurada,
  muletillas,
  topes,
  transcribir,
  type Palabra,
  type Plantilla,
  type Segmento,
} from './ia/motor';

export type Env = EnvPago &
  EnvCorreo & {
    DB: D1Database;
    BUCKET: R2Bucket;
    ASSETS?: Fetcher;
    TURNSTILE_SECRET?: string;
    TURNSTILE_SITE_KEY?: string;
    CF_ACCOUNT_ID?: string;
    CF_AI_TOKEN?: string;
    GEMINI_API_KEY?: string;
    IA_TOPE_USD_MES?: string;
    IA_TOPE_MINUTOS_DIA?: string;
    /** Códigos de verificación de Google Search Console (meta y archivo), separados por coma. */
    GOOGLE_VERIFICACION?: string;
    /** Correos de las cuentas superadmin (Soporte), separados por coma. Sin esto el panel no existe para nadie. */
    SUPERADMIN_CORREOS?: string;
    /** Dirección secreta del panel de superadmin (secreta). */
    SUPERADMIN_RUTA?: string;
    /** Días gratis de la primera suscripción (0 = cobra al momento). */
    PAGO_DIAS_PRUEBA?: string;
    /** Gigas de almacenamiento que trae el plan del sitio en YaDominios (Galaxia: 20). */
    ALMACEN_LIMITE_GB?: string;
    /** Correos al día que trae el plan del sitio (Galaxia: 300). */
    CORREO_CUOTA_DIA?: string;
    /** «1» enciende los límites de los planes (solo con la pasarela de pago probada). */
    COBRO_ACTIVO?: string;
  };

type Usuario = { id: string; correo: string; nombre: string };
type Vars = { usuario: Usuario | null };
type C = Context<{ Bindings: Env; Variables: Vars }>;

declare const COMMIT_PUBLICADO: string;
const COMMIT = typeof COMMIT_PUBLICADO === 'string' ? COMMIT_PUBLICADO : 'local';

export const PARTE_MIN = 5 * 1024 * 1024;
const PARTE_MAX = 20 * 1024 * 1024;
const MINIATURA_MAX = 2 * 1024 * 1024;

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ---------- utilidades ----------

const err = (c: C, estado: number, codigo: string) =>
  c.json({ error: codigo }, estado as 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500);

function ip(c: C): string {
  return (
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  );
}

async function cuerpo<T>(c: C, esquema: z.ZodType<T>): Promise<T | null> {
  try {
    const r = esquema.safeParse(await c.req.json());
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

const claveVideo = (id: string) => `videos/${id}/video`;
const claveMiniatura = (id: string) => `videos/${id}/miniatura.jpg`;
const claveMp4 = (id: string) => `videos/${id}/video.mp4`;

type FilaVideo = {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  tipo: string;
  bytes: number;
  duracion: number;
  ancho: number;
  alto: number;
  privacidad: string;
  carpeta_id: string | null;
  archivado: number;
  subida_id: string | null;
  tiene_miniatura: number;
  idioma: string;
  transcripcion: string;
  capitulos: string;
  cortes: string;
  recorte_inicio: number;
  recorte_fin: number;
  superposiciones: string;
  cta_texto: string;
  cta_url: string;
  permitir_descarga: number;
  permitir_comentarios: number;
  creado: number;
  actualizado: number;
};

function jsonSeguro(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return [];
  }
}

function videoPublico(v: FilaVideo, autor: string, esDueno: boolean, tieneMp4 = false, marca = false) {
  return {
    tiene_mp4: tieneMp4,
    /** «Hecho con Pantalay» (plan gratis del dueño, solo con el cobro encendido). */
    marca,
    id: v.id,
    titulo: v.titulo,
    descripcion: v.descripcion,
    estado: v.estado,
    tipo: v.tipo,
    bytes: v.bytes,
    duracion: v.duracion,
    ancho: v.ancho,
    alto: v.alto,
    privacidad: v.privacidad,
    carpeta_id: v.carpeta_id,
    archivado: v.archivado === 1,
    tiene_miniatura: v.tiene_miniatura === 1,
    idioma: v.idioma,
    transcripcion: jsonSeguro(v.transcripcion),
    capitulos: jsonSeguro(v.capitulos),
    cortes: jsonSeguro(v.cortes),
    recorte_inicio: v.recorte_inicio,
    recorte_fin: v.recorte_fin,
    superposiciones: jsonSeguro(v.superposiciones),
    cta_texto: v.cta_texto,
    cta_url: v.cta_url,
    permitir_descarga: v.permitir_descarga === 1,
    permitir_comentarios: v.permitir_comentarios === 1,
    creado: v.creado,
    actualizado: v.actualizado,
    autor,
    es_dueno: esDueno,
  };
}

async function buscarVideo(c: C, id: string): Promise<FilaVideo | null> {
  return c.env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first<FilaVideo>();
}

/** El dueño ve todo; los demás solo videos listos con privacidad «enlace». */
function puedeVer(v: FilaVideo, u: Usuario | null): boolean {
  if (u && u.id === v.usuario_id) return true;
  return v.estado === 'listo' && v.privacidad === 'enlace';
}

// ---------- dirección principal: pantalay.com ----------

app.use('*', async (c, next) => {
  const destino = redireccion(c.req.url, c.req.method);
  if (destino) return c.redirect(destino, 301);
  await next();
});

app.get('/sitemap.xml', (c) => c.body(sitemap(), 200, { 'content-type': 'application/xml; charset=utf-8' }));
app.get('/robots.txt', (c) => c.text(robots()));
app.get('/:archivo{google[A-Za-z0-9_-]+\\.html}', (c) => {
  const texto = archivoGoogle(c.req.param('archivo'), codigosGoogle(c.env.GOOGLE_VERIFICACION));
  return texto ? c.text(texto) : c.notFound();
});

// ---------- cabeceras y sesión en todas las peticiones ----------

app.use('*', async (c, next) => {
  const token = leerCookie(c.req.header('cookie'), COOKIE_SESION);
  let usuario: Usuario | null = null;
  if (token && c.env.DB) {
    const fila = await c.env.DB.prepare(
      `SELECT u.id, u.correo, u.nombre, s.vence FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = ? AND u.id NOT IN (SELECT usuario_id FROM suspensiones)`,
    )
      .bind(await sha256(token))
      .first<Usuario & { vence: number }>();
    if (fila && fila.vence > Date.now()) usuario = { id: fila.id, correo: fila.correo, nombre: fila.nombre };
  }
  c.set('usuario', usuario);
  // Dirección IP bloqueada desde el superadmin: no puede usar Pantalay. El superadmin nunca se bloquea a sí mismo.
  if (c.env.DB && !esSuperadmin(c)) {
    const bloqueada = await c.env.DB.prepare('SELECT 1 FROM ips_bloqueadas WHERE ip = ?').bind(ip(c)).first();
    if (bloqueada) {
      c.res = err(c, 403, 'ip_bloqueada');
      for (const [k, v] of Object.entries(CABECERAS_SEGURIDAD)) c.res.headers.set(k, v);
      return;
    }
  }
  await next();
  for (const [k, v] of Object.entries(CABECERAS_SEGURIDAD)) {
    if (!c.res.headers.has(k)) c.res.headers.set(k, v);
  }
  if (new URL(c.req.url).pathname.startsWith('/embed/')) {
    // El reproductor para insertar se puede mostrar dentro de otras páginas.
    c.res.headers.delete('X-Frame-Options');
    c.res.headers.set(
      'Content-Security-Policy',
      (c.res.headers.get('Content-Security-Policy') ?? '').replace(
        "frame-ancestors 'self'",
        'frame-ancestors *',
      ),
    );
  }
});

// Las escrituras exigen una cabecera propia: un formulario de otro sitio no la puede mandar.
app.use('/datos/*', async (c, next) => {
  // El aviso de Stripe no trae nuestra cabecera: se protege con su firma (ver /datos/pago/aviso).
  const esAviso = new URL(c.req.url).pathname === '/datos/pago/aviso';
  if (!esAviso && c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.header('x-pantalai') !== '1') {
    return err(c, 403, 'origen');
  }
  await next();
});

const requiereSesion = async (c: C, next: () => Promise<void>) => {
  if (!c.get('usuario')) return err(c, 401, 'sin_sesion');
  await next();
};

// ---------- superadmin ----------

/** Correo en la lista del sitio (SUPERADMIN_CORREOS). */
function correoSuperadmin(env: Env, correo: string): boolean {
  return (env.SUPERADMIN_CORREOS ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(correo.toLowerCase());
}

/**
 * La dirección secreta del panel (variable del sitio SUPERADMIN_RUTA, secreta, nunca en el código ni en git).
 * Sin ella, o si es corta, el panel no existe para nadie.
 */
export function rutaPanel(env: { SUPERADMIN_RUTA?: string }): string | null {
  const r = (env.SUPERADMIN_RUTA ?? '').trim().replace(/\/+$/, '');
  return /^\/[A-Za-z0-9/_-]{16,200}$/.test(r) ? r : null;
}

/** Superadmin = sesión abierta + correo en la lista + el panel tiene su dirección secreta configurada. */
function esSuperadmin(c: C): boolean {
  const u = c.get('usuario');
  return Boolean(u && rutaPanel(c.env) && correoSuperadmin(c.env, u.correo));
}

/** Firma corta para que el superadmin vea un video privado desde el panel (vale hoy y para ese video). */
async function firmaPanel(
  env: Env,
  videoId: string,
  dia = Math.floor(Date.now() / 86_400_000),
): Promise<string> {
  return (await sha256(`${rutaPanel(env)}|${videoId}|${dia}`)).slice(0, 32);
}

async function firmaPanelValida(env: Env, videoId: string, firma: string | undefined): Promise<boolean> {
  if (!firma || !rutaPanel(env)) return false;
  const hoy = Math.floor(Date.now() / 86_400_000);
  for (const d of [hoy, hoy - 1]) if (iguales(await firmaPanel(env, videoId, d), firma)) return true;
  return false;
}

async function anotarIntento(c: C, detalle: string) {
  // Se anotan los primeros intentos de cada dirección de internet; si alguien insiste sin parar, no llena la base.
  if (!(await dentroDelLimite(c.env.DB, 'intento', ip(c), 30, 15 * 60 * 1000))) return;
  await c.env.DB.prepare(
    'INSERT INTO registro_admin (admin_id, accion, objetivo, momento) VALUES (?, ?, ?, ?)',
  )
    .bind(c.get('usuario')?.id ?? 'sin_sesion', 'intento', `${ip(c)} · ${detalle}`.slice(0, 300), Date.now())
    .run();
}

/**
 * Los datos del panel piden TRES cosas: ser superadmin, mandar la dirección secreta en la cabecera «x-panel»
 * (la página la toma de su propia dirección) y no estar golpeando la puerta. Si falla algo: 404, como si el
 * panel no existiera, y el intento queda anotado.
 */
const requiereSuperadmin = async (c: C, next: () => Promise<void>) => {
  // Solo cuentan los fallos: el uso normal del panel (muchas peticiones) nunca deja afuera al superadmin.
  if (await yaExcedido(c.env.DB, 'panel', ip(c), 30, 15 * 60 * 1000)) return err(c, 429, 'demasiados');
  const ruta = rutaPanel(c.env);
  const enviada = c.req.header('x-panel') ?? '';
  if (!ruta || !esSuperadmin(c) || !iguales(enviada.replace(/\/+$/, ''), ruta)) {
    await dentroDelLimite(c.env.DB, 'panel', ip(c), 30, 15 * 60 * 1000);
    await anotarIntento(c, new URL(c.req.url).pathname);
    return err(c, 404, 'ruta');
  }
  await next();
};

async function anotarAdmin(c: C, accion: string, objetivo = '') {
  await c.env.DB.prepare(
    'INSERT INTO registro_admin (admin_id, accion, objetivo, momento) VALUES (?, ?, ?, ?)',
  )
    .bind(c.get('usuario')!.id, accion, objetivo, Date.now())
    .run();
}

// ---------- salud y configuración ----------

app.get('/datos/salud', async (c) => {
  const piezas: Record<string, 'ok' | 'error'> = {};
  try {
    await c.env.DB.prepare('SELECT 1').first();
    piezas.base = 'ok';
  } catch (e) {
    console.error('salud: base', e);
    piezas.base = 'error';
  }
  try {
    await c.env.BUCKET.head('salud');
    piezas.almacen = 'ok';
  } catch (e) {
    console.error('salud: almacén', e);
    piezas.almacen = 'error';
  }
  const ok = Object.values(piezas).every((p) => p === 'ok');
  // La IA no tumba la salud del sitio: se informa aparte (encendida o apagada, y el gasto del mes).
  let ia: Record<string, unknown> = { ...iaConfigurada(c.env) };
  try {
    const g = await gastoDelMes(c.env.DB);
    ia = { ...ia, usd_mes: Math.round(g.usd * 10000) / 10000, tope_usd_mes: topes(c.env).usdMes };
  } catch (e) {
    console.error('salud: gasto de IA', e);
    ia.gasto = 'error';
  }
  return c.json(
    {
      ok,
      piezas,
      ia,
      turnstile: Boolean(c.env.TURNSTILE_SECRET),
      // Canario del cobro: claves de Stripe puestas (secreta, publicable y la del aviso) y límites encendidos.
      pago: { listo: pagoListo(c.env), cobro_activo: cobroActivo(c.env) },
      correo: correoListo(c.env),
      commit: COMMIT,
    },
    ok ? 200 : 500,
    {
      'Cache-Control': 'no-store',
    },
  );
});

app.get('/datos/config', (c) =>
  c.json({ turnstile_site_key: c.env.TURNSTILE_SITE_KEY ?? null, commit: COMMIT }),
);

// ---------- cuentas ----------

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(1).max(80),
  correo: z.string().trim().toLowerCase().email().max(200),
  clave: z.string().min(8).max(200),
  idioma: z.enum(['en', 'es']).optional(),
});

// ---------- correo ----------

/** Hace un trabajo después de responder (si se puede), para que un correo lento no frene a nadie. */
function despues(c: C, trabajo: Promise<unknown>) {
  try {
    c.executionCtx.waitUntil(trabajo);
  } catch {
    // Sin contexto de ejecución (pruebas): se espera aquí mismo, sin romper la respuesta.
    void trabajo;
  }
}

async function idiomaDe(c: C, usuarioId: string): Promise<Idioma> {
  const f = await c.env.DB.prepare('SELECT idioma FROM perfil WHERE usuario_id = ?')
    .bind(usuarioId)
    .first<{ idioma: string }>();
  return f?.idioma === 'es' ? 'es' : 'en';
}

/** Escribe a una cuenta en su idioma. */
async function escribir(
  c: C,
  usuarioId: string,
  hacer: (idioma: Idioma, nombre: string) => Omit<Mensaje, 'para'>,
): Promise<boolean> {
  const u = await c.env.DB.prepare('SELECT correo, nombre FROM usuarios WHERE id = ?')
    .bind(usuarioId)
    .first<{ correo: string; nombre: string }>();
  if (!u) return false;
  const ok = await enviar(c.env, { para: u.correo, ...hacer(await idiomaDe(c, usuarioId), u.nombre) });
  await c.env.DB.prepare(
    `INSERT INTO correo_dia (dia, enviados, fallidos) VALUES (?, ?, ?)
     ON CONFLICT (dia) DO UPDATE SET enviados = enviados + excluded.enviados, fallidos = fallidos + excluded.fallidos`,
  )
    .bind(new Date().toISOString().slice(0, 10), ok ? 1 : 0, ok ? 0 : 1)
    .run();
  return ok;
}
const esquemaEntrar = z.object({
  correo: z.string().trim().toLowerCase().email().max(200),
  clave: z.string().min(1).max(200),
});

async function abrirSesion(c: C, usuarioId: string) {
  const token = aleatorio(32);
  const ahora = Date.now();
  await c.env.DB.prepare('INSERT INTO sesiones (token_hash, usuario_id, creada, vence) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), usuarioId, ahora, ahora + DURACION_SESION_MS)
    .run();
  // Cada entrada queda anotada (para la ficha del cliente en el superadmin).
  await c.env.DB.prepare('INSERT INTO accesos (usuario_id, ip, pais, agente, momento) VALUES (?, ?, ?, ?, ?)')
    .bind(
      usuarioId,
      ip(c),
      c.req.header('cf-ipcountry') ?? '',
      (c.req.header('user-agent') ?? '').slice(0, 200),
      ahora,
    )
    .run();
  const segura = new URL(c.req.url).protocol === 'https:';
  c.header('Set-Cookie', cookieSesion(token, segura, DURACION_SESION_MS / 1000));
}

app.post('/datos/registro', async (c) => {
  if (!(await dentroDelLimite(c.env.DB, 'registro', ip(c), 5, 15 * 60 * 1000)))
    return err(c, 429, 'demasiados');
  if (!(await pasaTurnstile(c.env.TURNSTILE_SECRET, c.req.header('x-turnstile'), ip(c))))
    return err(c, 403, 'robot');
  const d = await cuerpo(c, esquemaRegistro);
  if (!d) return err(c, 400, 'datos');
  const existe = await c.env.DB.prepare('SELECT id FROM usuarios WHERE correo = ?').bind(d.correo).first();
  if (existe) return err(c, 409, 'correo_usado');
  const id = nuevoId(16);
  const sal = aleatorio(16);
  await c.env.DB.prepare(
    'INSERT INTO usuarios (id, correo, nombre, clave_hash, clave_sal, creado) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, d.correo, d.nombre, await hashClave(d.clave, sal), sal, Date.now())
    .run();
  await c.env.DB.prepare('INSERT OR REPLACE INTO perfil (usuario_id, idioma) VALUES (?, ?)')
    .bind(id, d.idioma ?? 'en')
    .run();
  await abrirSesion(c, id);
  despues(
    c,
    escribir(c, id, (i, n) => correoBienvenida(i, n)),
  );
  return c.json({ usuario: { id, correo: d.correo, nombre: d.nombre } }, 201);
});

app.post('/datos/entrar', async (c) => {
  if (!(await dentroDelLimite(c.env.DB, 'entrar', ip(c), 10, 15 * 60 * 1000)))
    return err(c, 429, 'demasiados');
  if (!(await pasaTurnstile(c.env.TURNSTILE_SECRET, c.req.header('x-turnstile'), ip(c))))
    return err(c, 403, 'robot');
  const d = await cuerpo(c, esquemaEntrar);
  if (!d) return err(c, 400, 'datos');
  const u = await c.env.DB.prepare('SELECT * FROM usuarios WHERE correo = ?')
    .bind(d.correo)
    .first<Usuario & { clave_hash: string; clave_sal: string }>();
  if (!u || !iguales(await hashClave(d.clave, u.clave_sal), u.clave_hash)) return err(c, 401, 'credenciales');
  if (await c.env.DB.prepare('SELECT 1 FROM suspensiones WHERE usuario_id = ?').bind(u.id).first())
    return err(c, 403, 'suspendida');
  await abrirSesion(c, u.id);
  // Al superadmin se le dice adónde ir: directo a su panel secreto.
  const panel = rutaPanel(c.env) && correoSuperadmin(c.env, u.correo) ? rutaPanel(c.env) : null;
  return c.json({ usuario: { id: u.id, correo: u.correo, nombre: u.nombre }, panel });
});

// ---------- recuperar la contraseña ----------

const UNA_HORA = 60 * 60 * 1000;

// Siempre responde lo mismo (exista o no la cuenta): así nadie puede averiguar qué correos están registrados.
app.post('/datos/recuperar', async (c) => {
  const d = await cuerpo(
    c,
    z.object({
      correo: z.string().trim().toLowerCase().email().max(200),
      idioma: z.enum(['en', 'es']).optional(),
    }),
  );
  if (!d) return err(c, 400, 'datos');
  if (
    !(await dentroDelLimite(c.env.DB, 'recuperar', ip(c), 5, 15 * 60 * 1000)) ||
    !(await dentroDelLimite(c.env.DB, 'recuperar_correo', d.correo, 3, UNA_HORA))
  )
    return err(c, 429, 'demasiados');
  const u = await c.env.DB.prepare('SELECT id FROM usuarios WHERE correo = ?')
    .bind(d.correo)
    .first<{ id: string }>();
  if (u && !(await c.env.DB.prepare('SELECT 1 FROM suspensiones WHERE usuario_id = ?').bind(u.id).first())) {
    const token = aleatorio(32);
    await c.env.DB.prepare('INSERT INTO recuperaciones (token_hash, usuario_id, vence) VALUES (?, ?, ?)')
      .bind(await sha256(token), u.id, Date.now() + UNA_HORA)
      .run();
    const enlace = `${DOMINIO}/reset-password?token=${token}`;
    despues(
      c,
      escribir(c, u.id, (i, n) => correoRecuperar(i, n, enlace)),
    );
  }
  return c.json({ ok: true });
});

app.post('/datos/restablecer', async (c) => {
  if (!(await dentroDelLimite(c.env.DB, 'restablecer', ip(c), 10, 15 * 60 * 1000)))
    return err(c, 429, 'demasiados');
  const d = await cuerpo(
    c,
    z.object({ token: z.string().min(20).max(200), clave: z.string().min(8).max(200) }),
  );
  if (!d) return err(c, 400, 'datos');
  const f = await c.env.DB.prepare('SELECT usuario_id, vence, usado FROM recuperaciones WHERE token_hash = ?')
    .bind(await sha256(d.token))
    .first<{ usuario_id: string; vence: number; usado: number }>();
  if (!f || f.usado || f.vence < Date.now()) return err(c, 400, 'enlace_vencido');
  const sal = aleatorio(16);
  // Contraseña nueva, enlace usado y TODAS las sesiones cerradas (si alguien había entrado, sale).
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET clave_hash = ?, clave_sal = ? WHERE id = ?').bind(
      await hashClave(d.clave, sal),
      sal,
      f.usuario_id,
    ),
    c.env.DB.prepare('UPDATE recuperaciones SET usado = 1 WHERE usuario_id = ?').bind(f.usuario_id),
    c.env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ?').bind(f.usuario_id),
  ]);
  despues(
    c,
    escribir(c, f.usuario_id, (i, n) => correoClaveCambiada(i, n)),
  );
  return c.json({ ok: true });
});

app.post('/datos/salir', async (c) => {
  const token = leerCookie(c.req.header('cookie'), COOKIE_SESION);
  if (token)
    await c.env.DB.prepare('DELETE FROM sesiones WHERE token_hash = ?')
      .bind(await sha256(token))
      .run();
  const segura = new URL(c.req.url).protocol === 'https:';
  c.header('Set-Cookie', cookieSesion('', segura, 0));
  return c.json({ ok: true });
});

// ---------- planes ----------

async function planDe(c: C, usuarioId: string): Promise<{ plan: Plan; limites: Limites }> {
  const f = await c.env.DB.prepare(
    "SELECT plan FROM suscripciones WHERE usuario_id = ? AND estado = 'activa'",
  )
    .bind(usuarioId)
    .first<{ plan: string }>();
  const plan: Plan = esPlan(f?.plan) ? f.plan : 'starter';
  return { plan, limites: limitesDe(plan, cobroActivo(c.env)) };
}

app.get('/datos/plan', requiereSesion, async (c) => {
  const p = await planDe(c, c.get('usuario')!.id);
  const s = await c.env.DB.prepare('SELECT ciclo FROM pagos_stripe WHERE usuario_id = ?')
    .bind(c.get('usuario')!.id)
    .first<{ ciclo: string | null }>();
  return c.json(
    {
      ...p,
      ciclo: p.plan === 'starter' ? null : (s?.ciclo ?? null),
      cobro_activo: cobroActivo(c.env),
      pago_listo: pagoListo(c.env),
      precios: PRECIOS,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

// ---------- cobro con Stripe (dentro de la página) ----------

/** Días gratis de la primera suscripción. Se cambia con la variable del sitio PAGO_DIAS_PRUEBA (0 = sin prueba). */
function diasPrueba(env: Env): number {
  const n = Number(env.PAGO_DIAS_PRUEBA ?? 14);
  return Number.isInteger(n) && n >= 0 && n <= 60 ? n : 14;
}

app.get('/datos/pago/config', (c) =>
  c.json(
    {
      listo: pagoListo(c.env),
      publicable: pagoListo(c.env) ? c.env.STRIPE_PUBLICABLE : null,
      dias_prueba: diasPrueba(c.env),
    },
    200,
    { 'Cache-Control': 'no-store' },
  ),
);

const esquemaSuscribir = z.object({
  plan: z.enum(['business', 'business_ia']),
  ciclo: z.enum(['mensual', 'anual']),
});

app.post('/datos/pago/suscripcion', requiereSesion, async (c) => {
  if (!pagoListo(c.env)) return err(c, 503, 'pago_apagado');
  const u = c.get('usuario')!;
  if (!(await dentroDelLimite(c.env.DB, 'pago', u.id, 10, 60 * 60_000))) return err(c, 429, 'demasiados');
  const d = await cuerpo(c, esquemaSuscribir);
  if (!d) return err(c, 400, 'datos');
  try {
    const fila = await c.env.DB.prepare(
      'SELECT cliente, suscripcion, uso_prueba FROM pagos_stripe WHERE usuario_id = ?',
    )
      .bind(u.id)
      .first<{ cliente: string; suscripcion: string | null; uso_prueba: number }>();
    const precio = await precioDe(c.env, d.plan, d.ciclo);
    // Nunca dos suscripciones: si ya hay una viva, se cambia de plan sobre esa; si quedó una sin pagar, se cancela.
    if (fila?.suscripcion) {
      const actual = await leerSuscripcion(c.env, fila.suscripcion);
      if (VIVA.includes(actual.status)) {
        if (actual.metadata?.plan === d.plan && actual.metadata?.ciclo === d.ciclo)
          return err(c, 409, 'ya_suscrito');
        await cambiarPlan(c.env, actual, precio, d);
        await c.env.DB.prepare('UPDATE pagos_stripe SET ciclo = ?, actualizado = ? WHERE usuario_id = ?')
          .bind(d.ciclo, Date.now(), u.id)
          .run();
        return c.json({ tipo: 'cambiado', suscripcion: actual.id });
      }
      if (actual.status === 'incomplete') await cancelarAhora(c.env, actual.id).catch(() => undefined);
    }
    const cliente = fila?.cliente ?? (await crearCliente(c.env, u));
    // La prueba gratis es una sola vez por cuenta.
    const dias = fila?.uso_prueba ? 0 : diasPrueba(c.env);
    // Dos clics seguidos (o un reintento de red) dentro de diez minutos devuelven la MISMA suscripción.
    const ventana = Math.floor(Date.now() / 600_000);
    const intento = await crearSuscripcion(
      c.env,
      cliente,
      precio,
      { usuario_id: u.id, plan: d.plan, ciclo: d.ciclo, diasPrueba: dias },
      `sus-${u.id}-${d.plan}-${d.ciclo}-${ventana}`,
    );
    await c.env.DB.prepare(
      `INSERT INTO pagos_stripe (usuario_id, cliente, suscripcion, ciclo, uso_prueba, actualizado)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET cliente = excluded.cliente, suscripcion = excluded.suscripcion,
         ciclo = excluded.ciclo, uso_prueba = MAX(pagos_stripe.uso_prueba, excluded.uso_prueba),
         actualizado = excluded.actualizado`,
    )
      .bind(u.id, cliente, intento.suscripcion, d.ciclo, dias > 0 ? 1 : 0, Date.now())
      .run();
    return c.json({ ...intento, publicable: c.env.STRIPE_PUBLICABLE, dias_prueba: dias });
  } catch (e) {
    console.error('pago: suscripción', e);
    return err(c, 502, e instanceof ErrorPago ? e.codigo : 'stripe');
  }
});

app.post('/datos/pago/cancelar', requiereSesion, async (c) => {
  const f = await c.env.DB.prepare('SELECT suscripcion FROM pagos_stripe WHERE usuario_id = ?')
    .bind(c.get('usuario')!.id)
    .first<{ suscripcion: string | null }>();
  if (!f?.suscripcion) return err(c, 404, 'no_existe');
  try {
    await cancelarAlFinal(c.env, f.suscripcion);
    return c.json({ ok: true });
  } catch (e) {
    console.error('pago: cancelar', e);
    return err(c, 502, 'stripe');
  }
});

// Aviso de Stripe: la única fuente de verdad del plan pagado. Sin firma válida no se toca nada.
app.post('/datos/pago/aviso', async (c) => {
  const texto = await c.req.text();
  if (!(await firmaValida(texto, c.req.header('stripe-signature'), c.env.STRIPE_WEBHOOK_SECRETO)))
    return err(c, 400, 'firma');
  let evento: Parameters<typeof leerAviso>[0];
  try {
    evento = JSON.parse(texto) as Parameters<typeof leerAviso>[0];
  } catch {
    return err(c, 400, 'datos');
  }
  // Facturas: pagada (manda la factura) o fallida (avisa para no perder el plan).
  const factura = leerFactura(evento);
  if (factura) {
    const f = await c.env.DB.prepare('SELECT usuario_id FROM pagos_stripe WHERE cliente = ?')
      .bind(factura.cliente)
      .first<{ usuario_id: string }>();
    if (f && factura.tipo === 'pagada' && factura.monto > 0)
      despues(
        c,
        escribir(c, f.usuario_id, (i, n) =>
          correoPagoRecibido(i, n, {
            monto: factura.monto,
            factura: factura.url,
            pdf: factura.pdf,
            numero: factura.numero,
          }),
        ),
      );
    if (f && factura.tipo === 'fallida')
      despues(
        c,
        escribir(c, f.usuario_id, (i, n) => correoPagoFallido(i, n, factura.url)),
      );
    return c.json({ ok: true });
  }
  const previo = leerAviso(evento);
  if (!previo) return c.json({ ok: true, ignorado: true });
  // Solo cuenta la suscripción que tenemos anotada: los avisos de una vieja (abandonada o reemplazada) no tocan el plan.
  const anotada = await c.env.DB.prepare('SELECT suscripcion FROM pagos_stripe WHERE usuario_id = ?')
    .bind(previo.usuario_id)
    .first<{ suscripcion: string | null }>();
  if (anotada?.suscripcion && anotada.suscripcion !== previo.suscripcion)
    return c.json({ ok: true, ignorado: 'vieja' });
  // Stripe no promete el orden de los avisos: se lee el estado de AHORA en Stripe y ese es el que se guarda.
  let cambio = previo;
  try {
    const fresca = await leerSuscripcion(c.env, previo.suscripcion);
    cambio = leerAviso({ type: 'customer.subscription.updated', data: { object: fresca } }) ?? previo;
  } catch (e) {
    console.error('pago: aviso, no se pudo leer la suscripción', e);
    return err(c, 502, 'stripe');
  }
  const ahora = Date.now();
  const antes = await c.env.DB.prepare('SELECT status FROM estado_stripe WHERE usuario_id = ?')
    .bind(cambio.usuario_id)
    .first<{ status: string }>();
  const estabaActiva = antes && ['active', 'trialing', 'past_due'].includes(antes.status);
  if (cambio.activa && !estabaActiva)
    despues(
      c,
      escribir(c, cambio.usuario_id, (i, n) => correoPlanActivo(i, n, cambio.plan)),
    );
  if (!cambio.activa && estabaActiva && cambio.status === 'canceled')
    despues(
      c,
      escribir(c, cambio.usuario_id, (i, n) => correoPlanCancelado(i, n)),
    );
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO suscripciones (usuario_id, plan, fundador, estado, actualizado) VALUES (?, ?, 1, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET plan = excluded.plan, fundador = 1, estado = excluded.estado,
         actualizado = excluded.actualizado`,
    ).bind(cambio.usuario_id, cambio.plan, cambio.activa ? 'activa' : 'inactiva', ahora),
    c.env.DB.prepare(
      `INSERT INTO pagos_stripe (usuario_id, cliente, suscripcion, ciclo, actualizado) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET cliente = excluded.cliente, suscripcion = excluded.suscripcion,
         ciclo = excluded.ciclo, actualizado = excluded.actualizado`,
    ).bind(cambio.usuario_id, cambio.cliente, cambio.suscripcion, cambio.ciclo, ahora),
    c.env.DB.prepare(
      `INSERT INTO estado_stripe (usuario_id, status, monto, intervalo, periodo_fin, cancela_al_final, actualizado)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET status = excluded.status, monto = excluded.monto,
         intervalo = excluded.intervalo, periodo_fin = excluded.periodo_fin,
         cancela_al_final = excluded.cancela_al_final, actualizado = excluded.actualizado`,
    ).bind(
      cambio.usuario_id,
      cambio.status,
      cambio.monto,
      cambio.intervalo,
      cambio.periodo_fin,
      cambio.cancela_al_final ? 1 : 0,
      ahora,
    ),
  ]);
  return c.json({ ok: true });
});

/** Corta la petición si el plan no incluye la IA. */
async function exigirIA(c: C): Promise<Response | null> {
  return (await planDe(c, c.get('usuario')!.id)).limites.ia ? null : err(c, 402, 'plan_ia');
}

app.get('/datos/yo', (c) =>
  c.json(
    {
      usuario: c.get('usuario'),
      superadmin: esSuperadmin(c),
      panel: esSuperadmin(c) ? rutaPanel(c.env) : null,
    },
    200,
    { 'Cache-Control': 'no-store' },
  ),
);

app.get('/datos/admin/resumen', requiereSuperadmin, async (c) => {
  const db = c.env.DB;
  const semana = Date.now() - 7 * 24 * 3600 * 1000;
  const [u, nuevos, v, planes, ultimos] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM usuarios').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE creado > ?').bind(semana).first<{ n: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS n, COALESCE(SUM(duracion), 0) AS segundos, COALESCE(SUM(bytes), 0) AS bytes,
           COALESCE(SUM(CASE WHEN creado > ? THEN 1 ELSE 0 END), 0) AS semana FROM videos`,
      )
      .bind(semana)
      .first<{ n: number; segundos: number; bytes: number; semana: number }>(),
    db
      .prepare("SELECT plan, COUNT(*) AS n FROM suscripciones WHERE estado = 'activa' GROUP BY plan")
      .all<{ plan: string; n: number }>(),
    db
      .prepare(
        `SELECT r.accion, r.objetivo, r.momento, u.nombre FROM registro_admin r
         LEFT JOIN usuarios u ON u.id = r.admin_id ORDER BY r.id DESC LIMIT 20`,
      )
      .all<{ accion: string; objetivo: string; momento: number; nombre: string | null }>(),
  ]);
  const pagos = Object.fromEntries(planes.results.map((p) => [p.plan, p.n]));
  const pagados = Object.values(pagos).reduce((a, b) => a + b, 0);
  return c.json(
    {
      usuarios: u?.n ?? 0,
      usuarios_semana: nuevos?.n ?? 0,
      videos: v?.n ?? 0,
      videos_semana: v?.semana ?? 0,
      minutos: Math.round((v?.segundos ?? 0) / 60),
      bytes: v?.bytes ?? 0,
      planes: { starter: Math.max(0, (u?.n ?? 0) - pagados), ...pagos },
      registro: ultimos.results,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

app.get('/datos/admin/usuarios', requiereSuperadmin, async (c) => {
  const q = `%${(c.req.query('q') ?? '').trim().toLowerCase().slice(0, 100)}%`;
  const r = await c.env.DB.prepare(
    `SELECT u.id, u.nombre, u.correo, u.creado,
       COALESCE(s.plan, 'starter') AS plan, COALESCE(s.estado, '') AS estado,
       (SELECT COUNT(*) FROM videos v WHERE v.usuario_id = u.id) AS videos,
       (SELECT COALESCE(SUM(v.duracion), 0) FROM videos v WHERE v.usuario_id = u.id) AS segundos,
       (SELECT MAX(v.creado) FROM videos v WHERE v.usuario_id = u.id) AS ultimo
     FROM usuarios u LEFT JOIN suscripciones s ON s.usuario_id = u.id
     WHERE lower(u.nombre) LIKE ? OR lower(u.correo) LIKE ?
     ORDER BY u.creado DESC LIMIT 500`,
  )
    .bind(q, q)
    .all();
  return c.json({ usuarios: r.results }, 200, { 'Cache-Control': 'no-store' });
});

app.get('/datos/admin/videos', requiereSuperadmin, async (c) => {
  const q = `%${(c.req.query('q') ?? '').trim().toLowerCase().slice(0, 100)}%`;
  const usuario = c.req.query('usuario') ?? '';
  const r = await c.env.DB.prepare(
    `SELECT v.id, v.titulo, v.estado, v.duracion, v.bytes, v.privacidad, v.tiene_miniatura, v.creado,
       u.id AS usuario_id, u.nombre AS usuario, u.correo, r.resultado AS revision
     FROM videos v JOIN usuarios u ON u.id = v.usuario_id LEFT JOIN revisiones r ON r.video_id = v.id
     WHERE (? = '' OR v.usuario_id = ?) AND (lower(v.titulo) LIKE ? OR lower(u.correo) LIKE ?)
       AND (? = '' OR r.video_id IS NULL)
     ORDER BY v.creado DESC LIMIT 300`,
  )
    .bind(usuario, usuario, q, q, c.req.query('sin_revisar') === '1' ? '1' : '')
    .all();
  // Cada video trae su firma del día: con ella el panel puede mostrar también los privados.
  const videos = await Promise.all(
    (r.results as { id: string }[]).map(async (v) => ({ ...v, firma: await firmaPanel(c.env, v.id) })),
  );
  return c.json({ videos }, 200, { 'Cache-Control': 'no-store' });
});

// Mirar un video ajeno queda anotado en el registro.
app.post('/datos/admin/videos/:id/visto', requiereSuperadmin, async (c) => {
  const v = await buscarVideo(c, c.req.param('id') ?? '');
  if (!v) return err(c, 404, 'no_existe');
  await anotarAdmin(c, 'ver_video', `${v.id} · ${v.titulo}`);
  return c.json({ ok: true, firma: await firmaPanel(c.env, v.id) });
});

// Si un video está mal, se saca del aire (pasa a privado). No se borra nada.
app.post('/datos/admin/videos/:id/privado', requiereSuperadmin, async (c) => {
  const v = await buscarVideo(c, c.req.param('id') ?? '');
  if (!v) return err(c, 404, 'no_existe');
  await c.env.DB.prepare("UPDATE videos SET privacidad = 'privado', actualizado = ? WHERE id = ?")
    .bind(Date.now(), v.id)
    .run();
  await marcarRevision(c, v.id, 'sacado');
  await anotarAdmin(c, 'hacer_privado', `${v.id} · ${v.titulo}`);
  return c.json({ ok: true });
});

async function marcarRevision(c: C, videoId: string, resultado: 'ok' | 'sacado') {
  await c.env.DB.prepare(
    `INSERT INTO revisiones (video_id, resultado, admin_id, momento) VALUES (?, ?, ?, ?)
     ON CONFLICT (video_id) DO UPDATE SET resultado = excluded.resultado, admin_id = excluded.admin_id,
       momento = excluded.momento`,
  )
    .bind(videoId, resultado, c.get('usuario')!.id, Date.now())
    .run();
}

/** Borra un video y todo lo suyo (archivos y filas). Lo usan el dueño y el superadmin. */
async function borrarVideo(c: C, v: FilaVideo) {
  await c.env.BUCKET.delete([claveVideo(v.id), claveMiniatura(v.id), claveMp4(v.id)]);
  await c.env.DB.batch(
    [
      'videos WHERE id',
      'comentarios WHERE video_id',
      'reacciones WHERE video_id',
      'vistas WHERE video_id',
      'video_ia WHERE video_id',
      'video_mp4 WHERE video_id',
      'video_mp4_recorte WHERE video_id',
      'revisiones WHERE video_id',
    ].map((t) => c.env.DB.prepare(`DELETE FROM ${t} = ?`).bind(v.id)),
  );
}

// Moderación: «revisado, está bien».
app.post('/datos/admin/videos/:id/revisado', requiereSuperadmin, async (c) => {
  const v = await buscarVideo(c, c.req.param('id') ?? '');
  if (!v) return err(c, 404, 'no_existe');
  await marcarRevision(c, v.id, 'ok');
  await anotarAdmin(c, 'revisado', `${v.id} · ${v.titulo}`);
  return c.json({ ok: true });
});

// Borrar un video que no debe existir (contenido prohibido). No se puede deshacer: la página pide confirmación.
app.delete('/datos/admin/videos/:id', requiereSuperadmin, async (c) => {
  const v = await buscarVideo(c, c.req.param('id') ?? '');
  if (!v) return err(c, 404, 'no_existe');
  await borrarVideo(c, v);
  await anotarAdmin(c, 'borrar_video', `${v.id} · ${v.titulo} · dueño ${v.usuario_id}`);
  return c.json({ ok: true });
});

// ---------- superadmin: almacenamiento y estado del sistema ----------

const DIA = 24 * 3600 * 1000;

app.get('/datos/admin/almacen', requiereSuperadmin, async (c) => {
  const db = c.env.DB;
  const ahora = Date.now();
  const [tot, semana, mes, usuarios, videos] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS videos, COALESCE(SUM(v.bytes), 0) AS originales, COALESCE(SUM(v.duracion), 0) AS segundos,
           COALESCE(SUM(CASE WHEN m.estado = 'listo' THEN m.bytes ELSE 0 END), 0) AS mp4,
           COALESCE(SUM(v.tiene_miniatura), 0) AS miniaturas
         FROM videos v LEFT JOIN video_mp4 m ON m.video_id = v.id`,
      )
      .first<{ videos: number; originales: number; segundos: number; mp4: number; miniaturas: number }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(v.bytes), 0) + COALESCE(SUM(m.bytes), 0) AS b FROM videos v
         LEFT JOIN video_mp4 m ON m.video_id = v.id WHERE v.creado > ?`,
      )
      .bind(ahora - 7 * DIA)
      .first<{ b: number }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(v.bytes), 0) + COALESCE(SUM(m.bytes), 0) AS b FROM videos v
         LEFT JOIN video_mp4 m ON m.video_id = v.id WHERE v.creado > ?`,
      )
      .bind(ahora - 30 * DIA)
      .first<{ b: number }>(),
    db
      .prepare(
        `SELECT u.id, u.nombre, u.correo, COUNT(v.id) AS videos,
           COALESCE(SUM(v.bytes), 0) + COALESCE(SUM(m.bytes), 0) AS bytes
         FROM usuarios u JOIN videos v ON v.usuario_id = u.id LEFT JOIN video_mp4 m ON m.video_id = v.id
         GROUP BY u.id ORDER BY bytes DESC LIMIT 15`,
      )
      .all(),
    db
      .prepare(
        `SELECT v.id, v.titulo, v.duracion, v.bytes AS original, COALESCE(m.bytes, 0) AS mp4, u.nombre AS usuario,
           v.usuario_id
         FROM videos v JOIN usuarios u ON u.id = v.usuario_id LEFT JOIN video_mp4 m ON m.video_id = v.id
         ORDER BY v.bytes + COALESCE(m.bytes, 0) DESC LIMIT 15`,
      )
      .all(),
  ]);
  const t = tot ?? { videos: 0, originales: 0, segundos: 0, mp4: 0, miniaturas: 0 };
  // Las miniaturas no se miden una por una: pesan unos 60 KB cada una.
  const miniaturas = t.miniaturas * 60_000;
  const total = t.originales + t.mp4 + miniaturas;
  const limiteGb = Number(c.env.ALMACEN_LIMITE_GB ?? 20) || 20;
  const minutos = t.segundos / 60;
  return c.json(
    {
      total,
      originales: t.originales,
      mp4: t.mp4,
      miniaturas,
      videos: t.videos,
      minutos: Math.round(minutos),
      limite: limiteGb * 1e9,
      // Cuánto ocupa en promedio cada minuto grabado (original + copia MP4).
      por_minuto: minutos > 0 ? Math.round(total / minutos) : 0,
      ultimos_7_dias: semana?.b ?? 0,
      ultimos_30_dias: mes?.b ?? 0,
      usuarios: usuarios.results,
      mayores: videos.results,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

app.get('/datos/admin/sistema', requiereSuperadmin, async (c) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const [ia, correoHoy, correoMes, intentos, errores] = await Promise.all([
    gastoDelMes(c.env.DB),
    c.env.DB.prepare('SELECT enviados, fallidos FROM correo_dia WHERE dia = ?')
      .bind(hoy)
      .first<{ enviados: number; fallidos: number }>(),
    c.env.DB.prepare('SELECT COALESCE(SUM(enviados), 0) AS n FROM correo_dia WHERE dia >= ?')
      .bind(hoy.slice(0, 8) + '01')
      .first<{ n: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM registro_admin WHERE accion = 'intento' AND momento > ?")
      .bind(Date.now() - DIA)
      .first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT e.donde, e.mensaje, e.video_id, e.agente, e.momento, u.nombre, u.correo FROM errores_cliente e
       LEFT JOIN usuarios u ON u.id = e.usuario_id ORDER BY e.id DESC LIMIT 20`,
    ).all(),
  ]);
  const t = topes(c.env);
  return c.json(
    {
      ia: {
        ...iaConfigurada(c.env),
        usd_mes: ia.usd,
        tope_usd_mes: t.usdMes,
        minutos_hoy: ia.minutosHoy,
        tope_minutos_dia: t.minutosDia,
      },
      correo: {
        listo: correoListo(c.env),
        hoy: correoHoy?.enviados ?? 0,
        fallidos_hoy: correoHoy?.fallidos ?? 0,
        mes: correoMes?.n ?? 0,
        cuota_dia: Number(c.env.CORREO_CUOTA_DIA ?? 300) || 300,
      },
      pago: {
        listo: pagoListo(c.env),
        cobro_activo: cobroActivo(c.env),
        cuenta: c.env.STRIPE_PUBLICABLE?.startsWith('pk_live') ? 'vivo' : 'prueba',
      },
      seguridad: { turnstile: Boolean(c.env.TURNSTILE_SECRET), intentos_24h: intentos?.n ?? 0 },
      version: COMMIT,
      errores: errores.results,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

// ---------- superadmin: pagos ----------

app.get('/datos/admin/pagos', requiereSuperadmin, async (c) => {
  const r = await c.env.DB.prepare(
    `SELECT u.id, u.nombre, u.correo, e.status, e.monto, e.intervalo, e.periodo_fin, e.cancela_al_final,
       e.actualizado, COALESCE(s.plan, 'starter') AS plan, p.cliente, p.suscripcion
     FROM estado_stripe e JOIN usuarios u ON u.id = e.usuario_id
     LEFT JOIN suscripciones s ON s.usuario_id = e.usuario_id
     LEFT JOIN pagos_stripe p ON p.usuario_id = e.usuario_id
     ORDER BY e.actualizado DESC LIMIT 1000`,
  ).all<{ status: string; monto: number; intervalo: string; plan: string }>();
  const total = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM usuarios').first<{ n: number }>();
  const grupo = (st: string[]) => r.results.filter((f) => st.includes(f.status)).length;
  const pagan = grupo(['active']);
  const prueba = grupo(['trialing']);
  const problemas = grupo(['past_due', 'unpaid', 'incomplete']);
  const cancelados = grupo(['canceled', 'incomplete_expired']);
  return c.json(
    {
      resumen: {
        pagan,
        prueba,
        problemas,
        cancelados,
        gratis: Math.max(0, (total?.n ?? 0) - pagan - prueba - problemas),
        mrr: ingresoMensual(r.results),
      },
      clientes: r.results,
      stripe_cuenta: c.env.STRIPE_PUBLICABLE?.startsWith('pk_live') ? 'vivo' : 'prueba',
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

// ---------- superadmin: ficha del cliente ----------

app.get('/datos/admin/usuarios/:id', requiereSuperadmin, async (c) => {
  const id = c.req.param('id') ?? '';
  const db = c.env.DB;
  const u = await db.prepare('SELECT id, nombre, correo, creado FROM usuarios WHERE id = ?').bind(id).first();
  if (!u) return err(c, 404, 'no_existe');
  const [plan, pago, estado, susp, accesos, videos] = await Promise.all([
    db.prepare('SELECT plan, estado, fundador FROM suscripciones WHERE usuario_id = ?').bind(id).first(),
    db.prepare('SELECT cliente, suscripcion, ciclo FROM pagos_stripe WHERE usuario_id = ?').bind(id).first(),
    db.prepare('SELECT * FROM estado_stripe WHERE usuario_id = ?').bind(id).first(),
    db.prepare('SELECT motivo, momento FROM suspensiones WHERE usuario_id = ?').bind(id).first(),
    db
      .prepare(
        `SELECT a.ip, a.pais, a.agente, a.momento, (b.ip IS NOT NULL) AS bloqueada FROM accesos a
         LEFT JOIN ips_bloqueadas b ON b.ip = a.ip WHERE a.usuario_id = ? ORDER BY a.momento DESC LIMIT 30`,
      )
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT v.id, v.titulo, v.estado, v.duracion, v.bytes, v.privacidad, v.tiene_miniatura, v.creado,
           r.resultado AS revision
         FROM videos v LEFT JOIN revisiones r ON r.video_id = v.id WHERE v.usuario_id = ? ORDER BY v.creado DESC`,
      )
      .bind(id)
      .all<{ id: string; bytes: number }>(),
  ]);
  await anotarAdmin(c, 'ver_ficha', `${id} · ${(u as { correo: string }).correo}`);
  return c.json(
    {
      usuario: u,
      plan: plan ?? { plan: 'starter', estado: '', fundador: 0 },
      pago,
      estado,
      suspension: susp,
      accesos: accesos.results,
      videos: await Promise.all(
        videos.results.map(async (v) => ({ ...v, firma: await firmaPanel(c.env, v.id) })),
      ),
      bytes: videos.results.reduce((t, v) => t + (v.bytes ?? 0), 0),
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

const esquemaMotivo = z.object({ motivo: z.string().trim().max(300).default('') });

// Suspender: no entra más, se cierran sus sesiones y todos sus videos públicos salen del aire.
app.post('/datos/admin/usuarios/:id/suspender', requiereSuperadmin, async (c) => {
  const id = c.req.param('id') ?? '';
  const d = await cuerpo(c, esquemaMotivo);
  if (!d) return err(c, 400, 'datos');
  if (id === c.get('usuario')!.id) return err(c, 400, 'datos');
  const u = await c.env.DB.prepare('SELECT correo FROM usuarios WHERE id = ?')
    .bind(id)
    .first<{ correo: string }>();
  if (!u) return err(c, 404, 'no_existe');
  if (await c.env.DB.prepare('SELECT 1 FROM suspensiones WHERE usuario_id = ?').bind(id).first())
    return c.json({ ok: true });
  const publicos = await c.env.DB.prepare(
    "SELECT id FROM videos WHERE usuario_id = ? AND privacidad = 'enlace'",
  )
    .bind(id)
    .all<{ id: string }>();
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO suspensiones (usuario_id, motivo, videos, admin_id, momento) VALUES (?, ?, ?, ?, ?)',
    ).bind(id, d.motivo, JSON.stringify(publicos.results.map((v) => v.id)), c.get('usuario')!.id, Date.now()),
    c.env.DB.prepare("UPDATE videos SET privacidad = 'privado' WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ?').bind(id),
  ]);
  await anotarAdmin(c, 'suspender', `${u.correo}${d.motivo ? ` · ${d.motivo}` : ''}`);
  return c.json({ ok: true });
});

// Reactivar: vuelve a entrar y sus videos vuelven a estar como estaban antes de la suspensión.
app.post('/datos/admin/usuarios/:id/reactivar', requiereSuperadmin, async (c) => {
  const id = c.req.param('id') ?? '';
  const s = await c.env.DB.prepare('SELECT videos FROM suspensiones WHERE usuario_id = ?')
    .bind(id)
    .first<{ videos: string }>();
  if (!s) return err(c, 404, 'no_existe');
  const ids = (jsonSeguro(s.videos) as string[]).filter((x) => typeof x === 'string');
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM suspensiones WHERE usuario_id = ?').bind(id),
    ...ids.map((v) =>
      c.env.DB.prepare("UPDATE videos SET privacidad = 'enlace' WHERE id = ? AND usuario_id = ?").bind(v, id),
    ),
  ]);
  const u = await c.env.DB.prepare('SELECT correo FROM usuarios WHERE id = ?')
    .bind(id)
    .first<{ correo: string }>();
  await anotarAdmin(c, 'reactivar', u?.correo ?? id);
  return c.json({ ok: true });
});

// ---------- superadmin: direcciones IP ----------

app.get('/datos/admin/ips', requiereSuperadmin, async (c) => {
  const [bloqueadas, intentos] = await Promise.all([
    c.env.DB.prepare(
      `SELECT b.ip, b.motivo, b.momento, u.nombre AS admin FROM ips_bloqueadas b
       LEFT JOIN usuarios u ON u.id = b.admin_id ORDER BY b.momento DESC`,
    ).all(),
    c.env.DB.prepare(
      `SELECT substr(objetivo, 1, instr(objetivo, ' · ') - 1) AS ip, COUNT(*) AS n, MAX(momento) AS ultimo
       FROM registro_admin WHERE accion = 'intento' GROUP BY 1 ORDER BY n DESC LIMIT 30`,
    ).all(),
  ]);
  return c.json({ bloqueadas: bloqueadas.results, intentos: intentos.results }, 200, {
    'Cache-Control': 'no-store',
  });
});

const esquemaIp = z.object({
  ip: z
    .string()
    .trim()
    .max(64)
    .regex(/^[0-9a-fA-F:.]{3,64}$/),
  motivo: z.string().trim().max(300).default(''),
});

app.post('/datos/admin/ips', requiereSuperadmin, async (c) => {
  const d = await cuerpo(c, esquemaIp);
  if (!d) return err(c, 400, 'datos');
  // Nunca te bloqueas a ti mismo.
  if (d.ip === ip(c)) return err(c, 400, 'tu_ip');
  await c.env.DB.prepare(
    `INSERT INTO ips_bloqueadas (ip, motivo, admin_id, momento) VALUES (?, ?, ?, ?)
     ON CONFLICT (ip) DO UPDATE SET motivo = excluded.motivo`,
  )
    .bind(d.ip, d.motivo, c.get('usuario')!.id, Date.now())
    .run();
  await anotarAdmin(c, 'bloquear_ip', `${d.ip}${d.motivo ? ` · ${d.motivo}` : ''}`);
  return c.json({ ok: true });
});

app.delete('/datos/admin/ips/:ip', requiereSuperadmin, async (c) => {
  const v = decodeURIComponent(c.req.param('ip') ?? '');
  await c.env.DB.prepare('DELETE FROM ips_bloqueadas WHERE ip = ?').bind(v).run();
  await anotarAdmin(c, 'desbloquear_ip', v);
  return c.json({ ok: true });
});

// ---------- carpetas ----------

const esquemaCarpeta = z.object({ nombre: z.string().trim().min(1).max(80) });

app.get('/datos/carpetas', requiereSesion, async (c) => {
  const u = c.get('usuario')!;
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.nombre, c.creada, (SELECT COUNT(*) FROM videos v WHERE v.carpeta_id = c.id AND v.archivado = 0) AS videos
     FROM carpetas c WHERE c.usuario_id = ? ORDER BY c.nombre`,
  )
    .bind(u.id)
    .all();
  return c.json({ carpetas: results });
});

app.post('/datos/carpetas', requiereSesion, async (c) => {
  const d = await cuerpo(c, esquemaCarpeta);
  if (!d) return err(c, 400, 'datos');
  const id = nuevoId(12);
  await c.env.DB.prepare('INSERT INTO carpetas (id, usuario_id, nombre, creada) VALUES (?, ?, ?, ?)')
    .bind(id, c.get('usuario')!.id, d.nombre, Date.now())
    .run();
  return c.json({ carpeta: { id, nombre: d.nombre } }, 201);
});

app.patch('/datos/carpetas/:id', requiereSesion, async (c) => {
  const d = await cuerpo(c, esquemaCarpeta);
  if (!d) return err(c, 400, 'datos');
  const r = await c.env.DB.prepare('UPDATE carpetas SET nombre = ? WHERE id = ? AND usuario_id = ?')
    .bind(d.nombre, c.req.param('id'), c.get('usuario')!.id)
    .run();
  if (!r.meta.changes) return err(c, 404, 'no_existe');
  return c.json({ ok: true });
});

app.delete('/datos/carpetas/:id', requiereSesion, async (c) => {
  const u = c.get('usuario')!;
  const id = c.req.param('id');
  const r = await c.env.DB.prepare('DELETE FROM carpetas WHERE id = ? AND usuario_id = ?')
    .bind(id, u.id)
    .run();
  if (!r.meta.changes) return err(c, 404, 'no_existe');
  // Los videos no se borran: vuelven a «Todos los videos».
  await c.env.DB.prepare('UPDATE videos SET carpeta_id = NULL WHERE carpeta_id = ? AND usuario_id = ?')
    .bind(id, u.id)
    .run();
  return c.json({ ok: true });
});

// ---------- videos: biblioteca ----------

app.get('/datos/videos', requiereSesion, async (c) => {
  const u = c.get('usuario')!;
  const q = (c.req.query('q') ?? '').trim().slice(0, 100);
  const carpeta = c.req.query('carpeta') ?? '';
  const archivo = c.req.query('archivo') === '1' ? 1 : 0;
  const condiciones = ['v.usuario_id = ?', 'v.archivado = ?', "v.estado != 'cancelado'"];
  const params: (string | number)[] = [u.id, archivo];
  if (carpeta) {
    condiciones.push('v.carpeta_id = ?');
    params.push(carpeta);
  }
  if (q) {
    condiciones.push('(v.titulo LIKE ? OR v.descripcion LIKE ? OR v.transcripcion LIKE ?)');
    const patron = `%${q.replace(/[%_]/g, '')}%`;
    params.push(patron, patron, patron);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT v.id, v.titulo, v.estado, v.duracion, v.creado, v.carpeta_id, v.privacidad, v.tiene_miniatura, v.archivado,
       (SELECT COUNT(*) FROM vistas w WHERE w.video_id = v.id) AS vistas,
       (SELECT COUNT(*) FROM comentarios k WHERE k.video_id = v.id) AS comentarios
     FROM videos v WHERE ${condiciones.join(' AND ')} ORDER BY v.creado DESC LIMIT 500`,
  )
    .bind(...params)
    .all();
  return c.json({ videos: results });
});

app.get('/datos/resumen', requiereSesion, async (c) => {
  const u = c.get('usuario')!;
  const fila = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM videos WHERE usuario_id = ? AND estado = 'listo') AS videos,
       (SELECT COALESCE(SUM(duracion),0) FROM videos WHERE usuario_id = ? AND estado = 'listo') AS segundos_grabados,
       (SELECT COUNT(*) FROM vistas w JOIN videos v ON v.id = w.video_id WHERE v.usuario_id = ?) AS vistas,
       (SELECT COALESCE(SUM(w.segundos),0) FROM vistas w JOIN videos v ON v.id = w.video_id WHERE v.usuario_id = ?) AS segundos_vistos`,
  )
    .bind(u.id, u.id, u.id, u.id)
    .first();
  return c.json({ resumen: fila });
});

// ---------- videos: subida por partes ----------

const esquemaNuevo = z.object({
  titulo: z.string().trim().max(200).optional(),
  tipo: z
    .string()
    .max(100)
    .refine((t) => /^video\/(webm|mp4)\b/.test(t))
    .default('video/webm'),
  ancho: z.number().int().min(0).max(8192).default(0),
  alto: z.number().int().min(0).max(8192).default(0),
  idioma: z.enum(['en', 'es']).default('en'),
});

/** El plan gratis tiene tope de videos: vale igual para grabar uno nuevo que para duplicar. */
async function sinCupoDeVideos(c: C): Promise<boolean> {
  const { limites } = await planDe(c, c.get('usuario')!.id);
  if (limites.videos === null) return false;
  const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM videos WHERE usuario_id = ?')
    .bind(c.get('usuario')!.id)
    .first<{ n: number }>();
  return (n?.n ?? 0) >= limites.videos;
}

app.post('/datos/videos', requiereSesion, async (c) => {
  const d = await cuerpo(c, esquemaNuevo);
  if (!d) return err(c, 400, 'datos');
  if (await sinCupoDeVideos(c)) return err(c, 402, 'limite_videos');
  const id = nuevoId(20);
  const tipo = d.tipo.split(';')[0]!;
  const subida = await c.env.BUCKET.createMultipartUpload(claveVideo(id), {
    httpMetadata: { contentType: tipo },
  });
  const ahora = Date.now();
  const titulo = d.titulo || (d.idioma === 'es' ? 'Grabación sin título' : 'Untitled recording');
  await c.env.DB.prepare(
    `INSERT INTO videos (id, usuario_id, titulo, tipo, ancho, alto, idioma, subida_id, creado, actualizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, c.get('usuario')!.id, titulo, tipo, d.ancho, d.alto, d.idioma, subida.uploadId, ahora, ahora)
    .run();
  return c.json({ id, parte_minima: PARTE_MIN }, 201);
});

async function videoDelDueno(c: C): Promise<FilaVideo | null> {
  const v = await buscarVideo(c, c.req.param('id') ?? '');
  if (!v || v.usuario_id !== c.get('usuario')!.id) return null;
  return v;
}

app.put('/datos/videos/:id/partes/:n', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  if (v.estado !== 'subiendo' || !v.subida_id) return err(c, 409, 'ya_terminado');
  const n = Number(c.req.param('n'));
  if (!Number.isInteger(n) || n < 1 || n > 10000) return err(c, 400, 'parte');
  const datos = await c.req.arrayBuffer();
  if (datos.byteLength === 0) return err(c, 400, 'parte_vacia');
  if (datos.byteLength > PARTE_MAX) return err(c, 413, 'parte_grande');
  const subida = c.env.BUCKET.resumeMultipartUpload(claveVideo(v.id), v.subida_id);
  const parte = await subida.uploadPart(n, datos);
  return c.json({ parte: { partNumber: parte.partNumber, etag: parte.etag } });
});

const esquemaSegmento = z.object({
  inicio: z.number().min(0),
  fin: z.number().min(0),
  texto: z.string().max(5000),
});
const esquemaCompletar = z.object({
  partes: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1).max(200) }))
    .min(1)
    .max(10000),
  duracion: z
    .number()
    .min(0)
    .max(24 * 3600),
  transcripcion: z.array(esquemaSegmento).max(5000).default([]),
  titulo: z.string().trim().max(200).optional(),
});

app.post('/datos/videos/:id/completar', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  // Un reintento (se cortó la red justo al cerrar) recibe la misma respuesta, no un error.
  if (v.estado === 'listo') return c.json({ ok: true, id: v.id, bytes: v.bytes });
  if (v.estado !== 'subiendo' || !v.subida_id) return err(c, 409, 'ya_terminado');
  const d = await cuerpo(c, esquemaCompletar);
  if (!d) return err(c, 400, 'datos');
  // El tope de minutos del plan también se cumple aquí (la grabadora para sola; esto cubre a quien la salte).
  const { limites } = await planDe(c, c.get('usuario')!.id);
  if (limites.minutos !== null && d.duracion > limites.minutos * 60 + 15) {
    await c.env.BUCKET.resumeMultipartUpload(claveVideo(v.id), v.subida_id)
      .abort()
      .catch(() => undefined);
    await borrarVideo(c, v);
    return err(c, 402, 'limite_minutos');
  }
  const partes = [...d.partes].sort((a, b) => a.partNumber - b.partNumber);
  const subida = c.env.BUCKET.resumeMultipartUpload(claveVideo(v.id), v.subida_id);
  let obj: R2Object;
  try {
    obj = await subida.complete(partes);
  } catch (e) {
    console.error('no se pudo cerrar la subida', v.id, partes.length, e);
    return err(c, 409, 'partes');
  }
  const ahora = Date.now();
  await c.env.DB.prepare(
    `UPDATE videos SET estado = 'listo', bytes = ?, duracion = ?, transcripcion = ?, titulo = COALESCE(?, titulo),
       subida_id = NULL, actualizado = ? WHERE id = ?`,
  )
    .bind(obj.size, d.duracion, JSON.stringify(d.transcripcion), d.titulo || null, ahora, v.id)
    .run();
  return c.json({ ok: true, id: v.id, bytes: obj.size });
});

app.post('/datos/videos/:id/cancelar', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  // Cancelar es solo para una subida a medias: un video terminado se borra desde la biblioteca, nunca por aquí.
  if (v.estado !== 'subiendo') return err(c, 409, 'ya_terminado');
  if (v.subida_id) {
    try {
      await c.env.BUCKET.resumeMultipartUpload(claveVideo(v.id), v.subida_id).abort();
    } catch (e) {
      console.error('cancelar subida', e);
    }
  }
  await borrarVideo(c, v);
  return c.json({ ok: true });
});

app.put('/datos/videos/:id/miniatura', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const tipo = c.req.header('content-type') ?? '';
  if (!/^image\/(jpeg|png|webp)$/.test(tipo)) return err(c, 400, 'tipo');
  const datos = await c.req.arrayBuffer();
  if (datos.byteLength === 0 || datos.byteLength > MINIATURA_MAX) return err(c, 413, 'miniatura');
  await c.env.BUCKET.put(claveMiniatura(v.id), datos, { httpMetadata: { contentType: tipo } });
  await c.env.DB.prepare('UPDATE videos SET tiene_miniatura = 1, actualizado = ? WHERE id = ?')
    .bind(Date.now(), v.id)
    .run();
  return c.json({ ok: true });
});

// ---------- videos: ver y editar ----------

app.get('/datos/videos/:id', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  const u = c.get('usuario');
  if (!v || !puedeVer(v, u)) return err(c, 404, 'no_existe');
  const autor = await c.env.DB.prepare('SELECT nombre FROM usuarios WHERE id = ?')
    .bind(v.usuario_id)
    .first<{ nombre: string }>();
  return c.json(
    {
      video: videoPublico(
        v,
        autor?.nombre ?? '',
        u?.id === v.usuario_id,
        await tieneMp4(c, v),
        (await planDe(c, v.usuario_id)).limites.marca,
      ),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  );
});

const esquemaTiempo = z.object({ inicio: z.number().min(0), fin: z.number().min(0) });
const esquemaCapitulo = z.object({ segundo: z.number().min(0), titulo: z.string().trim().min(1).max(120) });
const esquemaSuperposicion = z.object({
  tipo: z.enum(['texto', 'flecha', 'recuadro', 'difuminar']),
  inicio: z.number().min(0),
  fin: z.number().min(0),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  ancho: z.number().min(0).max(100),
  alto: z.number().min(0).max(100),
  texto: z.string().max(200).default(''),
});
const esquemaEditar = z
  .object({
    titulo: z.string().trim().min(1).max(200),
    descripcion: z.string().max(5000),
    privacidad: z.enum(['enlace', 'privado']),
    carpeta_id: z.string().max(40).nullable(),
    archivado: z.boolean(),
    transcripcion: z.array(esquemaSegmento).max(5000),
    capitulos: z.array(esquemaCapitulo).max(200),
    cortes: z.array(esquemaTiempo).max(500),
    recorte_inicio: z.number().min(0),
    recorte_fin: z.number().min(0),
    superposiciones: z.array(esquemaSuperposicion).max(100),
    cta_texto: z.string().trim().max(60),
    cta_url: z.union([
      z.literal(''),
      z
        .string()
        .url()
        .max(500)
        .regex(/^https?:\/\//),
    ]),
    permitir_descarga: z.boolean(),
    permitir_comentarios: z.boolean(),
  })
  .partial();

const COLUMNAS_JSON = new Set(['transcripcion', 'capitulos', 'cortes', 'superposiciones']);
const COLUMNAS_BOOL = new Set(['archivado', 'permitir_descarga', 'permitir_comentarios']);

app.patch('/datos/videos/:id', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const d = await cuerpo(c, esquemaEditar);
  if (!d) return err(c, 400, 'datos');
  if (d.carpeta_id) {
    const carpeta = await c.env.DB.prepare('SELECT id FROM carpetas WHERE id = ? AND usuario_id = ?')
      .bind(d.carpeta_id, v.usuario_id)
      .first();
    if (!carpeta) return err(c, 400, 'carpeta');
  }
  const sets: string[] = [];
  const valores: (string | number | null)[] = [];
  for (const [k, val] of Object.entries(d)) {
    if (val === undefined) continue;
    // Las columnas salen del esquema de zod (lista cerrada), nunca de la petición en crudo.
    sets.push(`${k} = ?`);
    if (COLUMNAS_JSON.has(k)) valores.push(JSON.stringify(val));
    else if (COLUMNAS_BOOL.has(k)) valores.push(val ? 1 : 0);
    else valores.push(val as string | number | null);
  }
  if (!sets.length) return c.json({ ok: true });
  sets.push('actualizado = ?');
  valores.push(Date.now(), v.id);
  await c.env.DB.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...valores)
    .run();
  const nuevo = (await buscarVideo(c, v.id))!;
  return c.json({ video: videoPublico(nuevo, c.get('usuario')!.nombre, true, await tieneMp4(c, nuevo)) });
});

app.post('/datos/videos/:id/duplicar', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v || v.estado !== 'listo') return err(c, 404, 'no_existe');
  if (await sinCupoDeVideos(c)) return err(c, 402, 'limite_videos');
  const id = nuevoId(20);
  const original = await c.env.BUCKET.get(claveVideo(v.id));
  if (!original) return err(c, 404, 'no_existe');
  await c.env.BUCKET.put(claveVideo(id), original.body, { httpMetadata: { contentType: v.tipo } });
  if (v.tiene_miniatura) {
    const m = await c.env.BUCKET.get(claveMiniatura(v.id));
    if (m) await c.env.BUCKET.put(claveMiniatura(id), m.body, { httpMetadata: m.httpMetadata });
  }
  const ahora = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO videos SELECT ?, usuario_id, titulo || ?, descripcion, estado, tipo, bytes, duracion, ancho, alto,
       privacidad, carpeta_id, 0, NULL, tiene_miniatura, idioma, transcripcion, capitulos, cortes, recorte_inicio,
       recorte_fin, superposiciones, cta_texto, cta_url, permitir_descarga, permitir_comentarios, ?, ?
     FROM videos WHERE id = ?`,
  )
    .bind(id, v.idioma === 'es' ? ' (copia)' : ' (copy)', ahora, ahora, v.id)
    .run();
  return c.json({ id }, 201);
});

app.delete('/datos/videos/:id', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  await borrarVideo(c, v);
  return c.json({ ok: true });
});

// ---------- actividad: comentarios, reacciones, vistas ----------

app.get('/datos/videos/:id/actividad', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  if (!v || !puedeVer(v, c.get('usuario'))) return err(c, 404, 'no_existe');
  const [comentarios, reacciones] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, nombre, texto, segundo, creado, usuario_id FROM comentarios WHERE video_id = ? ORDER BY creado',
    )
      .bind(v.id)
      .all(),
    c.env.DB.prepare('SELECT emoji, segundo FROM reacciones WHERE video_id = ? ORDER BY segundo LIMIT 2000')
      .bind(v.id)
      .all(),
  ]);
  return c.json({ comentarios: comentarios.results, reacciones: reacciones.results }, 200, {
    'Cache-Control': 'no-store',
  });
});

const esquemaComentario = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  texto: z.string().trim().min(1).max(2000),
  segundo: z.number().min(0).nullable().default(null),
});

app.post('/datos/videos/:id/comentarios', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  const u = c.get('usuario');
  if (!v || !puedeVer(v, u)) return err(c, 404, 'no_existe');
  if (!v.permitir_comentarios && u?.id !== v.usuario_id) return err(c, 403, 'comentarios_cerrados');
  if (!(await dentroDelLimite(c.env.DB, 'comentar', ip(c), 30, 10 * 60 * 1000)))
    return err(c, 429, 'demasiados');
  const d = await cuerpo(c, esquemaComentario);
  if (!d) return err(c, 400, 'datos');
  const nombre = u?.nombre ?? d.nombre;
  if (!nombre) return err(c, 400, 'nombre');
  const comentario = {
    id: nuevoId(14),
    nombre,
    texto: d.texto,
    segundo: d.segundo,
    creado: Date.now(),
    usuario_id: u?.id ?? null,
  };
  await c.env.DB.prepare(
    'INSERT INTO comentarios (id, video_id, usuario_id, nombre, texto, segundo, creado) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(comentario.id, v.id, comentario.usuario_id, nombre, d.texto, d.segundo, comentario.creado)
    .run();
  return c.json({ comentario }, 201);
});

app.delete('/datos/videos/:id/comentarios/:cid', requiereSesion, async (c) => {
  const u = c.get('usuario')!;
  const v = await buscarVideo(c, c.req.param('id') ?? '');
  if (!v) return err(c, 404, 'no_existe');
  // Lo borra quien lo escribió o el dueño del video.
  const r = await c.env.DB.prepare(
    'DELETE FROM comentarios WHERE id = ? AND video_id = ? AND (usuario_id = ? OR ? = ?)',
  )
    .bind(c.req.param('cid'), v.id, u.id, v.usuario_id, u.id)
    .run();
  if (!r.meta.changes) return err(c, 404, 'no_existe');
  return c.json({ ok: true });
});

export const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '👏', '🔥', '🙌'];
const esquemaReaccion = z.object({
  emoji: z.string().refine((e) => EMOJIS.includes(e)),
  segundo: z.number().min(0),
});

app.post('/datos/videos/:id/reacciones', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  if (!v || !puedeVer(v, c.get('usuario'))) return err(c, 404, 'no_existe');
  if (!(await dentroDelLimite(c.env.DB, 'reaccion', ip(c), 60, 10 * 60 * 1000)))
    return err(c, 429, 'demasiados');
  const d = await cuerpo(c, esquemaReaccion);
  if (!d) return err(c, 400, 'datos');
  await c.env.DB.prepare(
    'INSERT INTO reacciones (id, video_id, emoji, segundo, creado) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(nuevoId(14), v.id, d.emoji, d.segundo, Date.now())
    .run();
  return c.json({ ok: true }, 201);
});

const esquemaVista = z.object({
  visitante: z.string().regex(/^[a-z0-9]{8,40}$/),
  segundos: z
    .number()
    .min(0)
    .max(24 * 3600),
  completado: z.boolean().default(false),
  cta: z.boolean().default(false),
});

app.post('/datos/videos/:id/vista', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  const u = c.get('usuario');
  if (!v || !puedeVer(v, u)) return err(c, 404, 'no_existe');
  if (u?.id === v.usuario_id) return c.json({ ok: true, contada: false }); // el dueño no suma vistas
  const d = await cuerpo(c, esquemaVista);
  if (!d) return err(c, 400, 'datos');
  const ahora = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO vistas (video_id, visitante, segundos, completado, cta_clic, primera, ultima) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (video_id, visitante) DO UPDATE SET
       segundos = MAX(segundos, excluded.segundos),
       completado = MAX(completado, excluded.completado),
       cta_clic = MAX(cta_clic, excluded.cta_clic),
       ultima = excluded.ultima`,
  )
    .bind(
      v.id,
      d.visitante,
      Math.min(d.segundos, v.duracion || d.segundos),
      d.completado ? 1 : 0,
      d.cta ? 1 : 0,
      ahora,
      ahora,
    )
    .run();
  return c.json({ ok: true, contada: true });
});

app.get('/datos/videos/:id/estadisticas', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const fila = await c.env.DB.prepare(
    `SELECT COUNT(*) AS vistas, COALESCE(AVG(segundos),0) AS promedio, COALESCE(SUM(completado),0) AS completadas,
       COALESCE(SUM(cta_clic),0) AS cta FROM vistas WHERE video_id = ?`,
  )
    .bind(v.id)
    .first<{ vistas: number; promedio: number; completadas: number; cta: number }>();
  const { results: porDia } = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m-%d', primera / 1000, 'unixepoch') AS dia, COUNT(*) AS vistas
     FROM vistas WHERE video_id = ? GROUP BY dia ORDER BY dia DESC LIMIT 30`,
  )
    .bind(v.id)
    .all();
  const vistas = fila?.vistas ?? 0;
  return c.json({
    estadisticas: {
      vistas,
      promedio_segundos: fila?.promedio ?? 0,
      completado_pct: vistas ? Math.round(((fila?.completadas ?? 0) / vistas) * 100) : 0,
      cta_clics: fila?.cta ?? 0,
      cta_pct: vistas ? Math.round(((fila?.cta ?? 0) / vistas) * 100) : 0,
      por_dia: porDia,
    },
  });
});

// ---------- IA: oído (Whisper en Cloudflare) y cerebro (Gemini) ----------
// El navegador del dueño manda el audio en pedazos de 2 minutos (WAV 16 kHz mono) y después pide el análisis.
// Así cada petición es corta y el video nunca depende de la IA: si algo falla, sigue funcionando igual.

const AUDIO_MAX = 8 * 1024 * 1024;

type FilaIA = {
  video_id: string;
  estado: string;
  error: string;
  palabras: string;
  segmentos: string;
  tareas: string;
  idioma: string;
  titulo_original: string;
  minutos: number;
};

function errorIA(c: C, e: unknown) {
  if (e instanceof ErrorIA) {
    const estado = e.codigo === 'ia_apagada' ? 503 : e.codigo.startsWith('tope') ? 429 : 502;
    return c.json({ error: e.codigo }, estado);
  }
  console.error('ia', e);
  return err(c, 500, 'servidor');
}

async function filaIA(c: C, id: string): Promise<FilaIA | null> {
  return c.env.DB.prepare('SELECT * FROM video_ia WHERE video_id = ?').bind(id).first<FilaIA>();
}

app.get('/datos/ia', requiereSesion, async (c) => {
  const g = await gastoDelMes(c.env.DB);
  const t = topes(c.env);
  return c.json(
    {
      ...iaConfigurada(c.env),
      usd_mes: g.usd,
      tope_usd_mes: t.usdMes,
      minutos_hoy: g.minutosHoy,
      tope_minutos_dia: t.minutosDia,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

app.get('/datos/videos/:id/ia', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const f = await filaIA(c, v.id);
  const palabras = f ? (jsonSeguro(f.palabras) as Palabra[]) : [];
  return c.json(
    {
      ia: {
        ...iaConfigurada(c.env),
        estado: f?.estado ?? 'pendiente',
        error: f?.error ?? '',
        tareas: f ? jsonSeguro(f.tareas) : [],
        muletillas: muletillas(palabras),
        palabras: palabras.length,
      },
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
});

app.post('/datos/videos/:id/ia/transcribir', requiereSesion, async (c) => {
  // Tope por persona además del tope mensual de gasto: un video de dos horas son unos 120 pedazos.
  if (!(await dentroDelLimite(c.env.DB, 'ia_transcribir', c.get('usuario')!.id, 300, UNA_HORA)))
    return err(c, 429, 'demasiados');
  const v = await videoDelDueno(c);
  if (!v || v.estado !== 'listo') return err(c, 404, 'no_existe');
  const desde = Number(c.req.query('desde') ?? 0);
  const primero = c.req.query('primero') === '1';
  const ultimo = c.req.query('ultimo') === '1';
  if (!Number.isFinite(desde) || desde < 0 || desde > v.duracion + 5) return err(c, 400, 'datos');
  if (v.duracion > 2 * 3600) return err(c, 413, 'muy_largo');
  const audio = await c.req.arrayBuffer();
  if (audio.byteLength < 1000 || audio.byteLength > AUDIO_MAX) return err(c, 413, 'audio');
  const ahora = Date.now();
  if (primero) {
    // Empieza de cero: se guarda el título del momento para no pisar uno que la persona haya cambiado.
    await c.env.DB.prepare(
      `INSERT INTO video_ia (video_id, estado, error, palabras, segmentos, titulo_original, minutos, actualizado)
       VALUES (?, 'transcribiendo', '', '[]', '[]', ?, 0, ?)
       ON CONFLICT (video_id) DO UPDATE SET estado = 'transcribiendo', error = '', palabras = '[]', segmentos = '[]',
         titulo_original = excluded.titulo_original, minutos = 0, actualizado = excluded.actualizado`,
    )
      .bind(v.id, v.titulo, ahora)
      .run();
  }
  const f = await filaIA(c, v.id);
  if (!f || f.estado !== 'transcribiendo') return err(c, 409, 'orden');
  try {
    const idioma = c.req.query('idioma') || f.idioma || undefined;
    const r = await transcribir(c.env, audio, desde, idioma);
    const palabras = [...(jsonSeguro(f.palabras) as Palabra[]), ...r.palabras];
    const segmentos = [...(jsonSeguro(f.segmentos) as Segmento[]), ...r.segmentos];
    await c.env.DB.prepare(
      `UPDATE video_ia SET palabras = ?, segmentos = ?, idioma = ?, minutos = minutos + ?, estado = ?, actualizado = ? WHERE video_id = ?`,
    )
      .bind(
        JSON.stringify(palabras),
        JSON.stringify(segmentos),
        f.idioma || r.idioma,
        r.segundos / 60,
        ultimo ? 'transcrito' : 'transcribiendo',
        Date.now(),
        v.id,
      )
      .run();
    if (ultimo && segmentos.length) {
      // La transcripción de Whisper reemplaza la del navegador: es más precisa y trae puntuación.
      await c.env.DB.prepare('UPDATE videos SET transcripcion = ?, idioma = ?, actualizado = ? WHERE id = ?')
        .bind(
          JSON.stringify(segmentos),
          (f.idioma || r.idioma).startsWith('es') ? 'es' : 'en',
          Date.now(),
          v.id,
        )
        .run();
    }
    return c.json({ ok: true, palabras: r.palabras.length, idioma: f.idioma || r.idioma });
  } catch (e) {
    await c.env.DB.prepare(
      `UPDATE video_ia SET estado = 'error', error = ?, actualizado = ? WHERE video_id = ?`,
    )
      .bind(e instanceof ErrorIA ? e.codigo : 'servidor', Date.now(), v.id)
      .run();
    return errorIA(c, e);
  }
});

app.post('/datos/videos/:id/ia/analizar', requiereSesion, async (c) => {
  const sinPlan = await exigirIA(c);
  if (sinPlan) return sinPlan;
  if (!(await dentroDelLimite(c.env.DB, 'ia_texto', c.get('usuario')!.id, 40, UNA_HORA)))
    return err(c, 429, 'demasiados');
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const f = await filaIA(c, v.id);
  const segmentos = f ? (jsonSeguro(f.segmentos) as Segmento[]) : [];
  if (!f || !segmentos.length) return err(c, 409, 'sin_transcripcion');
  try {
    const a = await analizar(c.env, segmentos, f.idioma || v.idioma, v.duracion);
    // Solo se llena lo que la persona no cambió: el título si sigue igual, el resumen y los capítulos si están vacíos.
    const sets: string[] = [];
    const valores: (string | number)[] = [];
    if (a.titulo && v.titulo === f.titulo_original) {
      sets.push('titulo = ?');
      valores.push(a.titulo);
    }
    if (a.resumen && !v.descripcion.trim()) {
      sets.push('descripcion = ?');
      valores.push(a.resumen);
    }
    if (a.capitulos.length && (jsonSeguro(v.capitulos) as unknown[]).length === 0) {
      sets.push('capitulos = ?');
      valores.push(JSON.stringify(a.capitulos));
    }
    if (sets.length) {
      await c.env.DB.prepare(`UPDATE videos SET ${sets.join(', ')}, actualizado = ? WHERE id = ?`)
        .bind(...valores, Date.now(), v.id)
        .run();
    }
    await c.env.DB.prepare(
      `UPDATE video_ia SET estado = 'listo', error = '', tareas = ?, actualizado = ? WHERE video_id = ?`,
    )
      .bind(JSON.stringify(a.tareas), Date.now(), v.id)
      .run();
    return c.json({ ok: true, analisis: a });
  } catch (e) {
    await c.env.DB.prepare(
      `UPDATE video_ia SET estado = 'error', error = ?, actualizado = ? WHERE video_id = ?`,
    )
      .bind(e instanceof ErrorIA ? e.codigo : 'servidor', Date.now(), v.id)
      .run();
    return errorIA(c, e);
  }
});

const esquemaGenerar = z.object({
  plantilla: z.enum(Object.keys(PLANTILLAS) as [Plantilla, ...Plantilla[]]),
});

app.post('/datos/videos/:id/ia/generar', requiereSesion, async (c) => {
  const sinPlan = await exigirIA(c);
  if (sinPlan) return sinPlan;
  if (!(await dentroDelLimite(c.env.DB, 'ia_texto', c.get('usuario')!.id, 40, UNA_HORA)))
    return err(c, 429, 'demasiados');
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const d = await cuerpo(c, esquemaGenerar);
  if (!d) return err(c, 400, 'datos');
  const f = await filaIA(c, v.id);
  const segmentos =
    f && (jsonSeguro(f.segmentos) as Segmento[]).length
      ? (jsonSeguro(f.segmentos) as Segmento[])
      : (jsonSeguro(v.transcripcion) as Segmento[]);
  if (!segmentos.length) return err(c, 409, 'sin_transcripcion');
  try {
    return c.json({ documento: await generar(c.env, segmentos, f?.idioma || v.idioma, d.plantilla) });
  } catch (e) {
    return errorIA(c, e);
  }
});

// ---------- errores que pasan en la computadora del cliente ----------

const esquemaErrorCliente = z.object({
  donde: z.string().trim().min(1).max(60),
  mensaje: z.string().trim().min(1).max(1000),
  video_id: z.string().max(40).default(''),
});

// La página avisa aquí cuando algo falla en el navegador (por ejemplo, armar el MP4): queda en el registro del sitio y
// en el superadmin → Sistema, para arreglarlo para todos.
app.post('/datos/errores', requiereSesion, async (c) => {
  if (!(await dentroDelLimite(c.env.DB, 'error_cliente', c.get('usuario')!.id, 30, 60 * 60_000)))
    return c.json({ ok: true });
  const d = await cuerpo(c, esquemaErrorCliente);
  if (!d) return err(c, 400, 'datos');
  console.error('cliente', d.donde, d.video_id, d.mensaje);
  await c.env.DB.prepare(
    'INSERT INTO errores_cliente (usuario_id, donde, mensaje, video_id, agente, momento) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      c.get('usuario')!.id,
      d.donde,
      d.mensaje,
      d.video_id,
      (c.req.header('user-agent') ?? '').slice(0, 200),
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});

// ---------- copia MP4 (la arma el navegador del dueño) ----------

/** Recorte con el que tiene que estar armada la copia MP4 (las puntas que el dueño cortó). */
export function firmaRecorte(v: Pick<FilaVideo, 'recorte_inicio' | 'recorte_fin'>): string {
  return `${Math.round(v.recorte_inicio * 10) / 10}|${Math.round(v.recorte_fin * 10) / 10}`;
}

/** El original ya es MP4 (grabado directo en H.264 + AAC) y sin puntas cortadas: no hace falta ninguna copia. */
function originalSirveDeMp4(v: Pick<FilaVideo, 'tipo' | 'recorte_inicio' | 'recorte_fin'>): boolean {
  return v.tipo.startsWith('video/mp4') && firmaRecorte(v) === '0|0';
}

/** Dónde está el MP4 de este video: el original, la copia armada con el recorte de ahora, o ninguno todavía. */
async function fuenteMp4(
  c: C,
  v: Pick<FilaVideo, 'id' | 'tipo' | 'recorte_inicio' | 'recorte_fin'>,
): Promise<'original' | 'copia' | null> {
  if (originalSirveDeMp4(v)) return 'original';
  const f = await c.env.DB.prepare(
    `SELECT m.estado, r.firma FROM video_mp4 m LEFT JOIN video_mp4_recorte r ON r.video_id = m.video_id
     WHERE m.video_id = ?`,
  )
    .bind(v.id)
    .first<{ estado: string; firma: string | null }>();
  // Las copias de antes del recortador no tienen firma: valen solo si el video no tiene puntas cortadas.
  return f?.estado === 'listo' && (f.firma ?? '0|0') === firmaRecorte(v) ? 'copia' : null;
}

async function tieneMp4(
  c: C,
  v: Pick<FilaVideo, 'id' | 'tipo' | 'recorte_inicio' | 'recorte_fin'>,
): Promise<boolean> {
  return (await fuenteMp4(c, v)) !== null;
}

app.post('/datos/videos/:id/mp4', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v || v.estado !== 'listo') return err(c, 404, 'no_existe');
  if (await tieneMp4(c, v)) return c.json({ ya: true });
  const subida = await c.env.BUCKET.createMultipartUpload(claveMp4(v.id), {
    httpMetadata: { contentType: 'video/mp4' },
  });
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO video_mp4 (video_id, estado, subida_id, bytes, actualizado) VALUES (?, 'subiendo', ?, 0, ?)
       ON CONFLICT (video_id) DO UPDATE SET estado = 'subiendo', subida_id = excluded.subida_id, actualizado = excluded.actualizado`,
    ).bind(v.id, subida.uploadId, Date.now()),
    c.env.DB.prepare(
      `INSERT INTO video_mp4_recorte (video_id, firma) VALUES (?, ?)
       ON CONFLICT (video_id) DO UPDATE SET firma = excluded.firma`,
    ).bind(v.id, firmaRecorte(v)),
  ]);
  // El navegador arma la copia con ESTE recorte (el que quedó anotado), para que siempre coincidan.
  return c.json(
    { ya: false, parte_minima: PARTE_MIN, recorte_inicio: v.recorte_inicio, recorte_fin: v.recorte_fin },
    201,
  );
});

app.put('/datos/videos/:id/mp4/partes/:n', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const f = await c.env.DB.prepare('SELECT * FROM video_mp4 WHERE video_id = ?')
    .bind(v.id)
    .first<{ estado: string; subida_id: string }>();
  if (!f || f.estado !== 'subiendo' || !f.subida_id) return err(c, 409, 'ya_terminado');
  const n = Number(c.req.param('n'));
  if (!Number.isInteger(n) || n < 1 || n > 10000) return err(c, 400, 'parte');
  const datos = await c.req.arrayBuffer();
  if (datos.byteLength === 0) return err(c, 400, 'parte_vacia');
  if (datos.byteLength > PARTE_MAX) return err(c, 413, 'parte_grande');
  const parte = await c.env.BUCKET.resumeMultipartUpload(claveMp4(v.id), f.subida_id).uploadPart(n, datos);
  return c.json({ parte: { partNumber: parte.partNumber, etag: parte.etag } });
});

app.post('/datos/videos/:id/mp4/completar', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v) return err(c, 404, 'no_existe');
  const f = await c.env.DB.prepare('SELECT * FROM video_mp4 WHERE video_id = ?')
    .bind(v.id)
    .first<{ estado: string; subida_id: string }>();
  if (!f || f.estado !== 'subiendo' || !f.subida_id) return err(c, 409, 'ya_terminado');
  const d = await cuerpo(c, z.object({ partes: esquemaCompletar.shape.partes }));
  if (!d) return err(c, 400, 'datos');
  const partes = [...d.partes].sort((a, b) => a.partNumber - b.partNumber);
  const obj = await c.env.BUCKET.resumeMultipartUpload(claveMp4(v.id), f.subida_id).complete(partes);
  await c.env.DB.prepare(
    `UPDATE video_mp4 SET estado = 'listo', subida_id = NULL, bytes = ?, actualizado = ? WHERE video_id = ?`,
  )
    .bind(obj.size, Date.now(), v.id)
    .run();
  return c.json({ ok: true, bytes: obj.size });
});

// ---------- archivos ----------

app.get('/media/:id/video', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  const u = c.get('usuario');
  if (
    !v ||
    v.estado !== 'listo' ||
    !(puedeVer(v, u) || (esSuperadmin(c) && (await firmaPanelValida(c.env, v.id, c.req.query('panel')))))
  )
    return c.notFound();
  const descargar = c.req.query('descargar') === '1';
  if (descargar && !v.permitir_descarga && u?.id !== v.usuario_id) return err(c, 403, 'descarga');
  // La copia MP4 (si ya existe) se usa al pedir formato=mp4 y SIEMPRE al descargar: es la que abren iPhone y Final Cut.
  const quiereMp4 = c.req.query('formato') === 'mp4' || (descargar && c.req.query('formato') !== 'webm');
  const fuente = quiereMp4 ? await fuenteMp4(c, v) : null;
  const mp4 = fuente !== null;
  if (c.req.query('formato') === 'mp4' && !mp4) return c.notFound();
  const obj = await c.env.BUCKET.get(fuente === 'copia' ? claveMp4(v.id) : claveVideo(v.id), {
    range: c.req.raw.headers,
    onlyIf: c.req.raw.headers,
  });
  if (!obj) return c.notFound();
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('Accept-Ranges', 'bytes');
  // Siempre se vuelve a preguntar (con ETag): si el video pasa a privado, deja de verse al instante.
  h.set('Cache-Control', v.privacidad === 'enlace' ? 'private, no-cache' : 'private, no-store');
  h.set('ETag', obj.httpEtag);
  if (descargar) {
    const extension = mp4 || v.tipo.includes('mp4') ? 'mp4' : 'webm';
    const nombre =
      v.titulo
        .replace(/[^\p{L}\p{N} _-]/gu, '')
        .trim()
        .slice(0, 80) || 'pantalay';
    // Nombre en ASCII para navegadores viejos y el nombre real (con tildes) en UTF-8.
    const ascii =
      nombre
        .normalize('NFD')
        .replace(/[^\x20-\x7e]/g, '')
        .trim() || 'pantalay';
    h.set(
      'Content-Disposition',
      `attachment; filename="${ascii}.${extension}"; filename*=UTF-8''${encodeURIComponent(`${nombre}.${extension}`)}`,
    );
    if (mp4) h.set('content-type', 'video/mp4');
  }
  if (!('body' in obj)) return new Response(null, { status: 304, headers: h });
  const rango = obj.range as { offset?: number; length?: number } | undefined;
  if (c.req.header('range') && rango && rango.offset !== undefined) {
    const largo = rango.length ?? obj.size - rango.offset;
    h.set('Content-Range', `bytes ${rango.offset}-${rango.offset + largo - 1}/${obj.size}`);
    h.set('Content-Length', String(largo));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('Content-Length', String(obj.size));
  return new Response(obj.body, { status: 200, headers: h });
});

app.get('/media/:id/miniatura', async (c) => {
  const v = await buscarVideo(c, c.req.param('id'));
  if (
    !v ||
    !v.tiene_miniatura ||
    !(
      puedeVer(v, c.get('usuario')) ||
      (esSuperadmin(c) && (await firmaPanelValida(c.env, v.id, c.req.query('panel'))))
    )
  )
    return c.notFound();
  const obj = await c.env.BUCKET.get(claveMiniatura(v.id));
  if (!obj) return c.notFound();
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('Cache-Control', v.privacidad === 'enlace' ? 'private, no-cache' : 'private, no-store');
  return new Response(obj.body, { headers: h });
});

// ---------- páginas (la app web) ----------

function escaparAtributo(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function paginaApp(c: C): Promise<Response> {
  if (!c.env.ASSETS) return c.text('Pantalay', 200);
  const origen = new URL(c.req.url).origin;
  // La página base es app.html; algunos servidores de estáticos redirigen «/app.html» a «/app»: se sigue una vez.
  let r = await c.env.ASSETS.fetch(new Request(`${origen}/app.html`));
  const destino = r.headers.get('location');
  if (r.status >= 300 && r.status < 400 && destino)
    r = await c.env.ASSETS.fetch(new Request(new URL(destino, origen)));
  if (!r.ok) {
    console.error('página base no encontrada', r.status);
    return c.text('Pantalay', 500);
  }
  // Cada página dice cuál es su dirección oficial (en pantalay.com), aunque se abra desde otra.
  const ruta = new URL(c.req.url).pathname;
  const html = prepararCabecera(
    (await r.text()).replace(
      /<link rel="canonical"[^>]*>/,
      () => `<link rel="canonical" href="${DOMINIO}${ruta === '/' ? '/' : ruta.replace(/\/$/, '')}" />`,
    ),
    ruta,
    codigosGoogle(c.env.GOOGLE_VERIFICACION),
  );
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// La página pública del video lleva su propia tarjeta para WhatsApp y redes.
app.get('/v/:id', async (c) => {
  const pagina = await paginaApp(c);
  const v = await buscarVideo(c, c.req.param('id'));
  if (!v || v.estado !== 'listo' || v.privacidad !== 'enlace') return pagina;
  const origen = DOMINIO;
  const titulo = escaparAtributo(`${v.titulo} · Pantalay`);
  const desc = escaparAtributo(v.descripcion.slice(0, 200) || 'Video on Pantalay');
  const imagen = v.tiene_miniatura ? `${origen}/media/${v.id}/miniatura` : `${origen}/og.png`;
  const html = (await pagina.text())
    .replace(/<title>[^<]*<\/title>/, () => `<title>${titulo}</title>`)
    .replace(/<meta property="og:title"[^>]*>/, () => `<meta property="og:title" content="${titulo}">`)
    .replace(
      /<meta property="og:description"[^>]*>/,
      () => `<meta property="og:description" content="${desc}">`,
    )
    .replace(/<meta property="og:image"[^>]*>/, () => `<meta property="og:image" content="${imagen}">`)
    .replace(/<meta property="og:url"[^>]*>/, () => `<meta property="og:url" content="${origen}/v/${v.id}">`);
  return c.html(html);
});

// Panel de superadmin: SOLO en su dirección secreta y SOLO con la sesión del superadmin. Cualquier otra dirección
// bajo /panel, o la vieja /admin, responde «404» igual que una página que no existe, y el intento queda anotado.
async function noExiste(c: C): Promise<Response> {
  const r = await paginaApp(c);
  return new Response(r.body, { status: 404, headers: r.headers });
}

app.get('/admin', async (c) => (await anotarIntento(c, '/admin'), noExiste(c)));
app.get('/admin/*', async (c) => (await anotarIntento(c, new URL(c.req.url).pathname), noExiste(c)));
app.get('/panel/*', async (c) => {
  const ruta = rutaPanel(c.env);
  const pedida = new URL(c.req.url).pathname.replace(/\/+$/, '');
  if (!ruta || !esSuperadmin(c) || !iguales(pedida, ruta)) {
    if (!(await dentroDelLimite(c.env.DB, 'panel', ip(c), 30, 15 * 60 * 1000)))
      return err(c, 429, 'demasiados');
    // La dirección secreta nunca se escribe en el registro: se anota que alguien sin permiso la usó.
    await anotarIntento(c, ruta && iguales(pedida, ruta) ? 'dirección secreta, sin permiso' : pedida);
    return noExiste(c);
  }
  const r = await paginaApp(c);
  const h = new Headers(r.headers);
  // La dirección secreta no viaja a otros sitios, no se guarda en caché y no la indexa nadie.
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(r.body, { status: 200, headers: h });
});

app.all('/datos/*', (c) => err(c, 404, 'ruta'));

app.get('*', async (c) => {
  if (!c.env.ASSETS) return c.text('Pantalay', 200);
  const r = await c.env.ASSETS.fetch(c.req.raw);
  // Copia con cabeceras propias: las del almacén de estáticos no se pueden modificar.
  if (r.status !== 404) return new Response(r.body, r);
  return paginaApp(c);
});

export default app;
