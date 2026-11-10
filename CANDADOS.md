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

## C-MP4 (19 oct 2026)

- Qué se rompió: el video grabado (WebM VP9) no abría en Final Cut ni se reproducía en iPhone (el motor de Safari da
  «formato no soportado»). Comprobado con WebKit: WebM → error 4; MP4 → se reproduce.
- Arreglo: al abrir su video, el navegador del dueño lo convierte a MP4 (H.264 + AAC, índice al principio) con la
  librería `mediabunny` y el codificador del equipo, y lo sube por partes (`/datos/videos/:id/mp4…`, tabla
  `video_mp4`, objeto `videos/{id}/video.mp4`). El reproductor pone el MP4 primero y «Descargar» entrega el MP4.
  El original WebM sigue en ⋮ → «Descargar el original».
- Comprobación: `e2e/grabar.spec.ts` (con `GUARDAR_MP4=archivo` guarda el MP4); el archivo lo abre AVFoundation
  (lo que usa Final Cut): `avconvert --source x.mp4 --preset PresetPassthrough --output y.mov` termina sin error.
- Prueba: `pruebas/servidor.test.ts` › CANDADO MP4.

## C-PARTES-IGUALES (19 oct 2026)

- Qué se rompió: dos grabaciones de 5 minutos quedaron «subiendo» para siempre y salió «La subida no terminó».
  Causa: R2 exige que TODAS las partes de una subida, menos la última, midan exactamente lo mismo. Se cortaban
  partes de tamaño variable (≥ 5 MiB) y además la primera crecía al escribirle la duración. Las grabaciones cortas
  (1 o 2 partes) nunca lo mostraban. Reproducido en local: partes [5.2, 5.7, 1] MB → error 10048; [5, 5, 1] → ok.
- Arreglo: `Subidor.cortar()` corta exactamente `parteMinima` y guarda el sobrante; la duración solo se escribe si
  hay 1 o 2 partes. El servidor responde 409 «partes» (no 500) si el cierre falla. «Subir otra vez» recupera las
  grabaciones guardadas en la computadora. El almacén falso de las pruebas aplica la misma regla.
- Prueba: `pruebas/subida.test.ts` › CANDADO partes iguales; `pruebas/falsos.ts` rechaza partes desiguales.

## C-VISTA-PREVIA (19 oct 2026)

- Qué se rompió: la vista previa salía negra mientras se grababa (REA lo capturó: evidencia
  `ev_5a0eb24ce41fb55688c0b263c2248babb8a0c1c5cfd71ee0b50dc16befaf559d`). Se conectaba la imagen a un video que
  todavía no estaba en pantalla.
- Arreglo: se conecta en un efecto cuando el estado ya no es «ajustes».
- Prueba: `e2e/grabar.spec.ts` comprueba que la vista previa tiene imagen y que arriba dice «Recording».

## C-BURBUJA-FLOTANTE (19 oct 2026)

- La burbuja flotante usa Document Picture-in-Picture: la ventanita se abre PRIMERO en el clic de «Empezar»
  (Chrome exige el gesto) y después se pide la pantalla. En ese modo se graba la pantalla tal cual (la burbuja
  está en ella) y sí se compone en lienzo, pero sin pintar la burbuja (desde el 20 oct, para los lápices). Si la ventanita no se puede abrir, se vuelve a la burbuja dentro del
  video (lienzo). Probado en Chrome visible: ventanita con cámara, forma vertical y borde animado.

## C-VIDEO-A-LA-VISTA (19 oct 2026)

- Qué se rompió: en el iPhone, al darle play al enlace compartido, la página saltaba sola a la transcripción y el
  video quedaba fuera de la vista (medido con WebKit: la página bajaba 482 puntos). La transcripción seguía la frase
  que suena con `scrollIntoView`, que mueve la página entera.
- Arreglo: la lista de la transcripción se mueve sola por dentro (`scrollTo` de la lista, nunca de la página); en el
  celular el panel de transcripción y comentarios arranca cerrado («Transcripción y comentarios»); la pantalla
  completa usa el reproductor propio del iPhone (`webkitEnterFullscreen`); si un equipo no puede reproducir el video
  (Safari sin copia MP4) se avisa en vez de mostrar un reproductor muerto.
- En el celular, «Descargar MP4» → «Guardar en Fotos» abre el menú de compartir (Web Share) para que el video quede
  en Fotos, no perdido en Archivos.
- Prueba: `e2e/iphone.spec.ts` (motor de Safari, iPhone 15 Pro). Comprobada en rojo el 19 oct 2026 (saltó 121 puntos).

## C-SONIDO-COMPUTADORA (20 oct 2026)

- Qué se rompió: el sonido de la computadora (YouTube, música, llamadas) no se grababa. Tres causas: la casilla venía
  apagada, al sonido de la pantalla se le aplicaban los filtros de voz (cancelación de eco, supresión de ruido) que lo
  apagan, y no había ningún aviso cuando el navegador no lo entregaba.
- Arreglo (`web/src/logica/grabadora.ts`): `audioSistema` encendido por defecto (y los ajustes viejos sin `version` se
  migran a encendido); `getDisplayMedia` pide el audio SIN filtros y con `systemAudio: 'include'`; todo el sonido pasa
  por UN mezclador (AudioContext) que se despierta si está suspendido; cada fuente tiene su medidor (🎤/🔊 en la barra);
  si se pidió y no llegó, `sinSonidoSistema` muestra el aviso.
- Cómo se comprueba: grabar una pestaña con un video sonando: la barrita 🔊 se mueve y el video final tiene el sonido
  (medido el 20 oct: unos −17 dB parejos de principio a fin con un tono de prueba).
- En macOS el sonido de la pantalla completa depende de Chrome y del sistema; el de una pestaña siempre funciona.
  Explicado al público en la guía «Record your computer’s sound».

## C-LAPICES (20 oct 2026)

- Qué faltaba: no había lápices para dibujar mientras se graba (REA lo comprobó en la página de grabar: la barra solo
  tenía Pausar, Reiniciar, Descartar y Terminar; evidencia
  `ev_0e94041ac7bfb01fe4b1bdc9b36312a78cce536f40dba78c2d4abf424fd0d2dd`).
- Cómo funciona: `web/src/logica/dibujo.ts` guarda los trazos en coordenadas de 0 a 1 (lápiz, resaltador, flecha,
  cuadro, círculo; seis colores; tres grosores; deshacer; borrar; desvanecer a los 3 s). La grabadora AHORA compone
  SIEMPRE en el lienzo (pantalla + cámara, solo pantalla, solo cámara y también el modo flotante) y en cada cuadro
  pinta los trazos encima. La capa `CapaDibujo` (`web/src/componentes/Lapices.tsx`) recibe el puntero sobre la vista
  previa, que muestra exactamente lo que se graba.
- Congelar: con la pantalla completa, al volver a Pantalay saldría Pantalay mismo en el video. Mientras la página NO
  tiene el foco se guarda una foto de la pantalla cada medio segundo; con «Congelar» encendido (viene así) y los
  lápices abiertos, se graba esa foto con los dibujos encima.
- Límite honesto: dibujar ENCIMA de otros programas (sin volver a Pantalay) necesita una app de escritorio o una
  extensión de Chrome. Para páginas web lo resuelve la extensión (C-EXTENSION, 8 nov 2026); para programas de
  escritorio sigue pendiente una app de escritorio (`PENDIENTES.md`).
- Pruebas: `pruebas/dibujo.test.ts` (comprobada en rojo cambiando el color) y `e2e/lapices.spec.ts` (graba de verdad,
  dibuja una raya roja y mide los píxeles rojos en lo que se graba; comprobada en rojo quitando `pintar` del compositor).
- Capturas: `scripts/capturas-lapices.mjs` → `docs/capturas/lapices-{en,es}.png`.

## C-EXTENSION (8 nov 2026)

- Qué faltaba: los lápices (C-LAPICES) solo dibujaban dentro de la página de Pantalay; para señalar algo en otra
  página había que volver a Pantalay (y congelar la pantalla). No había énfasis del cursor.
- Cómo funciona: extensión de Chrome Manifest V3 en `extension/` (fuente en `extension/src`, TypeScript). La arma
  `scripts/extension.mjs` (`npm run extension`, y también corre en `npm run build`): esbuild → `.dist-extension` y
  un ZIP determinista en `web/public/pantalay-extension.zip` (ignorado por git; se descarga desde
  `https://pantalay.com/pantalay-extension.zip`). El script falla si faltan textos en un idioma, si el nombre o la
  descripción no caben, o si aparecen permisos de más.
  - `capa.ts` (content script, se inyecta con `chrome.scripting` solo cuando se pide): capa transparente con shadow
    DOM abierto (`#pantalay-capa`), lienzo a pantalla completa y barrita con Lápiz, Resaltador, Flecha, Cuadro,
    Círculo, seis colores, Deshacer, Borrar todo y ✕. Usa la MISMA lógica pura de `web/src/logica/dibujo.ts`
    (`Pizarra`, `pintar`, `aCoordenadas`). Esc o ✕ dejan de dibujar: los trazos se quedan y la página vuelve a recibir
    los clics. Énfasis del cursor: círculo amarillo que sigue al puntero y un anillo rojo al hacer clic.
  - Atajos (`chrome.commands`): Alt+Shift+A dibujar, Alt+Shift+C cursor. NO se usa Alt+Shift+D porque Pantalay ya lo
    usa para sus lápices y el atajo de la extensión se lo comería en la página de grabar.
  - `fondo.ts` (service worker) y `ventanita.html` + `ventanita.ts` (la ventanita, en inglés y español con
    `chrome.i18n`, `_locales/en` y `_locales/es`).
- Permisos mínimos: `activeTab` (la pestaña donde la persona tocó la ventanita o el atajo, nada más), `scripting`
  (poner la capa y el anotador) y `storage` (recordar el reporte en curso en `storage.session`). Sin
  `host_permissions`, sin `content_scripts` fijos, sin `tabs`, sin `debugger`. La prueba de componentes falla si el
  manifiesto pide algo más.
- Límite honesto (también en Docs): funciona sobre páginas web en Chrome. Chrome no deja ninguna extensión en
  `chrome://` ni en la tienda de Chrome (la ventanita lo dice). NO dibuja encima de programas de escritorio fuera de
  Chrome: eso necesita una app de escritorio (pendiente aparte en `PENDIENTES.md`). Si se recarga la página, hay que
  volver a encender el dibujo.
- Publicación en la Chrome Web Store: necesita la cuenta de desarrollador de Richard (👤 en `PENDIENTES.md`). Mientras
  tanto, Docs explica cómo instalarla en modo desarrollador («Cargar descomprimida»).
- Guía pública: Docs → «Draw on any web page and highlight your cursor» (`chrome-extension`), en los dos idiomas,
  con botón de descarga. Botón «Get the Chrome extension» también en Grabar.
