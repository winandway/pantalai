# Candados de PANTALAI

Cada candado: qué protege, cómo se comprueba y qué no tocar. Commit de referencia: el primero publicado.

## C-GRABAR-PUNTA-A-PUNTA

- Protege: crear cuenta → grabar pantalla + cámara → pausar → seguir → terminar → subir por partes → video listo,
  con miniatura, sin contar la pausa y con la duración escrita en el archivo.
- Prueba: `e2e/grabar.spec.ts` (Chrome con dispositivos simulados). Corre en CI (`punta-a-punta`).
- No tocar: la primera parte se sube AL FINAL para escribirle la duración (`fix-webm-duration`). Si se sube al
  principio, el video queda con duración «infinita» y no se puede adelantar.

## C-SUBIDA-POR-PARTES

- Protege: partes de ≥5 MB mientras se graba, reintentos con espera, el reintento sube solo lo que falló, los
  errores de datos no se reintentan, y la grabación entera queda en memoria para descargarla si todo falla.
- Prueba: `pruebas/subida.test.ts`. Respaldo en IndexedDB por si se cierra la pestaña (Biblioteca → arriba).

## C-PRIVACIDAD

- Protege: un video «Solo yo» no lo ve nadie más: ni datos, ni archivo, ni actividad. El archivo se sirve con
  `private, no-cache` / `no-store`: si pasa a privado deja de verse al instante (antes quedaba una hora en memoria).
- Prueba: `pruebas/servidor.test.ts` › CANDADO privacidad. Comprobada en rojo el 18 oct 2026.

## C-DUENO

- Protege: solo el dueño edita, borra, sube partes o ve estadísticas. Las columnas editables salen de una lista
  cerrada (esquema zod), nunca de la petición en crudo.
- Prueba: `pruebas/servidor.test.ts` › CANDADO dueño.

## C-BORRADOR

- Protege: ningún formulario pierde lo escrito (registro, entrar, carpeta, comentario, editor). Nunca guarda
  contraseñas ni datos de tarjeta; se borra al guardar, al cancelar y al cerrar sesión; la llave lleva la cuenta.
- Prueba: `pruebas/borrador.test.tsx`. Comprobada en rojo el 18 oct 2026.

## C-SESION

- Protege: la contraseña se guarda con PBKDF2 (100 000 vueltas, el máximo de Workers); cerrar sesión borra la
  sesión en la base; límite de intentos; escritura solo con la cabecera `x-pantalai` (bloquea formularios de otros
  sitios); Turnstile se enciende solo con `TURNSTILE_SECRET` en el panel.
- Prueba: `pruebas/servidor.test.ts` › cuentas.

## C-SELECTOR-IDIOMA, C-OJITO, C-BORRAR-EN-TRES-PUNTOS

- Prueba: `pruebas/componentes.test.tsx`.

## C-ENTRADA-WORKER

- `servidor/index.ts` exporta SOLO el programa. Exportar constantes ahí hace que el runtime no arranque
  («Incorrect type for map entry»). Lo demás vive en `servidor/app.ts`.

## C-ESTATICOS

- Las respuestas de `env.ASSETS` tienen cabeceras inmutables: se copian (`new Response(r.body, r)`) antes de
  ponerles las cabeceras de seguridad, o todo estático da 500.

## C-IA-GASTO (19 oct 2026)

- Protege: solo Whisper Large v3 Turbo (Cloudflare) y Gemini 2.5 Flash / Flash-Lite pueden llamarse
  (`servidor/ia/guardia.ts`). Tope mensual en USD (variable `IA_TOPE_USD_MES`, nunca más de 10, lo aprobado por
  Richard) y tope diario de minutos (`IA_TOPE_MINUTOS_DIA`). Se revisa ANTES de cada llamada; cada llamada anota
  su costo en `ia_gasto`. Gemini va con `thinkingBudget: 0` (pensar se cobra como salida). La llave de Gemini va
  en cabecera, nunca en la dirección.
- Prueba: `pruebas/ia.test.ts` › CANDADO guardia de modelos / CANDADO tope de gasto. Comprobada en rojo el 19 oct 2026.
- No tocar: subir el tope o agregar un modelo exige el sí de Richard con el costo escrito.

## C-IA-FLUJO

- Protege: el navegador del dueño saca el audio (WAV 16 kHz mono, pedazos de 2 minutos), lo manda a
  `/ia/transcribir` y después pide `/ia/analizar`. La IA nunca pisa título, resumen ni capítulos que la persona
  cambió. Si la IA falla, el video sigue igual y aparece «Intentar otra vez».
- Prueba: `e2e/ia.spec.ts` (grabación real, IA simulada) y `pruebas/ia.test.ts` (rutas de punta a punta).
- Ojo: Whisper suele borrar las muletillas; la frase de arranque (`initial_prompt`) las pide escritas para poder quitarlas.

## C-IA-VIVO (19 oct 2026)

- Protege: la IA REAL en producción, en español, con un video de 2 min 27 s (dos pedazos de audio): título y
  resumen del tema, capítulos que arrancan en 0, las dos tareas pendientes exactas, muletillas, quitar muletillas
  en el editor, Generar, comentario anónimo, privacidad y limpieza. Gasta menos de 1 centavo (medido: 0,0036 USD).
- Cómo se corre: `VIVO=1 URL_BASE=https://pantalai.sitios.dev npx playwright test e2e/vivo.spec.ts`
- Lo que encontró la primera vez: las «tareas» salían como los pasos del procedimiento y se perdían los pendientes
  reales. Se arregló definiendo tarea como «trabajo pendiente después del video» en la instrucción de `analizar`.
  No volver a la definición corta.

## C-PORTADA-SEGURA (19 oct 2026)

- Protege: la portada «/» también lleva las cabeceras de seguridad. La plataforma sirve los estáticos ANTES que el
  programa; si el paquete trae `index.html`, la portada sale sin cabeceras. Por eso la página base se publica como
  `app.html` (`scripts/empaquetar.mjs` falla si aparece un index.html) y el programa la entrega en toda ruta.
- Prueba: `pruebas/servidor.test.ts` › CANDADO portada segura, y en vivo: `curl -sI https://pantalai.sitios.dev/`
  debe mostrar Content-Security-Policy.
