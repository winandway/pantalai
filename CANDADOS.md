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