- Pruebas: `pruebas/extension.test.tsx` (orígenes permitidos y manifiesto) y `e2e/extension.spec.ts`, que carga la
  extensión DE VERDAD en el Chromium de Playwright (el Chrome de marca ya no acepta `--load-extension`), enciende la
  capa, dibuja una raya roja y mide los píxeles rojos del lienzo; Esc la apaga y el dibujo se queda; el cursor sigue
  al puntero. Comprobada en ROJO quitando `pintar` de la capa (0 píxeles rojos). La e2e usa la versión de pruebas
  (`node scripts/extension.mjs --pruebas` → `.dist-extension-pruebas`), idéntica salvo un permiso fijo sobre
  127.0.0.1 y localhost, porque Playwright no puede tocar la ventanita ni los atajos de Chrome (que son los que dan
  `activeTab`); llama a las mismas funciones del fondo (`globalThis.pantalay.capa` y `.empezarReporte`). Lo único sin
  automatizar: el clic real en la ventanita y el atajo de teclado del navegador.
- Capturas: `scripts/capturas-extension.mjs` → `docs/capturas/extension-*.png` y `web/public/capturas/*.webp`.
- No tocar: la lista de permisos; que la capa use `dibujo.ts` (un solo dibujo para la página y la extensión).

## C-REPORTE-ERROR (8 nov 2026)

- Qué es: como el modo de Jam o Loom. En la ventanita, «Record a bug report» / «Grabar un reporte de error» pone el
  anotador en la pestaña del fallo y abre `https://pantalay.com/record?reporte=1&ext=<id de la extensión>`. Grabar
  muestra una franja con la página del reporte. Al terminar, la página le pide a la extensión lo recogido
  (`externally_connectable`, solo pantalay.com, www, pantalai.sitios.dev, 127.0.0.1 y localhost; el fondo lo vuelve a
  comprobar con `origenPermitido`), lo alinea con el segundo del video y lo sube. Nunca frena el video: si falla, el
  video queda igual y sale un aviso.
- Cómo se recoge (`extension/src/espia.ts`, mundo principal de la página): envuelve `console.log/info/warn/error`,
  escucha errores sin capturar y promesas rechazadas, envuelve `fetch` y `XMLHttpRequest` (método, dirección,
  estado, duración, tipo) y suma imágenes, scripts y hojas de estilo de Resource Timing que traen estado. NUNCA lee
  cuerpos, cookies ni cabeceras. Se eligió esto en vez de `chrome.debugger` porque el depurador muestra la barra
  amarilla «está depurando este navegador» en todas las pestañas y pide un permiso que asusta; la contra es que solo
  se ve desde que se toca el botón (lo de antes no, salvo los recursos) y que se pierde si se recarga la pestaña
  (Docs lo dice).
- Limpieza (`web/src/logica/registros.ts`, la usan la extensión, la página y el servidor): sin usuario ni contraseña
  ni «#» en las direcciones, con el VALOR tapado (`[hidden]`) en parámetros que suenan a secreto (token, key, pass,
  auth, session, code, signature, email, phone…), tokens Bearer, JWT y claves de Stripe tapados en los textos;
  500 mensajes y 500 peticiones (los más recientes), 1000 caracteres por mensaje, 500 por dirección y 256 KB en total
  (`ajustarATamano` quita lo más viejo). Alineación: `RelojReporte` anota los tramos de grabación (las pausas no
  cuentan) y `aSegundo` pasa cada momento al segundo del video; lo de antes de grabar queda en 0 con «antes».
- Servidor: tabla `registros_video` (solo `CREATE TABLE IF NOT EXISTS`). `PUT /datos/videos/:id/registros`: solo el
  dueño (404 a los demás, 401 sin sesión), tope de 272 KB (413), 30 por hora, zod (`servidor/registros.ts`) y una
  segunda limpieza; reemplaza si se vuelve a subir. `GET`: quien puede ver el video (`puedeVer`), 404 a los demás.
  Se borra con el video (`borrarVideo`).
- Página del video: pestaña «Console & network» / «Consola y red» (solo si hay registros) con filtros Todo, Consola,
  Red y Errores; cada fila tiene su minuto y al tocarla el video salta ahí; la fila del momento se resalta y la lista
  se mueve sola (sin mover la página, como C-VIDEO-A-LA-VISTA).
- Guía pública: Docs → «Record a bug report with console and network logs» (`bug-report`), en los dos idiomas, con
  qué se guarda, qué nunca y quién lo ve.
- Pruebas: `pruebas/registros.test.ts` (limpieza, tope, alineación con pausas, endpoints: dueño sube, otro no,
  privacidad, borrado con el video, 413 y 400), comprobada en ROJO dos veces: quitando `puedeVer` del GET (falla la
  de privacidad) y quitando el tapado de parámetros sensibles (fallan 4). `pruebas/extension.test.tsx` (modo
  reporte, reloj, subida, franja y panel). E2E `e2e/extension.spec.ts`: pestaña de una «tienda» con un botón que da
  un error de consola, una excepción y un fetch con `token=secreto123`; se graba en modo reporte, se toca el botón
  mientras se graba y se comprueba en el servidor (nivel, segundo, `[hidden]`, sin `secreto123`) y en la pestaña
  «Console & network» (tocar la fila lleva el video a ese segundo).
- No tocar: que el servidor vuelva a limpiar; que el GET respete `puedeVer`; que nada lea cuerpos ni cabeceras.

## C-RECORTE-DESCARGA (20 oct 2026)

- Qué pasaba: al descargar o enviar un video salían las dos puntas (el arranque de la grabación y el clic en
  Terminar). El recorte del editor solo se aplicaba al reproducir; la descarga entregaba el archivo entero.
- Arreglo: recortador como el de los reels (`web/src/componentes/Recortador.tsx`, cuentas en
  `web/src/logica/recorte.ts`): tira de fotos, regla, agarraderas, «Reproducir recortado» y Guardar. La copia MP4 se
  arma CON el recorte (`trim` de mediabunny en `web/src/logica/mp4.ts`). El servidor anota con qué recorte se armó
  cada copia (tabla `video_mp4_recorte`, `firmaRecorte` en `servidor/app.ts`); si el recorte cambia, la copia deja de
  valer, el dueño la rehace al abrir su video y la descarga sale recortada. Las copias de antes sin firma valen solo
  si el video no tiene recorte.
- Los cortes del MEDIO también salen en el MP4 desde el 8 nov 2026 (ver C-RECORTE-MEDIO). Si el navegador no puede armar MP4, se descarga el WebM original entero.
- Pruebas: `pruebas/recorte.test.ts`, `pruebas/servidor.test.ts` (comprobada en rojo quitando la firma) y
  `e2e/recortar.spec.ts` (graba 10 s, recorta a unos 5 s, guarda y mide el MP4 descargado; comprobada en rojo
  quitando el `trim`: salía de 10,3 s).

## C-DOMINIO (20 oct 2026)

- pantalay.com es la dirección principal (`servidor/dominio.ts`). Las páginas pedidas por `pantalai.sitios.dev` o
  `www.pantalay.com` pasan con 301 a `https://pantalay.com` con la misma ruta y los mismos parámetros: los enlaces
  viejos siguen sirviendo. `/datos` y `/media` NO se redirigen (reproductores insertados y descargas viejas).
- Los enlaces para compartir y el código para insertar salen siempre con pantalay.com (`web/src/logica/sitio.ts`),
  también desde la dirección vieja; en la computadora local salen con la dirección local.
- Tarjeta para redes (`og:url`, `og:image`), `canonical` de cada página (lo pone `paginaApp`), `sitemap.xml` con
  todas las guías de Docs, `robots.txt` y el pie de página dicen pantalay.com.
- Al entrar por la dirección vieja la sesión no viaja (las cookies son de cada dirección): hay que volver a entrar
  una vez en pantalay.com.
- Prueba: `pruebas/dominio.test.ts` (comprobada en rojo vaciando la lista de direcciones viejas).

## C-PLANES (20 oct 2026)

- Planes aprobados por Richard (`servidor/planes.ts`, detalle en `docs/PLANES-Y-PRECIOS.md`): Starter gratis con
  25 videos, 5 minutos por grabación, hasta 720p, sin IA de análisis, sin lápices y con «Hecho con Pantalay»;
  Business y Business + AI sin límites (precio de lista de Loom, precio de fundador a la mitad de por vida).
- Los límites SOLO se aplican con la variable del sitio `COBRO_ACTIVO=1`. Se enciende recién con la pasarela de pago
  probada de punta a punta (regla de pagos). Apagado, todos tienen todo, como hasta hoy.
- Dónde se aplican: crear video (402 `limite_videos`), análisis y documentos con IA (402 `plan_ia`), y en la pantalla
  de grabar: tope de minutos (se detiene y guarda), calidad máxima y lápices. La marca la manda `/datos/videos/:id`.
- El plan de cada cuenta vive en la tabla `suscripciones` (sin fila = Starter). La llenará la pasarela.
- Prueba: `pruebas/servidor.test.ts` «C-PLANES» (comprobada en rojo haciendo que el plan nunca limite).

## C-GOOGLE (20 oct 2026)

- Listo para Google Search Console (`servidor/dominio.ts`, guía en `docs/GOOGLE-SEARCH-CONSOLE.md`): mapa del sitio,
  robots, canonical, título y resumen propios en cada guía de Docs (`prepararCabecera`), `noindex` en lo privado.
- Verificación: por DNS (TXT, sin código) o con la variable del sitio `GOOGLE_VERIFICACION`, que pone la etiqueta
  `google-site-verification` en todas las páginas y responde el archivo `google<código>.html`. NO quitar la variable
  después de verificar: Google vuelve a comprobarla y, si falta, se pierde la verificación.
- Estado: verificado por Richard el 20 oct 2026 (propiedad de dominio, por DNS) y sitemap enviado: «Correcto», 25
  páginas. No tocar el registro TXT de Google en el DNS de pantalay.com: si se borra, se pierde la verificación.
- Prueba: `pruebas/dominio.test.ts` «C-GOOGLE» (comprobada en rojo quitando la etiqueta). Además, cada publicación
  comprueba en vivo que el sitemap responde y trae pantalay.com (Action `publicar`).

## C-PAGOS (20 oct 2026) — construido, SIN PROBAR con Stripe real

- Cobro dentro de la página con el Payment Element de Stripe (`web/src/paginas/Pagar.tsx`, `servidor/pagos.ts`).
  Estado y cómo se prueba: `docs/VERIFICAR-PAGOS.md` (leerlo antes de afirmar nada sobre pagos).
- El plan pagado solo lo enciende el aviso firmado de Stripe. La ruta del aviso no pide la cabecera `x-pantalai`
  (Stripe no la manda): la protege la firma.
