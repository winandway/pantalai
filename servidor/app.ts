// Servidor de PANTALAI. Corre en YaDominios Cloud como _worker.js.
// Rutas de datos bajo /datos y archivos bajo /media (NUNCA /api: choca con los estáticos).
import { Hono, type Context } from 'hono';
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

export type Env = {
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

function videoPublico(v: FilaVideo, autor: string, esDueno: boolean, tieneMp4 = false) {
  return {
    tiene_mp4: tieneMp4,
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

// ---------- cabeceras y sesión en todas las peticiones ----------

app.use('*', async (c, next) => {
  const token = leerCookie(c.req.header('cookie'), COOKIE_SESION);
  let usuario: Usuario | null = null;
  if (token && c.env.DB) {
    const fila = await c.env.DB.prepare(
      `SELECT u.id, u.correo, u.nombre, s.vence FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = ?`,
    )
      .bind(await sha256(token))
      .first<Usuario & { vence: number }>();
    if (fila && fila.vence > Date.now()) usuario = { id: fila.id, correo: fila.correo, nombre: fila.nombre };
  }
  c.set('usuario', usuario);
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
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.header('x-pantalai') !== '1') {
    return err(c, 403, 'origen');
  }
  await next();
});

const requiereSesion = async (c: C, next: () => Promise<void>) => {
  if (!c.get('usuario')) return err(c, 401, 'sin_sesion');
  await next();
};

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
    { ok, piezas, ia, turnstile: Boolean(c.env.TURNSTILE_SECRET), commit: COMMIT },
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
});
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
  await abrirSesion(c, id);
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
  await abrirSesion(c, u.id);
  return c.json({ usuario: { id: u.id, correo: u.correo, nombre: u.nombre } });
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

app.get('/datos/yo', (c) => c.json({ usuario: c.get('usuario') }, 200, { 'Cache-Control': 'no-store' }));

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

app.post('/datos/videos', requiereSesion, async (c) => {
  const d = await cuerpo(c, esquemaNuevo);
  if (!d) return err(c, 400, 'datos');
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
  if (v.estado !== 'subiendo' || !v.subida_id) return err(c, 409, 'ya_terminado');
  const d = await cuerpo(c, esquemaCompletar);
  if (!d) return err(c, 400, 'datos');
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
  if (v.subida_id) {
    try {
      await c.env.BUCKET.resumeMultipartUpload(claveVideo(v.id), v.subida_id).abort();
    } catch (e) {
      console.error('cancelar subida', e);
    }
  }
  await c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(v.id).run();
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
    { video: videoPublico(v, autor?.nombre ?? '', u?.id === v.usuario_id, await tieneMp4(c, v.id)) },
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
  return c.json({ video: videoPublico(nuevo, c.get('usuario')!.nombre, true, await tieneMp4(c, v.id)) });
});

app.post('/datos/videos/:id/duplicar', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v || v.estado !== 'listo') return err(c, 404, 'no_existe');
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
  await c.env.BUCKET.delete([claveVideo(v.id), claveMiniatura(v.id), claveMp4(v.id)]);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(v.id),
    c.env.DB.prepare('DELETE FROM comentarios WHERE video_id = ?').bind(v.id),
    c.env.DB.prepare('DELETE FROM reacciones WHERE video_id = ?').bind(v.id),
    c.env.DB.prepare('DELETE FROM vistas WHERE video_id = ?').bind(v.id),
    c.env.DB.prepare('DELETE FROM video_ia WHERE video_id = ?').bind(v.id),
    c.env.DB.prepare('DELETE FROM video_mp4 WHERE video_id = ?').bind(v.id),
  ]);
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

// ---------- copia MP4 (la arma el navegador del dueño) ----------

async function tieneMp4(c: C, id: string): Promise<boolean> {
  const f = await c.env.DB.prepare('SELECT estado FROM video_mp4 WHERE video_id = ?')
    .bind(id)
    .first<{ estado: string }>();
  return f?.estado === 'listo';
}

app.post('/datos/videos/:id/mp4', requiereSesion, async (c) => {
  const v = await videoDelDueno(c);
  if (!v || v.estado !== 'listo') return err(c, 404, 'no_existe');
  if (await tieneMp4(c, v.id)) return c.json({ ya: true });
  const subida = await c.env.BUCKET.createMultipartUpload(claveMp4(v.id), {
    httpMetadata: { contentType: 'video/mp4' },
  });
  await c.env.DB.prepare(
    `INSERT INTO video_mp4 (video_id, estado, subida_id, bytes, actualizado) VALUES (?, 'subiendo', ?, 0, ?)
     ON CONFLICT (video_id) DO UPDATE SET estado = 'subiendo', subida_id = excluded.subida_id, actualizado = excluded.actualizado`,
  )
    .bind(v.id, subida.uploadId, Date.now())
    .run();
  return c.json({ ya: false, parte_minima: PARTE_MIN }, 201);
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
  if (!v || v.estado !== 'listo' || !puedeVer(v, u)) return c.notFound();
  const descargar = c.req.query('descargar') === '1';
  if (descargar && !v.permitir_descarga && u?.id !== v.usuario_id) return err(c, 403, 'descarga');
  // La copia MP4 (si ya existe) se usa al pedir formato=mp4 y SIEMPRE al descargar: es la que abren iPhone y Final Cut.
  const quiereMp4 = c.req.query('formato') === 'mp4' || (descargar && c.req.query('formato') !== 'webm');
  const mp4 = quiereMp4 ? await tieneMp4(c, v.id) : false;
  if (c.req.query('formato') === 'mp4' && !mp4) return c.notFound();
  const obj = await c.env.BUCKET.get(mp4 ? claveMp4(v.id) : claveVideo(v.id), {
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
  if (!v || !v.tiene_miniatura || !puedeVer(v, c.get('usuario'))) return c.notFound();
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
  return new Response(r.body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// La página pública del video lleva su propia tarjeta para WhatsApp y redes.
app.get('/v/:id', async (c) => {
  const pagina = await paginaApp(c);
  const v = await buscarVideo(c, c.req.param('id'));
  if (!v || v.estado !== 'listo' || v.privacidad !== 'enlace') return pagina;
  const origen = new URL(c.req.url).origin;
  const titulo = escaparAtributo(`${v.titulo} · Pantalay`);
  const desc = escaparAtributo(v.descripcion.slice(0, 200) || 'Video on Pantalay');
  const imagen = v.tiene_miniatura ? `${origen}/media/${v.id}/miniatura` : `${origen}/og.png`;
  const html = (await pagina.text())
    .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${titulo}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}">`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${imagen}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${origen}/v/${v.id}">`);
  return c.html(html);
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
