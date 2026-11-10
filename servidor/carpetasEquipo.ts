// CANDADO C-CARPETAS-EQUIPO: carpetas compartidas con un equipo. Una fila de relación (carpeta, equipo): nunca se copia
// ni se reescribe un video. Los permisos son los mismos de «compartir un video con el equipo» (C-EQUIPOS).

/**
 * Presupuesto de filas escritas (regla «la nube no se come el dinero»). Compartir una carpeta = 1 fila (más su índice,
 * que la base cuenta aparte); compartirla otra vez = 0 (INSERT OR IGNORE); dejar de compartir = 1. Mirar la carpeta,
 * sus videos o la pantalla del equipo = 0. Agregar videos a la carpeta compartida NO escribe nada en el equipo.
 * La prueba «presupuesto» de pruebas/carpetas-equipo.test.ts falla si se pasa.
 */
export const PRESUPUESTO_FILAS_CARPETA_EQUIPO = {
  compartir: 1,
  compartirOtraVez: 0,
  dejarDeCompartir: 1,
  mirar: 0,
} as const;