- Versión de la API fija (`2024-06-20`) para que la factura traiga su PaymentIntent.
- Prueba: `pruebas/pagos.test.ts` (comprobada en rojo aceptando cualquier firma).

## C-SUPERADMIN (20 oct 2026, endurecido el mismo día a pedido de Richard)

- El panel vive SOLO en una dirección secreta (variable secreta del sitio `SUPERADMIN_RUTA`; respaldo en
  `~/.config/pantalai/superadmin-ruta`; NUNCA en el código ni en git). `/admin` y cualquier otra dirección bajo
  `/panel/` dan 404 y se anotan como intento. El bundle del navegador no conoce la dirección: la página la toma de su
  propia dirección y la manda en la cabecera `x-panel`, que el servidor compara en tiempo fijo.
- Hace falta además la sesión de un correo de `SUPERADMIN_CORREOS`. Al entrar, el servidor devuelve `panel` y la
  página lleva directo ahí. Videos privados: solo con la firma del día que entrega el panel (`?panel=`).
- Límite de intentos, registro en `registro_admin` (intentos, vistas, sacar del aire), `no-referrer`, `no-store` y
  `noindex` en la página del panel. Uso y capas: `docs/SUPERADMIN.md`.
- Prueba: `pruebas/servidor.test.ts` «C-SUPERADMIN» (comprobada en rojo quitando la comprobación de la cabecera).

## C-SUPERADMIN-OPERAR (20 oct 2026)

- Pagos (`/datos/admin/pagos`, tabla `estado_stripe` que llena el aviso de Stripe), ficha del cliente
  (`/datos/admin/usuarios/:id`, con accesos de la tabla `accesos`), suspender y reactivar (tabla `suspensiones`: no
  entra, sesiones cerradas, videos fuera del aire y vuelven al reactivar), IP bloqueadas (tabla `ips_bloqueadas`,
  comprobada en cada petición; el superadmin nunca queda bloqueado) y moderación (tabla `revisiones`, borrar video).
  Plan y razones: `docs/SUPERADMIN-PLAN.md`; uso: `docs/SUPERADMIN.md`.
- Prueba: `pruebas/servidor.test.ts` «C-SUPERADMIN-OPERAR» (comprobada en rojo dejando entrar a un suspendido).

## C-CORREO (20 oct 2026)

- Correos desde `noreply@pantalay.com` con el envío de YaDominios (`servidor/correo.ts`): dominio activado con DKIM,
  rebotes y DMARC; 300 correos al día en el plan del sitio. Variables del sitio: `CORREO_TOKEN` (el token del sitio,
  secreto) y `CORREO_SITIO=pantalai`. Canario: `/datos/salud` → `correo`.
- Bienvenida (registro), recuperar la contraseña (enlace de una hora, un solo uso, cierra todas las sesiones; responde
  igual exista o no la cuenta), contraseña cambiada, plan activo, factura pagada (con el enlace y el PDF de Stripe),
  pago fallido y plan terminado (eventos `invoice.paid` e `invoice.payment_failed` agregados al aviso de Stripe).
- Plantilla corporativa con tablas y estilos en línea (cabecera oscura, franja de colores, botón rojo) y SIEMPRE texto
  plano además del HTML. Si el envío falla, el registro y los pagos siguen.
- Pruebas: `pruebas/correo.test.ts` (envío simulado; comprobada en rojo dejando que el enlace sirva dos veces).

## C-ALMACEN (20 oct 2026)

- Superadmin → Almacenamiento (`/datos/admin/almacen`): originales + copias MP4 + miniaturas (60 KB c/u estimado)
  frente al tope del plan (`ALMACEN_LIMITE_GB`, 20 en Galaxia), MB por minuto, crecimiento 7/30 días, horas que caben,
  días para llenarse, quién ocupa más y los videos más pesados. Aviso al 70 % y al 90 %. Explicación y costos en
  `docs/ALMACENAMIENTO.md`.
- Superadmin → Sistema (`/datos/admin/sistema`): IA (gasto del mes frente al tope), correo (enviados hoy frente a la
  cuota `CORREO_CUOTA_DIA`, tabla `correo_dia`), Stripe (conectado, real o prueba, límites encendidos) y seguridad.
- Prueba: «C-ALMACEN» en `pruebas/servidor.test.ts` (comprobada en rojo dejando la copia MP4 fuera de la suma).

## C-MP4-DIRECTO (20 oct 2026)

- Se graba directo en MP4 (H.264 + AAC) con los códigos de perfil completos (Chrome rechaza «avc1,mp4a» a secas). Sin
  recorte, el original es el MP4 (no hay copia ni conversión); con recorte, la copia se arma sin re-codificar.
  Explicación: `docs/VELOCIDAD-MP4.md`. NO volver a poner WebM primero en `tipoDeGrabacion`.
- Los errores del navegador al armar el MP4 llegan a `/datos/errores` (tabla `errores_cliente`) y se ven en el
  superadmin → Sistema.
- Pruebas: `pruebas/componentes.test.tsx` (formato elegido) y «C-MP4-DIRECTO» en `pruebas/servidor.test.ts`
  (comprobada en rojo obligando a hacer la copia).

## C-PAGOS-UNA-SUSCRIPCION (21 oct 2026)

- Nunca dos suscripciones por persona. Si ya hay una viva (activa, en prueba o con cobro reintentándose): mismo plan
  → 409 `ya_suscrito`; otro plan → se cambia el precio SOBRE la misma suscripción (prorrateo) y la página recibe
  `tipo: 'cambiado'`. Si quedó una sin pagar (`incomplete`), se cancela antes de crear la nueva.
- La creación lleva llave de idempotencia (`sus-<usuario>-<plan>-<ciclo>-<ventana de 10 min>`): dos clics seguidos
  devuelven la misma suscripción.
- El aviso de Stripe (webhook) ignora los eventos de una suscripción que no es la anotada (`ignorado: 'vieja'`) y
  SIEMPRE lee la suscripción fresca en Stripe antes de guardar (los avisos llegan desordenados). Si Stripe no responde:
  502, para que Stripe reintente. NO volver a guardar lo que dice el evento a secas.
- Pruebas: `pruebas/pagos.test.ts` (Stripe simulado con suscripciones guardadas), comprobadas en rojo quitando el
  cambio de plan y la lectura fresca.

## C-LIMITES-SERVIDOR (21 oct 2026)

- El servidor cumple el plan aunque alguien salte la página: duplicar respeta el tope de videos, cerrar una subida
  más larga que los minutos del plan la borra (402 `limite_minutos`).
- Cerrar dos veces la misma subida (reintento de red) responde lo mismo; cancelar solo sirve para una subida a medias
  (un video terminado nunca se borra por ahí) y se lleva sus archivos.
- IA con tope por persona además del tope mensual de gasto: 300 pedazos de transcripción y 40 análisis o documentos
  por hora.
- El panel del superadmin cuenta SOLO los fallos (30 en 15 min por dirección); el uso normal nunca lo bloquea.
- Títulos con «$» no rompen las tarjetas para redes (reemplazos con función, no con texto).
- Pruebas: «C-LIMITES-SERVIDOR» en `pruebas/servidor.test.ts`, comprobadas en rojo con el servidor anterior.

## C-CUENTA (21 oct 2026)

- «Mi cuenta» (`/account`, en el menú de la cuenta): nombre, contraseña (cierra las otras sesiones y manda correo),
  plan con fecha de renovación, cancelar (al final del período) y mantener el plan, y borrar la cuenta.
- Borrar la cuenta está SOLO dentro del menú ⋮, pide la contraseña, cancela la suscripción en Stripe al momento (si
  Stripe no responde, NO se borra: se le seguiría cobrando a alguien sin cuenta), borra los videos con sus archivos y
  todos los datos; los comentarios en videos ajenos quedan sin cuenta.
- Pruebas: «C-CUENTA» en `pruebas/servidor.test.ts` y la de borrar con Stripe en `pruebas/pagos.test.ts`, comprobadas
  en rojo sin borrar los archivos y sin cerrar las sesiones.

## C-LEGAL y C-SEO-IA (21 oct 2026)

- Textos legales PROPIOS de Pantalay (no copiados de nadie): `web/src/paginas/legales.ts`, en `/terms`, `/privacy`,
  `/acceptable-use` y `/cookies`, en inglés (rige) y español (cortesía). Enlazados en el pie, en el registro y en Mi
  cuenta. Si cambia un proveedor, un dato que se guarda o el cobro, se actualiza ahí y la fecha `ACTUALIZADO`.
- Para Google y las IAs (`servidor/seo.ts`): el texto de la portada, Docs, cada guía y los legales va escrito dentro
  del HTML (React lo reemplaza al cargar); JSON-LD (SoftwareApplication, FAQPage, WebSite, TechArticle, migas);
  `/llms.txt` y `/llms-full.txt`; robots invita por nombre a GPTBot, ClaudeBot, PerplexityBot, Google-Extended y otros.
- Las preguntas frecuentes de los datos estructurados son LAS MISMAS que se ven en la portada (`PREGUNTAS` en
  `web/src/paginas/funciones.ts`): Google castiga si no coinciden.
- Pruebas: «C-SEO-IA» en `pruebas/dominio.test.ts`.

## C-AUDITORIA (21 oct 2026)

- `e2e/auditoria.spec.ts`: una persona real de punta a punta (registrarse, grabar, comentar, reaccionar, compartir
  privado y con enlace, insertar, carpetas, mover, buscar, duplicar, archivar, borrar, borrar carpeta sin perder
  videos, salir y entrar, Docs). Pasa local y contra el sitio en vivo con `URL_BASE=https://pantalay.com`.

## C-RECORTE-ACELERADO (23 oct 2026)

- Qué se rompió: con el MP4 que graba Chrome (fragmentado, sin índice: `moof`/`mvex`, sin `sidx`), al arrastrar una
  agarradera del recortador el video no alcanzaba a pintar el cuadro (cada movimiento pedía una búsqueda nueva al
  archivo en la nube y se cancelaban entre sí) y la tira de fotos quedaba negra (cada foto esperaba 5 s y se rendía).
  Video donde se vio: «Reacción a un cómic de 1929», 55 MB, 99 s.
- Arreglo: `web/src/logica/cuadros.ts` lee SOLO los primeros y últimos 20 s con pedidos por rangos (mediabunny
  `UrlSource` + `CanvasSink`, WebCodecs), guarda un JPEG cada 0,25 s y arma la tira de 12 fotos. Al arrastrar, el
  cuadro más cercano se pinta encima del video (`CuadroPrevio`) sin tocar el reproductor; al soltar, el reproductor
  salta a ese punto. Fuera de las puntas o sin acelerador, las búsquedas se espacian cada 200 ms.
