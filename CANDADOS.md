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
  extensión de Chrome. Anotado en `PENDIENTES.md`.
- Pruebas: `pruebas/dibujo.test.ts` (comprobada en rojo cambiando el color) y `e2e/lapices.spec.ts` (graba de verdad,
  dibuja una raya roja y mide los píxeles rojos en lo que se graba; comprobada en rojo quitando `pintar` del compositor).
- Capturas: `scripts/capturas-lapices.mjs` → `docs/capturas/lapices-{en,es}.png`.

## C-RECORTE-DESCARGA (20 oct 2026)

- Qué pasaba: al descargar o enviar un video salían las dos puntas (el arranque de la grabación y el clic en
  Terminar). El recorte del editor solo se aplicaba al reproducir; la descarga entregaba el archivo entero.
- Arreglo: recortador como el de los reels (`web/src/componentes/Recortador.tsx`, cuentas en
  `web/src/logica/recorte.ts`): tira de fotos, regla, agarraderas, «Reproducir recortado» y Guardar. La copia MP4 se
  arma CON el recorte (`trim` de mediabunny en `web/src/logica/mp4.ts`). El servidor anota con qué recorte se armó
  cada copia (tabla `video_mp4_recorte`, `firmaRecorte` en `servidor/app.ts`); si el recorte cambia, la copia deja de
  valer, el dueño la rehace al abrir su video y la descarga sale recortada. Las copias de antes sin firma valen solo
  si el video no tiene recorte.
- Límite: los cortes del MEDIO (quitar silencios, cortar por texto) todavía no salen en el MP4, solo en el
  reproductor. Si el navegador no puede armar MP4, se descarga el WebM original entero.
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
