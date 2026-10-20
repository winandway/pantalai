-- PANTALAI — tablas. Corre en CADA publicación: solo CREATE ... IF NOT EXISTS.
-- Una columna nueva en una tabla que ya existe NO se agrega sola: va con migración aparte (ver CANDADOS.md).

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  correo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  clave_sal TEXT NOT NULL,
  creado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  creada INTEGER NOT NULL,
  vence INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones (usuario_id);

CREATE TABLE IF NOT EXISTS intentos (
  clave TEXT NOT NULL,
  momento INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS intentos_clave ON intentos (clave, momento);

CREATE TABLE IF NOT EXISTS carpetas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  creada INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS carpetas_usuario ON carpetas (usuario_id);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'subiendo',
  tipo TEXT NOT NULL DEFAULT 'video/webm',
  bytes INTEGER NOT NULL DEFAULT 0,
  duracion REAL NOT NULL DEFAULT 0,
  ancho INTEGER NOT NULL DEFAULT 0,
  alto INTEGER NOT NULL DEFAULT 0,
  privacidad TEXT NOT NULL DEFAULT 'enlace',
  carpeta_id TEXT,
  archivado INTEGER NOT NULL DEFAULT 0,
  subida_id TEXT,
  tiene_miniatura INTEGER NOT NULL DEFAULT 0,
  idioma TEXT NOT NULL DEFAULT 'en',
  transcripcion TEXT NOT NULL DEFAULT '[]',
  capitulos TEXT NOT NULL DEFAULT '[]',
  cortes TEXT NOT NULL DEFAULT '[]',
  recorte_inicio REAL NOT NULL DEFAULT 0,
  recorte_fin REAL NOT NULL DEFAULT 0,
  superposiciones TEXT NOT NULL DEFAULT '[]',
  cta_texto TEXT NOT NULL DEFAULT '',
  cta_url TEXT NOT NULL DEFAULT '',
  permitir_descarga INTEGER NOT NULL DEFAULT 1,
  permitir_comentarios INTEGER NOT NULL DEFAULT 1,
  creado INTEGER NOT NULL,
  actualizado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS videos_usuario ON videos (usuario_id, creado);

CREATE TABLE IF NOT EXISTS comentarios (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  usuario_id TEXT,
  nombre TEXT NOT NULL,
  texto TEXT NOT NULL,
  segundo REAL,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comentarios_video ON comentarios (video_id, creado);

CREATE TABLE IF NOT EXISTS reacciones (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  segundo REAL NOT NULL,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reacciones_video ON reacciones (video_id);

CREATE TABLE IF NOT EXISTS vistas (
  video_id TEXT NOT NULL,
  visitante TEXT NOT NULL,
  segundos REAL NOT NULL DEFAULT 0,
  completado INTEGER NOT NULL DEFAULT 0,
  cta_clic INTEGER NOT NULL DEFAULT 0,
  primera INTEGER NOT NULL,
  ultima INTEGER NOT NULL,
  PRIMARY KEY (video_id, visitante)
);

-- IA (19 oct 2026): tablas nuevas, así no se tocan columnas de tablas que ya existen en producción.
CREATE TABLE IF NOT EXISTS video_ia (
  video_id TEXT PRIMARY KEY,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  error TEXT NOT NULL DEFAULT '',
  palabras TEXT NOT NULL DEFAULT '[]',
  segmentos TEXT NOT NULL DEFAULT '[]',
  tareas TEXT NOT NULL DEFAULT '[]',
  idioma TEXT NOT NULL DEFAULT '',
  titulo_original TEXT NOT NULL DEFAULT '',
  minutos REAL NOT NULL DEFAULT 0,
  actualizado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ia_gasto (
  dia TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  usd REAL NOT NULL DEFAULT 0,
  unidades REAL NOT NULL DEFAULT 0,
  llamadas INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, proveedor)
);

-- Copia MP4 de cada video (19 oct 2026): la arma el navegador del dueño. Sirve para iPhone, Final Cut y YouTube.
CREATE TABLE IF NOT EXISTS video_mp4 (
  video_id TEXT PRIMARY KEY,
  estado TEXT NOT NULL DEFAULT 'subiendo',
  subida_id TEXT,
  bytes INTEGER NOT NULL DEFAULT 0,
  actualizado INTEGER NOT NULL
);

-- Con qué recorte se armó la copia MP4 (20 oct 2026). Si el dueño cambia las puntas, la copia se vuelve a armar
-- y la descarga sale recortada. Tabla aparte para no tocar video_mp4 (columna nueva = migración).
CREATE TABLE IF NOT EXISTS video_mp4_recorte (
  video_id TEXT PRIMARY KEY,
  firma TEXT NOT NULL
);