- Plan B: si el navegador no decodifica el video (WebM en Safari, sin WebCodecs), el recortador sigue como antes y el
  motivo queda en la consola.
- Pruebas: `pruebas/recorte.test.ts` (tramos y cuadro más cercano) y `e2e/recortar-puntas.spec.ts` con
  `e2e/datos/fragmentado.mp4` (MP4 fragmentado como el de Chrome), comprobada en rojo quitando la previsualización.
- NO volver a llamar al reproductor en cada movimiento del puntero.

## C-YOUTUBE (23 oct 2026)

- «Para YouTube» (solo el dueño, debajo del resumen): tres títulos (descriptivo, directo, impactante), descripción
  armada (gancho + resumen + capítulos + hashtags), hasta 35 palabras clave y 3 hashtags, cada parte con su botón de
  copiar y «Copiar todo». El resumen también tiene «Copiar resumen». Estudio: `docs/YOUTUBE-POSICIONAMIENTO-2026.md`.
- La IA (Gemini 2.5 Flash, mismo tope de gasto) los escribe junto con el resumen (`kitYoutube` en
  `servidor/ia/motor.ts`) y se guardan en la tabla `video_youtube`; «Escribir otra vez» usa
  `POST /datos/videos/:id/ia/youtube`. Si fallan, el resumen igual queda.
- Reglas que NO se tocan (`web/src/logica/youtube.ts`): etiquetas que nunca pasan de 500 caracteres (comas y comillas
  incluidas), sin «#», «<», «>» ni comas internas; máximo 3 hashtags sin espacios ni repetidos; capítulos en la
  descripción solo si cumplen la regla oficial (0:00, tres o más, 10 s o más).
- Pruebas: `pruebas/youtube.test.ts` y la de rutas en `pruebas/ia.test.ts`.

## C-MARCA-AGUA (23 oct 2026)

- Qué estaba mal: la marca dependía de los límites del plan, que siguen apagados hasta la primera compra real
  (`COBRO_ACTIVO`), así que NINGÚN video gratis la llevaba; y además era solo un enlace debajo del video.
- Ahora: `llevaMarca` en `servidor/app.ts` mira el plan real (sin plan pagado = marca), con o sin cobro encendido; las
  cuentas de `SUPERADMIN_CORREOS` no la llevan. El reproductor (página del video e insertado en otras webs) pinta la
  marca gris «Pantalay» con el logo abajo a la derecha (`.marca-agua`), con enlace a pantalay.com.
- Falta (anotado en PENDIENTES): que el MP4 DESCARGADO del plan gratis también salga con la marca grabada.
- Prueba: «C-MARCA-AGUA» en `pruebas/servidor.test.ts`, comprobada en rojo con la regla anterior.

## C-AREA y C-CAMARA-EN-PESTANA (24 oct 2026)

- Qué pasaba: con la pantalla completa salían el Dock, los íconos y la barra de arriba; al compartir solo la pestaña
  de YouTube (para una reacción) salía limpia pero SIN la cámara, porque la burbuja flotante es otra ventana.
- C-CAMARA-EN-PESTANA: con la burbuja flotante, si lo compartido NO es la pantalla completa (`displaySurface` distinto
  de `monitor`), la cámara se pinta dentro del video (`preparar` en `web/src/logica/grabadora.ts`). Con la pantalla
  completa NO (la ventanita ya sale en la pantalla y quedaría doble).
- C-AREA: ajuste «Elegir qué parte de la pantalla grabar». Después de compartir, `ElegirArea` muestra lo compartido y
  se marca un rectángulo (mover, estirar desde las esquinas). `fijarArea` recorta en el lienzo (`areaEnPixeles`:
  dentro de la imagen, medidas pares, mínimo 160 px). El área queda guardada para la próxima vez.
- Pruebas: `e2e/grabar-area.spec.ts` (el archivo grabado mide lo marcado; rojo sin recortar),
  `e2e/grabar-pestana.spec.ts` (pestaña con cámara adentro y pantalla completa sin duplicar; rojo sin el arreglo),
  `pruebas/recorte.test.ts` (cuentas del área).

## C-MARCA-CONFIGURABLE (24 oct 2026)

- Pedido de Richard: la marca de agua es obligatoria en el plan gratis; en planes pagos va apagada y se puede
  encender desde Configuración (para videos de publicidad del equipo). El superadmin igual que un plan pago.
- `marcaObligatoria` / `llevaMarca` en `servidor/app.ts`; preferencia y empresa en la tabla `ajustes_cuenta`
  (`GET/PATCH /datos/cuenta/ajustes`). Apagarla en el plan gratis responde 409 `marca_plan_gratis`.
- «Mi cuenta» pasó a llamarse «Configuración» (misma dirección `/account`): perfil con empresa, contraseña, marca de
  agua, plan, legal y borrar la cuenta.
- De paso, borrador: al guardar con éxito se cancela el guardado automático pendiente (antes, si se guardaba en menos
  de medio segundo, el borrador se escribía después y reaparecía como «recuperado»). Vale para todos los formularios.
- Pruebas: «C-MARCA-CONFIGURABLE» en `pruebas/servidor.test.ts` y la del borrador en `pruebas/borrador.test.tsx`,
  las dos comprobadas en rojo.
- Superadmin en producción (24 oct 2026): `SUPERADMIN_CORREOS` = solo la cuenta de Richard.

## C-SHORT (24 oct 2026)

- Short vertical para reacciones (Grabar → Pantalla y cámara → Formato «Short vertical (9:16)»): 1080 × 1920 (720 ×
  1280 en el plan gratis), lo compartido en una mitad y la cámara en la otra (`partesVertical`, `cubrir`,
  `pintarVertical` en `web/src/logica/grabadora.ts`). La cámara se pide en 1080p para que se vea nítida.
- Encuadre con forma fija (`rectConProporcion`, `ajustarProporcion` en `web/src/logica/area.ts`; `ElegirArea` con
  `proporcion`): lo que se marca es exactamente lo que sale. El área del Short se guarda aparte (`areaVertical`).
- Paso «preparando»: se ve el Short armado, cámara arriba/abajo, tamaño de la cámara (30 a 60 %), volver a encuadrar;
  NO se crea el video ni se graba hasta «Empezar a grabar». La ventanita flotante muestra el Short (sin espejo).
- Prueba: `e2e/grabar-short.spec.ts` (forma del encuadre, 1080 × 1920, cámara abajo, pausa) con lo compartido simulado
  en blanco; comprobada en rojo dejando la cámara fija arriba. Cuentas en `pruebas/recorte.test.ts`.

## C-MARCA-GRABADA (24 oct 2026)

- Qué pasaba: la marca solo se pintaba encima del reproductor; el MP4 descargado (y el Short subido a TikTok o
  YouTube) salía limpio. Además decía «Pantalay» sin el «.com».
- Ahora: al crear el video (`POST /datos/videos`) el servidor decide con `llevaMarca` si esa cuenta lleva marca, lo
  anota en `video_marca` y responde `marca`; la grabadora la pinta DENTRO de la imagen (`pintarMarca`/`marcaEn` en
  `web/src/logica/grabadora.ts`): logo gris + «pantalay.com». En el Short va abajo a la derecha de la CÁMARA; en lo
  demás, abajo a la derecha del video. El reproductor ya no pone otra encima (`marca_grabada`); a los videos viejos se
  la sigue poniendo el reproductor, con «pantalay.com».
- Pruebas: «C-MARCA-GRABADA» en `pruebas/servidor.test.ts` y el Short en `e2e/grabar-short.spec.ts` (busca las letras
  claras de la marca sobre la cámara; rojo sin pintarla).
- 24 oct 2026 (tarde): en el Short la marca pasó ARRIBA a la derecha de la cámara (pedido de Richard: se ve más y tapa
  menos). La prueba del Short exige la marca arriba y NADA abajo; `e2e/grabar-pestana.spec.ts` exige la píldora gris en
  el video horizontal. Las dos comprobadas en rojo.

## C-VERSION (24 oct 2026)

- Qué pasó: Richard grabó un Short con la pestaña abierta desde antes de publicar; el servidor ya anotaba la marca pero
  el grabador viejo de su navegador no la pintaba, y el video salió sin marca.
- Arreglo: la página lleva el commit con el que se compiló (`__COMMIT__` en `vite.config.ts`) y Grabar lo compara con
  `/datos/config` al abrir y al tocar «Empezar»; si quedó vieja, se recarga sola (`web/src/logica/version.ts`). Los
  ajustes y borradores viven en el navegador: no se pierde nada.
- Prueba: «C-VERSION» en `pruebas/recorte.test.ts`.
- 24 oct 2026 (noche): el Short «Loquillo y Lacran» volvió a salir sin marca: la pestaña de Richard estaba abierta
  desde antes del mediodía (la app cambia de pantalla sin recargar) y su grabador era anterior a la marca y al aviso de
  versión. Ahora también lo frena el SERVIDOR: `POST /datos/videos` exige `version` igual al commit publicado
  (`grabadorViejo`); si no, 409 `version_vieja` y la página nueva se recarga sola. La subida de respaldos
  (`respaldo: true`) no se frena. Prueba: «C-VERSION (servidor)» en `pruebas/recorte.test.ts`.

## C-RECORTE-MEDIO (8 nov 2026)

- Qué pasaba: los cortes del MEDIO (quitar silencios, muletillas, cortar por texto) solo se saltaban al reproducir; el
  MP4 descargado salía entero por dentro (solo sin las puntas).
- Causa: la firma de la copia MP4 (`firmaRecorte` en `servidor/app.ts`) solo miraba las puntas, y el navegador
  (`aMp4` en `web/src/logica/mp4.ts`) solo sabía hacer `trim` de las puntas.
- Arreglo: la firma incluye los cortes (`cortesDe`, redondeados a la décima; sin cortes la firma queda igual que
  antes y las copias viejas siguen valiendo). `POST /datos/videos/:id/mp4` manda los `cortes`. Con cortes, `aMp4`
  re-codifica siempre (`forceTranscode`) y pasa cada cuadro y cada pedazo de audio por `process`: lo que cae en un
  tramo oculto (puntas + cortes, `tramosParaMp4`) se descarta y lo demás se corre hacia atrás. Los cuadros de video
  se colocan por su primer instante visible y se acortan si cruzan un corte (`cuadroEnSalida`: una pantalla quieta
  puede dar un cuadro de varios segundos); el audio, por su centro (`tiempoEnSalida`).
  Sin cortes del medio se usa el `trim` de siempre (C-RECORTE-DESCARGA), sin tocar.
- Pruebas: `pruebas/recorte.test.ts` (firma y cuentas) y `e2e/recortar-medio.spec.ts` (graba 10 s, corta 2 s y 3 s
  del medio y mide el MP4: debe durar 5 s menos). Comprobada en rojo apagando los cortes en `tramosParaMp4`: salía
  de 10,6 s.
- NO quitar `forceTranscode` cuando hay cortes: si el original ya es H.264/AAC, mediabunny copiaría los paquetes y
  `process` no se llamaría (el MP4 saldría entero otra vez).

## C-PLANES-EDICION (8 nov 2026)

- Starter (solo con `COBRO_ACTIVO=1`): la primera miniatura la pone sola la grabación; elegir otra y poner un botón
  de acción con enlace piden Business (402 `plan_edicion`). Quitar el botón siempre se puede. Límite `edicion` en
  `servidor/planes.ts`; la pantalla de editar desactiva esos campos y dice «Parte de Business».
- Prueba: «C-PLANES-EDICION» en `pruebas/servidor.test.ts`, comprobada en rojo quitando las dos compuertas.

## C-SUBIR-VIDEO (8 nov 2026)

- «Subir un video» en la Biblioteca (`web/src/componentes/SubirVideo.tsx`, cuentas en `web/src/logica/archivoVideo.ts`):
  MP4 o WebM de hasta 5 GB, título del nombre del archivo, duración leída con mediabunny, misma subida por partes y
  con reintentos que «Subir otra vez» (`subirGrabacion` con `titulo`). El servidor cumple el plan igual que con una
  grabación (tope de videos y de minutos). Con tope de minutos, el servidor rechaza duración 0 y un archivo que pese
  más que `bytesMaximos` (2,5 MB por segundo del tope, `servidor/planes.ts`): la duración la declara el navegador.
  El tope de 5 GB es solo de la pantalla. Límite honesto: un archivo subido no lleva la marca grabada dentro (la
  marca del reproductor sí sale para el plan gratis).
- Guía pública: Docs → «Sube un video desde tu computadora» (`upload-a-video`).
- Pruebas: `pruebas/archivo-video.test.ts` y `e2e/subir-video.spec.ts` (sube `e2e/datos/fragmentado.mp4`), comprobada
  en rojo quitando el título.

## C-RENOMBRAR-CARPETA (8 nov 2026)

- Renombrar una carpeta abre la misma ventanita que renombrar un video (`Renombrar` en `Biblioteca.tsx`), nunca el
  cuadro `prompt` del navegador. Prueba en `e2e/auditoria.spec.ts` (falla si se abre un cuadro del navegador),
  comprobada en rojo volviendo a `prompt`.

## C-INDICE-MP4 (8 nov 2026)

- Qué pasaba: Chrome graba el MP4 en fragmentos (ftyp, moov vacío, moof+mdat…) y sin índice; saltar a un minuto
  lejano tardaba. Decidido por Gerencia: se REEMPLAZA el original, sin segunda copia.
- Cómo funciona: al terminar de grabar (y al subir un MP4 desde la computadora o «Subir otra vez»), el navegador ya
  tiene el archivo entero y llama de fondo a `ponerIndiceDeFondo` (`web/src/logica/indice.ts`): (1) mira las cajas
  de los primeros 64 KB (`web/src/logica/cajasMp4.ts`); si ya trae moov antes de mdat y sin moof, no hace nada;
  (2) reordena con mediabunny `Conversion` SIN re-codificar (`fastStart: 'in-memory'`), rechazando si se descarta
  alguna pista; (3) `comprobarCopia`: índice al principio, misma duración (±0,5 s), tiene imagen, primer cuadro
  legible y la misma cantidad de pistas de sonido; (4) sube a `videos/<id>/indice.mp4` por partes
  (`POST/PUT /datos/videos/:id/indice…`) y el servidor, en `completar`, VUELVE a comprobar (`copiaIndiceValida`:
  cajas, peso entre 0,8 y 1,1 del original, duración ±2 s o 3 %). Si vale, copia encima de `videos/<id>/video`,
  borra la temporal y actualiza `bytes`. Si no, borra la temporal (422 `copia_invalida`) y el original queda igual.
- Si falla en el navegador queda en `errores_cliente` con `donde = 'indice'` (se ve en el superadmin). Más de 1,5 GB
  no se reordena (memoria); el original sigue funcionando.
- Pruebas: `pruebas/indice.test.ts` (cajas con `e2e/datos/fragmentado.mp4`, reordenar de verdad en Node, servidor
  acepta copia buena y rechaza sin índice u otra duración), comprobada en rojo quitando la comprobación de cajas.
  E2E: `e2e/grabar.spec.ts` espera que el original quede `ftyp,moov,mdat`.
- No tocar: que el servidor compruebe antes de reemplazar; reordenar nunca re-codifica.

## C-VERIFICAR-CORREO (8 nov 2026)

- Como Loom: la cuenta se usa desde el primer segundo. Al registrarse el correo de bienvenida trae «Confirmar mi
  correo» (`/verify-email?token=…`, vence en 7 días; tabla `verificaciones`, guardado como hash). Confirmado queda en
  `correo_verificado`. Las cuentas creadas antes de `CORTE_VERIFICACION` (servidor/app.ts) cuentan como verificadas
  sin fila (no se escribe nada en la base para ellas).
- Sin confirmar: franja discreta arriba con el correo y «Enviarlo otra vez» (`/datos/verificar/reenviar`, 3 por
  hora), nunca una ventana; no se puede pagar (`/datos/pago/suscripcion` → 403 `correo_sin_verificar`, ANTES de
  mirar si el cobro está encendido) y pasados `DIAS_SIN_VERIFICAR` (7) días no se crean videos nuevos (403). Los
  videos que ya hay siguen igual. `/datos/yo` dice `correo_verificado`.
- Pruebas: `pruebas/verificar-correo.test.ts` (enlace en el correo, una sola vez, tope a los 7 días, pago, cuentas
  viejas), comprobada en rojo quitando el tope de videos. E2E: `e2e/grabar.spec.ts` exige la franja tras registrarse.
- Guía pública: Docs → «Crea tu cuenta» (párrafo de confirmar el correo, en los dos idiomas).
- No tocar: el corte (mover hacia adelante dejaría sin verificar cuentas viejas) y el orden de la compuerta de pago.

## C-EQUIPOS (8 nov 2026)

- Qué es: espacios de equipo al estilo de los «Workspaces» de Loom, acotados. Tablas nuevas (`schema.sql`, solo
  `CREATE ... IF NOT EXISTS`): `equipos`, `miembros_equipo` (rol `admin`/`miembro`), `invitaciones_equipo` (token
  guardado como hash, vence en 7 días) y `videos_equipo` (llave `(video_id, equipo_id)`: un video puede estar en varios
  equipos de su autor). Índices solo los que usa una consulta: miembros por usuario, invitaciones y videos por equipo.
- Permisos: `puedeVer` (servidor/app.ts) ahora es asíncrona y, para un video LISTO y privado, mira si la cuenta es
  miembro de un equipo con el que está compartido. La usan `GET /datos/videos/:id`, actividad, comentarios, reacciones,
  vista, `/media/:id/video` y `/media/:id/miniatura`. Solo el autor edita, borra o comparte (`videoDelDueno`). Quien
  no es miembro recibe 404 en el equipo y en sus videos. Mirar no escribe en la base.
- Rutas: `/datos/equipos` (listar, crear), `/datos/equipos/:id` (ver, renombrar admin, borrar solo dueño),
  `/invitar` (admin, tope 30 por hora, manda el correo `correoInvitacionEquipo` en el idioma de quien invita y
  DEVUELVE el enlace `/join?token=…`), `/invitaciones` (cancelar), `/datos/equipos/unirse` (exige sesión y el mismo
  correo: si no, 403 `invitacion_otro_correo`; vencido o usado, 400 `enlace_vencido`), `/miembros/:usuario` (quitar,
  salir, cambiar rol; al dueño no se le quita ni se sale: 403 `es_dueno`), `/videos` y `/videos/:video` (compartir y
  dejar de compartir) y `GET /datos/videos/:id/equipos` (la ventanita). Borrar un equipo borra membresías,
  invitaciones y lo compartido, NUNCA videos. Borrar la cuenta borra sus equipos y sus membresías.
- Pantalla: «Teams/Equipos» en la barra lateral de la Biblioteca con «+» (ventanita propia), página `/team/<id>`
  (`web/src/paginas/Equipo.tsx`), invitar con `useBorrador` y botón para copiar el enlace, «Share with a team» en el
  menú ⋮ de cada video, `/join?token=…` (sin sesión manda a crear cuenta con `volver` y regresa). Quitar, salir y
  borrar viven solo en el menú ⋮ con confirmación. `/team` y `/join` llevan noindex (`metaDeRuta`).
- Planes: no limitan equipos todavía (pendiente en PENDIENTES.md).
- Guía pública: Docs → «Team spaces / Espacios de equipo» (`team-spaces`).
- Pruebas: `pruebas/equipos.test.ts` (crear, invitar con enlace en correo y respuesta, unirse con el correo correcto y
  rechazo con otro, vencido, video privado compartido visible para el miembro y 404 para los de fuera, quitar, salir,
  dueño que no sale, borrar sin borrar videos, mirar sin escribir). Comprobada en ROJO dos veces: con `puedeVer`
  dejando ver todo privado (fallan 3) y sin mirar el equipo (fallan 2). E2E: `e2e/equipos.spec.ts` (dos cuentas reales:
  crear, invitar, copiar enlace, unirse creando la cuenta, compartir un video privado y verlo).
- No tocar: que `puedeVer` exija estado `listo` antes de mirar equipos, y que unirse compare el correo de la sesión.

### Revisión del 8 nov 2026 (C-REPORTE-ERROR y C-EXTENSION)

- La consola y la red las ven SOLO el dueño y los miembros del equipo con el que se compartió el video; quien solo tiene
  el enlace público ve el video pero no los registros (`GET /datos/videos/:id/registros` mira el video como privado).
- `limpiarUrl` también tapa pedazos de ruta que parecen llaves (`pareceLlave`: mayúsculas+minúsculas+números de 20+,
  bloque de 24+ sin guiones con números, uuid, hexadecimal largo); un slug de palabras en minúscula no se tapa.
  `limpiarTexto` tapa cabeceras copiadas (`Cookie:`, `Set-Cookie:`, `Authorization:`, `x-api-key:`) y correos.
- La extensión PUBLICADA solo acepta mensajes de pantalay.com, www y pantalai.sitios.dev: `scripts/extension.mjs`
  quita localhost/127.0.0.1 del manifiesto y compila `__PRUEBAS__ = false` (falla el armado si queda un `http:`). La
  compilación `--pruebas` sí los acepta para la e2e.
- Pruebas en `pruebas/registros.test.ts` y `pruebas/extension.test.tsx`; la de rutas comprobada en rojo.

## C-ESTUDIO-RECORTE (9 nov 2026)

- Protege: el Estudio de reacciones (`/studio`) graba SOLO el escenario de la máscara «Podcast» (cámara + video de
  YouTube + carteles + tema), nunca la pestaña entera, la barra del sitio, los botones ni el escritorio.
- Cómo funciona: `Grabadora.recortarA = escenario` → `getDisplayMedia({ preferCurrentTab: true })` (esta pestaña) →
  `track.restrictTo(RestrictionTarget)` (Element Capture, Chrome 132+: solo el elemento aunque algo le pase por
  encima) o, si no existe, `track.cropTo(CropTarget)` (Region Capture). El escenario lleva `isolation: isolate`
  (Element Capture lo exige). Al empezar, la página lleva el escenario a la vista debajo de la barra de arriba.
  La pista recortada pasa por el mismo lienzo y el mismo mezclador de siempre (marca, versión, subida por partes).
- Cómo se veía roto (primer intento, 9 nov 2026): `cropTo` solo, y al bajar la página la barra blanca del sitio
  salía tapando el escenario dentro del video. Y `cropTo` en Chrome vive en `BrowserCaptureMediaStreamTrack`, no en
  `MediaStreamTrack`: mirar el prototipo equivocado apagaba el estudio entero.
- Prueba: `e2e/estudio.spec.ts` (graba de verdad con un reproductor de YouTube falso y verde servido en la dirección
  del oficial; exige ancho del archivo = ancho del escenario, 16:9, esquinas oscuras sin la barra del sitio y el verde
  en la tarjeta del video). Comprobada en ROJO el 9 nov 2026: sin `restrictTo` el archivo midió 132 px de más.
  Lo puro: `pruebas/estudio.test.ts` (enlaces de YouTube, protocolo del reproductor, máscara, Region Capture; en rojo
  aceptando cualquier dominio). oEmbed: `pruebas/servidor.test.ts` › estudio de reacciones.
- No tocar: el reproductor es el OFICIAL insertado (`youtube-nocookie.com/embed`, `controls=0`, `rel=0`,
  `enablejsapi=1`) controlado por mensajes; nada se descarga. `frame-src` de la CSP incluye youtube-nocookie y
  youtube. Ningún botón va dentro del escenario. `/datos/oembed` pide sesión y no escribe en la base.
- Posiciones y TikTok (9 nov 2026, pedido de Richard al probar con un TikTok): el escenario sigue en 16:9 y tiene
  tres posiciones (`clasico` cámara cuadrada + video ancho, `iguales` dos horizontales, `vertical` cámara ancha +
  video 9:16). Un TikTok o un Short elige `vertical` solo (`disenoPara`). TikTok usa su reproductor oficial
  `tiktok.com/player/v1/{id}` con `controls=0` y su protocolo de mensajes (`type`, `value`, `x-tiktok-player`);
  el creador sale del enlace y los enlaces cortos (vm./vt./t/) los resuelve `/datos/oembed` siguiendo la redirección.
  Prueba: `e2e/estudio.spec.ts` › TikTok vertical (exige la posición vertical marcada, la tarjeta 9:16, el verde en
  su centro y la máscara oscura justo al lado). Comprobada en ROJO el 9 nov 2026 (sin la posición automática falla
  la e2e y la unitaria).
- Ojo: TikTok limita su reproductor por dominio; desde un navegador automático respondió «TOO_MANY_REQUESTS» (2005).
  La página lo dice claro («inténtalo en un minuto») en vez de quedarse en negro.
- Play de TikTok (9 nov 2026, Richard lo probó en vivo: «al tocar play queda congelado en la portada»). Causa real,
  comprobada con un TikTok de verdad: el reproductor oficial de TikTok muestra primero una PORTADA y no avisa
  «listo» ni obedece play/pausa desde afuera hasta que alguien toca el video POR DENTRO. Y el estudio tenía
  `pointer-events: none` sobre el video, así que el toque nunca llegaba. Arreglo: el video se puede tocar (sin esa
  capa), mientras TikTok no responde se muestra «TikTok pide un toque…» con «Abrir en TikTok», nuestro Play no finge
  que arrancó, y si cualquier video (YouTube o TikTok) no arranca en 4 s se dice claro y se ofrece abrirlo en su
  página. Prueba: `e2e/estudio.spec.ts` › TikTok (su reproductor falso se porta igual: no responde hasta el toque).
  Comprobada en ROJO el 9 nov 2026 volviendo a poner `pointer-events: none`. NO volver a poner capas ni
  `pointer-events: none` sobre los reproductores. Ojo: TikTok corta con «TOO_MANY_REQUESTS» (2005) si se le prueba
  muchas veces seguidas desde la misma conexión, y a los navegadores automáticos les muestra «Mira este video en
  TikTok»: no confundir con un fallo nuestro.
- Formato vertical 9:16 (9 nov 2026, Richard pidió el Short): «Formato» horizontal 16:9 o vertical 9:16. En vertical
  la posición es fija (cámara arriba que llena el espacio libre, video abajo, tema al pie en dos líneas) y un video
  vertical se muestra al centro en 4:5 (el iframe 9:16 se recorta arriba y abajo). Las medidas internas usan
  `var(--u)` (1cqw en horizontal, 2,3cqw en vertical) para que las letras se lean igual. OJO: en el propio
  `.escenario` NO usar `cqw` (se mide contra la ventana, no contra él): sus márgenes van en los hijos.
  Prueba: `e2e/estudio.spec.ts` › Short vertical 9:16 (archivo 9:16, cámara arriba del video, verde en el video).
  Comprobada en ROJO el 9 nov 2026 (sin el formato vertical el archivo sale 16:9).
- A la vista y sesión de TikTok (9 nov 2026, Richard: «si a mí me costó encontrarlo, que soy el CEO, imagínate los
  demás»; y comprobó que TikTok solo se reproduce con la sesión de TikTok iniciada en el navegador). Hay botón
  «🎙️ Reacciones» en el menú de arriba, la opción «Reaccionar a un video» en los modos de Grabar y una tarjeta grande
  en la portada (`#estudio-de-reacciones`). En el estudio, una línea fija dice que YouTube no pide cuenta y TikTok sí,
  con «Iniciar sesión en TikTok» (`https://www.tiktok.com/login`); si un TikTok no arranca o TikTok lo bloquea, el
  aviso lo explica con amabilidad. No se puede saber desde nuestra página si la persona tiene sesión en TikTok (es
  otro sitio): por eso se dice siempre que falla. Prueba: `e2e/estudio.spec.ts` › «está a la vista…» y › TikTok
  vertical (texto de sesión). Comprobadas en ROJO el 9 nov 2026 quitando el botón del menú y el texto de sesión.

## C-PROBADOR-MICROFONO (9 nov 2026)

- Protege: si no llega señal del micrófono (apagado, sin batería, desconectado o mal elegido), se dice claro con
  «No llega señal de tu micrófono…» (en el Estudio, en los ajustes de Grabar y, en pequeño, mientras se graba).
  Antes (Richard, 9 nov 2026) el micrófono se quedó sin batería y lo único que lo delataba era una barrita quieta.
- Cómo: `web/src/componentes/ProbadorMicrofono.tsx` escucha el micrófono APARTE y SIN filtros de voz (con filtros
  el silencio sale en cero y daría falsas alarmas); ventana larga (`fftSize` 32768, ~0,7 s) para no perder sonidos
  cortos; `VigiaMicrofono` (`web/src/logica/microfono.ts`): 3 s seguidos con pico < 0,0008 = sin señal. Mientras
  el navegador tiene el sonido «dormido» (antes del primer toque) no se juzga.
- Prueba: `pruebas/microfono.test.ts` y `e2e/microfono.spec.ts` (micrófono que entrega solo ceros → aviso, en el
  Estudio y en Grabar). El micrófono vivo de prueba → «Llega sonido» en `e2e/estudio.spec.ts`. Comprobadas en ROJO
  el 9 nov 2026.

## C-ESTUDIO-VOLUMENES y posición grande (9 nov 2026)

- Volumen del video aparte del micrófono (Richard: «si le bajo a la computadora le bajo todo»). YouTube recibe
  `setVolume` por su API (se oye y se graba así); TikTok solo deja silenciar, así que su volumen en la grabación lo
  pone el mezclador (`Grabadora.ajustarVolumen('sistema')`). El micrófono en la grabación va de 0 a 200 %
  (`ajustarVolumen('micro')`); cada sonido tiene su ganancia antes de mezclarse y la barrita mide lo que se graba.
  Prueba: `e2e/estudio.spec.ts` (el reproductor recibe `setVolume` 40) y `pruebas/estudio.test.ts`.
- Posición «video vertical grande» (`diseno-grande`): el video de pie ocupa el escenario de arriba abajo a la
  derecha, sin cartel encima; cámara, carteles y tema a la izquierda. TikTok y Shorts la eligen solos
  (`disenoPara`). Las otras tres posiciones NO se tocaron (Richard: «a alguien le puede gustar chiquito»).
  Prueba: e2e › TikTok (alto del video > 85 % del escenario). Comprobadas en ROJO el 9 nov 2026.
- Short 9:16 «video protagonista» (9 nov 2026, Richard: «el protagonismo principal lo tiene el video… me molesta
  cuando el que reacciona tiene mucho protagonismo»): posición `vertical-protagonista` — cámara pequeña arriba (16:9,
  55 % del ancho) con los dos carteles al lado, el video ocupa el resto entero (sin recortar) y se esconden el nombre
  del programa y el tema. Un video vertical la elige solo (`disenoVerticalPara`); la de «cámara grande arriba»
  (`vertical-mitades`) sigue, ahora con menos letras (sin la píldora, cabecera y tema de una línea, chicos).
  Prueba: `e2e/estudio-vertical.spec.ts` (video > 70 % del alto, cámara < 22 %, sin programa ni tema). Comprobada
  en ROJO el 9 nov 2026.
- Elegir el micrófono (9 nov 2026): el Estudio usaba SIEMPRE el micrófono «predeterminado» del navegador; a Richard
  le tomaba el de la Mac y su micrófono de estudio no entraba, sin forma de cambiarlo. Ahora el Estudio tiene
  «Micrófono» y «Cámara» (guardados con el borrador) y la grabadora usa el elegido. Si no llega señal, el probador
  escucha 1,3 s cada uno de los otros micrófonos y ofrece «Usar este micrófono» con el primero que suena (también en
  Grabar). Prueba: `e2e/microfono.spec.ts` › «encuentra el micrófono que sí tiene sonido».

## C-ESTUDIO-MEDIDA-FIJA (9 nov 2026)

- Qué pasaba (Richard: «descargo el MP4 y no abre en la Mac»): en el Estudio el lienzo seguía el tamaño del recorte;
  si el escenario se movía o quedaba en parte fuera de la pantalla (Richard bajó la página para ver los botones), el
  video cambiaba de medida a mitad (2992×1150 → 2992×1684). Chrome lo tolera; QuickTime y la Mac no lo abren.
  Además, lo que quedaba fuera de la pantalla no salía (a ratos solo la mitad del escenario).
- Arreglo: (1) la grabación del Estudio tiene medida FIJA y estándar (`medidaGrabacionEstudio`: 1920×1080 horizontal,
  1080×1920 vertical) y el lienzo NO se redimensiona si hay `recortarA`; (2) antes de pedir la grabación, la página
  se prepara (`clavado`): se esconde todo menos el escenario, los botones van en una barra fija abajo (con los
  volúmenes) y la página NO se puede desplazar (`html.estudio-sin-scroll`). NO usar `position: fixed` en el
  escenario: con eso el navegador a veces grabó en negro.
- Prueba: `e2e/estudio.spec.ts` › «graba solo el escenario» achica la ventana y baja la página a mitad de la
  grabación; luego examina el MP4 con FFmpeg (`examinarVideo` en `e2e/ayuda.ts`): TODOS los cuadros 1920×1080,
  esquinas oscuras y el verde del video. En CI se instala ffmpeg (verify.yml). Comprobada en ROJO el 9 nov 2026
  (sin el freno: medidas mezcladas y «cabac decode … failed», el mismo error que rompía la Mac).
- El video que Richard grabó así (`b70a1nd4h8y4x43ub836`) se reparó aparte con FFmpeg (1920×1080) y se le entregó.
- Video de la computadora (9 nov 2026, Richard: TikTok «a veces arranca y otras no»): botón «Subir un video de mi
  computadora» al lado de «Cargar video». El archivo se reproduce con un `<video>` local (`URL.createObjectURL`,
  plataforma `archivo`), NO se sube a ningún lado; nuestros botones, atajos y volumen lo manejan directo; si es
  vertical elige solo la posición grande. Sin espejo (`.video-local`; el espejo es solo para la cámara).
  Prueba: `e2e/estudio-vertical.spec.ts` › «video de la computadora» (graba y examina el MP4 con FFmpeg: verde en la
  tarjeta del video, 1920×1080). Comprobada en ROJO el 9 nov 2026.
- Enlaces de Pantalay en el Estudio (9 nov 2026, Richard subió su TikTok a la biblioteca y pegó ese enlace):
  `videoDePantalay` reconoce `pantalay.com/v/…` y `/embed/…`; se reproduce como un archivo local desde
  `/media/<id>/video` (mismo sitio, con la sesión). Prueba: el final de la e2e «video de la computadora». En ROJO el
  9 nov 2026.

## C-MEZCLA-SIN-SATURAR (9 nov 2026)

- Qué pasaba (Richard: «el micrófono suena saturado»): el micrófono iba con el ajuste automático de ganancia del
  navegador (con la boca pegada subía solo) y la voz + el sonido del video se sumaban sin tope (pasaban de 0 dB).
- Arreglo (`web/src/logica/grabadora.ts`): toda la mezcla pasa por un compresor (`LIMITADOR`) y después por un techo
  suave (`curvaTecho`, WaveShaper con `TECHO` 0,71 = −3 dB; antes −1,5 dB y en WebM/Opus el pico subió a −0,2 dB): matemáticamente no puede pasar del techo (el compresor
  del navegador SUBE el volumen solo después de comprimir; por eso solo no alcanzaba). El Estudio pide el micrófono
  con `autoGanancia: false`; Grabar lo deja como estaba (por defecto sí).
- Prueba: `pruebas/mezcla.test.ts` y `e2e/estudio.spec.ts` (micrófono al 200 % → FFmpeg `volumedetect`: pico ≤ −0,5
  dB; queda en −1 dB). Comprobada en ROJO el 9 nov 2026: solo con el compresor el pico fue 0,0 dB.

## C-SEO-IDIOMAS (9 nov 2026)

- Qué pasaba (Richard: «no la veo posicionada en las búsquedas»): todo vivía en una sola dirección en inglés; el
  español solo aparecía al cambiar el idioma en la página, así que Google no tenía nada en español («grabar pantalla»).
  Tampoco había páginas para cada búsqueda.
- Arreglo: el español vive bajo «/es/…» con las mismas palabras en inglés en la dirección (`web/src/logica/rutasIdioma.ts`;
  inglés sigue siendo el principal). Cada página pública (portada, Docs, cada guía, legales y las páginas por búsqueda)
  tiene `<html lang>`, título y descripción en su idioma (`metaDeRuta`), texto para Google en su idioma
  (`contenidoDeRuta`), datos estructurados (`datosEstructurados`: SoftwareApplication, FAQPage, HowTo, TechArticle,
  BreadcrumbList), etiquetas hreflang en/es/x-default (`alternasIdioma`) y su lugar en el mapa del sitio con
  `xhtml:link`. En la app, en las páginas públicas manda el idioma de la dirección y el selector lleva a la gemela;
  los enlaces internos usan `enlace()` del contexto de idioma. Páginas por búsqueda (`web/src/paginas/landings.ts`):
  screen-recorder, record-screen-and-camera, reaction-video-maker, vertical-video-recorder, enlazadas desde el pie.
- Ojo: la lista de páginas privadas compara la palabra completa («/record-screen-and-camera» es pública aunque
  empiece como «/record»; antes se ocultaba de Google).
- Prueba: `pruebas/seo-idiomas.test.ts` y `e2e/seo.spec.ts`. Comprobadas en ROJO el 9 nov 2026 (sin «/es» = español).

## C-RED-VIDEOS (9 nov 2026)

- Qué es (pedido de Richard): «Publicar en Pantalay» pone un video listo en la red de videos: «/videos» (cuadrícula),
  «/videos/<id>» (reproductor grande, título, autor, vistas, me gusta, compartir, denunciar y «Más videos» a la
  derecha) y un carrusel en la portada. Estructura estándar de plataforma de video con la marca de Pantalay (no copia
  de YouTube).
- Base: tablas nuevas `red_publicaciones`, `red_me_gusta`, `red_denuncias` (no se tocan columnas de `videos`).
  Solo aparece un video publicado, NO oculto, listo, con enlace público y sin archivar (`SQL_RED`): si el dueño lo
  vuelve privado o lo archiva, sale solo. Publicar exige `acepto` (reglas) y deja el video con enlace público.
  El superadmin ve las denuncias (`/datos/red-denuncias`) y oculta (`/datos/red/<id>/ocultar`); un video oculto el
  dueño no lo puede volver a publicar solo. Mirar NO escribe en la base; me gusta, publicar y denunciar sí.
- Google: «/videos» y «/es/videos» indexables; cada «/videos/<id>» lleva tarjeta para redes y `VideoObject`; los
  publicados van al mapa del sitio.
- Prueba: `pruebas/servidor.test.ts` › C-RED-VIDEOS y `e2e/red.spec.ts` (publicar con reglas, Videos, me gusta,
  denunciar, VideoObject, mapa del sitio, carrusel de la portada sin sesión, quitar). Comprobadas en ROJO el 9 nov 2026.
- Ojo en las pruebas: el carrusel se mueve; se pasa el mouse por la ventana para detenerlo antes de tocar una tarjeta.
- Red más viva (9 nov 2026, Richard: «que no se vea tan pálida»): banner de Pantalay en «Videos» y en cada video,
  espacios vacíos «Tu video aquí» hasta 30 en Videos, 10 en «Más videos» y 12 en el carrusel (el carrusel ya no repite
  el mismo video), perfil del creador en «/channel/<id>» (banner, inicial, videos y me gusta; `/datos/red-canal/<id>`
  y `/datos/red?autor=`), y en la portada el carrusel de videos va primero, bajo «Tu video, donde ya está tu gente»,
  antes de los logos. Prueba: `e2e/red.spec.ts` (banner, 30 y 10 espacios, perfil). En ROJO el 9 nov 2026.

## C-GRABAR-ARRIBA (9 nov 2026)

- Qué pasaba (Richard: «ese botón no hace nada y engaña»): en Grabar y en el Estudio, el «Grabar» rojo del encabezado
  llevaba a la misma página, así que parecía que no hacía nada; y en el Estudio, mientras se grababa, «Grabando»
  llevaba a /record (se salía del Estudio).
- Arreglo: en /record y /studio el «Grabar» de arriba manda el evento `EVENTO_GRABAR` y la página arranca su
  grabación (`useBotonGrabarDeArriba`), igual que el botón de abajo y con el mismo clic (el navegador lo permite).
  El Estudio avisa al encabezado (`fijarEstadoGrabacion`) y «Grabando» se queda en /studio.
- Prueba: `e2e/estudio.spec.ts` › Short vertical y `e2e/grabar-pestana.spec.ts` arrancan con el botón de arriba.
  Comprobadas en ROJO el 9 nov 2026.

## C-VIDEO-SITEMAP y Shorts en la red (9 nov 2026)

- Google y los videos: `robots.txt` BLOQUEABA `/media/`, así que Google no podía leer ni miniaturas ni videos (sin
  eso no indexa ninguno). Ahora `Allow: /media/*/miniatura` y `Allow: /media/*/video` (la regla más larga gana) y
  sigue `Disallow: /media/` para lo demás; los privados siguen dando 404 sin permiso. Mapa de videos en
  `/video-sitemap.xml` (`sitemapVideos`, extensión video de Google: página, miniatura, título, descripción,
  content_loc, player_loc, duración, vistas, fecha, autor), anunciado en robots. Cada `/videos/<id>` lleva
  `VideoObject`. Para Search Console: enviar `https://pantalay.com/video-sitemap.xml`.
- Shorts: `/datos/red?forma=vertical|horizontal`; en «Videos» van dos filas de videos, el estante de Shorts (9:16,
  8 espacios con relleno) y el resto. Un Short se abre con el reproductor en vertical.
- Prueba: `pruebas/seo-idiomas.test.ts` › mapa de videos y robots; `pruebas/servidor.test.ts` › Shorts;
  `e2e/red.spec.ts` › estante de Shorts. Comprobadas en ROJO el 9 nov 2026.

## C-BUSCADOR, Shorts arriba y videos legibles por Google (9 nov 2026)

- Pedido de Richard: «tiene que ser un buen buscador», «los Shorts están muy abajo», «que se indexe el nombre y el
  link de cada video». Estudio previo con REA de la web pública de YouTube: `docs/investigacion-rea/FICHA-YOUTUBE.md`.
- Buscador: lo puro en `web/src/logica/busquedaRed.ts` (`normalizar` sin tildes ni mayúsculas, `buscarEnRed` con
  pesos título > creador > descripción > lo que se dice en el video; pide todas las palabras y, si nadie las tiene,
  muestra los que tienen alguna; `sugerencias`). Servidor: `/datos/red/buscar?q=&forma=&orden=` y
  `/datos/red/sugerencias?q=`, solo sobre lo publicado (mismo filtro `SQL_RED`). Pantalla: `BuscadorRed` (combobox
  con flechas, Enter y Escape) en Videos, en cada video y en cada perfil; resultados en `/videos/search?q=` con
  filtros Todo, Videos, Shorts y Recientes. Los resultados llevan `noindex` (regla de Google para búsquedas internas).
- Shorts arriba: el estante va después de la PRIMERA fila (5 tarjetas) y en la página de un video después de 2
  relacionados.
- Google: `/videos/<id>` escribe en el HTML el título (`<h1>`), el creador, la descripción y el enlace completo;
  `/videos` y `/es/videos` escriben la lista de enlaces de los últimos 100 videos.
- Pruebas: `pruebas/busqueda-red.test.ts`, `pruebas/servidor.test.ts` › C-BUSCADOR y `e2e/red.spec.ts`. Comprobadas
  en ROJO el 9 nov 2026 (romper `normalizar` pone 5 pruebas en rojo).
- No tocar: el orden de las rutas (`/videos/search` antes de `/videos/:id`) ni el filtro `SQL_RED`.

## C-DENUNCIAS: el superadmin revisa las denuncias de la red (9 nov 2026)

- Pestaña «Denuncias» del panel (`PestanaDenuncias` en `web/src/paginas/AdminPartes.tsx`), con el número de videos
  por revisar en el menú. Cada video denunciado sale una vez, con el creador, cuántas denuncias tiene, cada motivo y
  lo que escribió quien denunció. Acciones: «Ver video» (visor del panel con firma), «Ocultar de Videos» (con
  confirmación), «Volver a mostrar» y «Está bien, descartar»; en los tres puntos, la ficha del creador.
- Servidor: `GET /datos/admin/denuncias?estado=pendientes|revisadas` y `POST /datos/admin/denuncias/:id`
  `{decision: ocultado|mostrado|descartado}`, los dos con `requiereSuperadmin` (sesión + lista + dirección secreta).
  La decisión se guarda en la tabla nueva `red_denuncias_revisadas`; una denuncia que llega DESPUÉS de la decisión
  vuelve a poner el video en «Por revisar». Cada decisión queda en el registro del panel (`denuncia_*`).
- Pruebas: `pruebas/servidor.test.ts` › C-DENUNCIAS (comprobada en ROJO el 9 nov 2026: contar todas las denuncias
  como pendientes la pone en rojo) y `e2e/denuncias.spec.ts` (se salta sin `E2E_PANEL` y `E2E_PANEL_CORREO`; local:
  `wrangler dev --var SUPERADMIN_CORREOS:… --var SUPERADMIN_RUTA:…`).

## C-SONIDO-RECIEN-GRABADO: el video recién grabado suena sin recargar (9 nov 2026)

- Lo que se veía: al terminar de grabar y darle play, el video no sonaba ni avanzaba (se quedaba en 0:00 o se paraba
  al segundo) hasta recargar con Cmd+Shift+R.
- Causa real: justo después de grabar, el archivo se reordena en la nube (C-INDICE-MP4) y CAMBIA DE TAMAÑO con la
  MISMA dirección. El navegador ya tenía guardado el principio de la versión vieja y pedía el resto de la nueva; el
  servidor además respondía un pedazo fuera del final con el archivo entero (206). Resultado: «PIPELINE_ERROR_READ:
  data source error» y el reproductor se paraba.
- Arreglo: (1) cada versión del archivo tiene su propia dirección (`&v=` con `version_archivo`, que da el SERVIDOR: tamaño +
  recorte guardado; nunca los cortes sin guardar del editor, que renovaban el video a cada arrastre) y la
  pieza `<video>` se renueva al cambiar, siguiendo desde el mismo segundo; (2) al terminar el reordenado se avisa
  (`EVENTO_ARCHIVO_CAMBIO`) y la página del video se pone al día sola; (3) el servidor responde 416 a un pedazo que
  empieza después del final.
- Pruebas: `e2e/sonido-recien-grabado.spec.ts` (graba de verdad, espera el proceso y exige que suene y pase de 4 s) y
  `pruebas/servidor.test.ts` › C-SONIDO-RECIEN-GRABADO. Las dos comprobadas en ROJO el 9 nov 2026.
- No tocar: el `&v=` de las fuentes del reproductor ni el 416.

## C-MOVIL: Videos al 100 % en el celular (9 nov 2026)

- Barra de abajo (`BarraInferior`, solo en pantallas de 760 px o menos): Videos, Shorts, Grabar (+), Biblioteca o
  Docs, y Tú o Entrar. No sale en Grabar, Estudio, Editar, panel ni insertados.
- Videos: menos adorno arriba, miniaturas de borde a borde, estante de Shorts deslizable; en un video, el reproductor
  de borde a borde y fijo arriba mientras se baja (`.red-ver-principal { display: contents }`).
- Shorts a pantalla completa en `/shorts` y `/shorts/<id>` (`web/src/paginas/Shorts.tsx`): uno por pantalla con
  scroll-snap, se reproduce solo el que se ve, la dirección cambia al deslizar, toque para el sonido, me gusta,
  compartir y Más. En la computadora: flechas. `/shorts/<id>` lleva canonical a `/videos/<id>` (SEO).
- Videos subidos de un archivo ahora guardan su ancho y alto (`medidasDeArchivo`): antes quedaban en 0 y un video
  vertical subido nunca salía como Short.
- Prueba: `e2e/movil.spec.ts` (sin desbordes en 390 px, barra, Shorts, canonical). Comprobada en ROJO el 9 nov 2026.

## C-PWA: Pantalay se instala como app (9 nov 2026)

- `web/public/manifest.webmanifest` (íconos 192, 512 y 512 «maskable», `display: standalone`, atajos), `sw.js` (las
  páginas van primero a la red y sin internet sale `/offline`; guarda `/assets/`; NUNCA toca `/datos` ni `/media`),
  `offline.html` + `offline.js` (sin código en línea por la CSP). Registro y botón «Instalar la app» en
  `web/src/logica/pwa.ts` y `BotonInstalar` (pie y menú de la cuenta; en iPhone lleva a la guía `install-app`).
- Ojo: `/offline.html` redirige a `/offline` (así sirve los archivos YaDominios): el ayudante usa `/offline`.
- Prueba: `e2e/movil.spec.ts` › app instalable y página sin conexión. Comprobada en ROJO el 9 nov 2026.

## C-KARAOKE: botón Karaoke del Estudio (9 nov 2026)

- Pedido de Richard: voz con reverb bonito como los lives de canto, mezcla equilibrada con la música, un punto por
  defecto y un control de más o menos. Estudio previo: `docs/investigacion-rea/FICHA-KARAOKE.md`.
- `web/src/logica/karaoke.ts`: cadena de voz pasa-altos 100 Hz → barro 300 Hz −2 dB → presencia 3 kHz → aire 10 kHz →
  compresor (−24 dB, 3:1, 10 ms / 200 ms) → seco + reverb (impulso propio de 1,7 s, pre-delay 25 ms, retorno 300 Hz a
  6 kHz) + eco (120 ms, retorno 300 Hz a 3,5 kHz). Control «Efecto» 0 a 100, por defecto 50 (reverb −14 dB, eco
  −20 dB, retroalimentación 0,235 con tope duro 0,4). Música −6 dB (0,5) y atrasada lo que tarda la salida (tope
  0,3 s). Micrófono para cantar: sin supresión de ruido ni ganancia automática; cancelación de eco solo con parlantes.
- En `grabadora.ts` la cadena entra solo con `karaoke` en los ajustes; sin karaoke el cableado es el de siempre.
- Sin afinación automática ni «ducking» en esta versión (ver la ficha). La persona no se oye con efecto mientras canta.
- Pruebas: `pruebas/karaoke.test.ts` (comprobada en ROJO el 9 nov 2026: desconectar el reverb la pone en rojo) y
  `e2e/karaoke.spec.ts` (graba de verdad con Karaoke, el efecto se mueve en vivo, hay sonido y no satura).
- Falta la escucha de Richard (pruebas de aceptación de la ficha, sección 6).

## C-INVITADO: invitado remoto en el Estudio (10 nov 2026)

- Protege: el anfitrión toca «Invite a guest» y obtiene `/join/<32 letras>` (24 h, un invitado a la vez, se guarda
  solo la huella del código). El invitado entra sin cuenta (computadora o celular), escribe su nombre (con borrador),
  ve su cámara y el aviso de audífonos. Conexión WebRTC directa; su imagen va en la segunda tarjeta (sin espejo) con
  su nombre y «Guest», y su voz entra a la grabación por el sonido de la pestaña (la MISMA tubería del Estudio: no hay
  otra grabadora). Si el invitado se cae, la grabación sigue y se guarda. Voz con cancelación de eco, supresión de
  ruido y ganancia automática en los dos lados.
- Cómo funciona: saludo SIN goteo (cada lado espera a juntar sus rutas ICE y manda UNA descripción): el invitado
  `POST /datos/invitado/:codigo/oferta`, el anfitrión consulta `GET /datos/estudio/invitado/:codigo` y responde
  `POST …/respuesta`; el invitado consulta `GET /datos/invitado/:codigo/respuesta`. Consultas solo mientras se
  saludan; conectados, nadie pregunta. Salir avisa por el canal directo («adios»), sin escribir. Tabla
  `salas_invitado` sin índices extra; las vencidas se borran al crear otra sala (sin reloj).
- Presupuesto: una entrevista sin cortes escribe ≤ 8 filas (6 medidas); cada reconexión +3. `PRESUPUESTO_FILAS` en
  `servidor/invitado.ts`.
- Puente: STUN público de Cloudflare siempre; TURN de Cloudflare Realtime solo si están `TURN_LLAVE_ID` y
  `TURN_LLAVE_TOKEN` (credenciales de 24 h pedidas por el servidor; la llave nunca va al navegador; se quita el
  puerto 53). Canario: `/datos/salud` → `invitado.turn`.
- Pruebas: `pruebas/invitado.test.ts` (rutas, un invitado a la vez, dueño, vencido, zod, límites, presupuesto, TURN,
  canario, y la llamada con WebRTC simulado) y `e2e/invitado.spec.ts` (dos Chrome reales: invitado MAGENTA con tono
  de 440 Hz; el MP4 grabado tiene los píxeles magenta en su tarjeta y su voz con el micrófono del anfitrión en 0; el
  invitado se cae a mitad y la grabación se guarda igual). Comprobadas en rojo el 10 nov 2026: con el video del
  invitado oculto la e2e da R=0 en su tarjeta; con escrituras en las consultas falla «presupuesto de escrituras».
- No tocar: no mezclar además la pista del invitado directo en el mezclador (ya entra por el sonido de la pestaña:
  saldría doble); no volver al goteo de candidatos (multiplica las escrituras); no poner `transform: scaleX(-1)` al
  video del invitado.
