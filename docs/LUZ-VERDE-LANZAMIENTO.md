# Luz verde para el lanzamiento de Pantalay — 21 de octubre de 2026

> **Veredicto: 🟢 LUZ VERDE para empezar la publicidad del plan GRATIS.**
> 🔴 Lo único que NO se anuncia todavía son los planes pagos: el cobro está conectado en vivo, pero falta la primera
> compra real (la de Richard, en video). Hasta entonces la página de precios sigue oculta a Google y los límites del
> plan gratis siguen apagados (todos tienen todo).

## 1. Lo que se probó, de punta a punta

| Prueba                                                                                                    | Dónde                   | Resultado     |
| --------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Recorrido completo de una persona: registrarse, grabar, comentar, reaccionar, compartir privado y con     | Local y **en vivo**     | ✅ pasa       |
| enlace, insertar en otra página, crear carpeta, mover, buscar, duplicar, archivar, borrar, borrar carpeta |                         |               |
| sin perder videos, salir y volver a entrar, buscar en Docs                                                |                         |               |
| Grabar con pantalla y cámara simuladas, subir y ver                                                       | Local y en vivo         | ✅ pasa       |
| Recortar las puntas y descargar recortado                                                                 | Local y en vivo         | ✅ pasa       |
| iPhone: el video se reproduce en MP4 con subtítulos y no se va de la vista                                | Local y en vivo         | ✅ pasa       |
| Lápices mientras se graba y la IA (con proveedores simulados)                                             | Local y compuerta       | ✅ pasa       |
| Mi cuenta: cambiar nombre, borrar la cuenta con contraseña                                                | Local, en pantalla      | ✅ pasa       |
| Pruebas automáticas del servidor y la página                                                              | Compuerta (cada subida) | ✅ 149 de 149 |
| Escudo anti-robots: la sexta cuenta seguida desde la misma conexión se frena                              | En vivo                 | ✅ funciona   |

## 2. Lo que arregló la auditoría profunda

1. **Pagos: nunca dos suscripciones.** Un doble clic o cambiar de plan ya no crea una segunda suscripción (antes podía
   cobrar dos veces). Cambiar de plan modifica la misma, con prorrateo.
2. **Pagos: los avisos de Stripe llegan desordenados.** Ahora se lee siempre el estado real en Stripe antes de guardar,
   y los avisos de una suscripción vieja se ignoran.
3. **El servidor cumple el plan** aunque alguien salte la página: duplicar respeta el tope de videos y una grabación
   más larga que el plan no se guarda.
4. **Tope de IA por persona** (además del tope mensual de 10 USD): nadie puede gastar el presupuesto de todos.
5. **Subidas más seguras:** cerrar dos veces la misma subida (se cortó la red) ya no da error; «cancelar» nunca borra
   un video terminado y no deja archivos huérfanos.
6. **Superadmin:** el uso normal del panel ya no lo bloquea; solo cuentan los intentos fallidos.
7. **Títulos con el signo «$»** ya no rompen la tarjeta para WhatsApp y redes.
8. **Mensajes de error** que salían en blanco o genéricos ahora dicen qué pasó, en inglés y español.
9. **Borrador de formularios:** ya no reaparece vacío después de guardar ni cae en la cuenta equivocada.

## 3. Lo que faltaba y se construyó

- **Textos legales propios de Pantalay**, en inglés (el que rige) y español: Términos del servicio, Política de
  privacidad, Política de uso aceptable y Política de cookies. Escritos para nuestro servicio (no copiados: los de
  Loom tienen derechos de autor), con los datos de Windoce, LLC (Delaware, operación en Novi, Michigan, contacto
  go@windoce.com). En el pie de todas las páginas, en el registro y en Mi cuenta.
- **Mi cuenta:** cambiar nombre y contraseña, ver el plan y su fecha, **cancelar el plan** (la ley de EE. UU. exige que
  cancelar sea tan fácil como comprar), «Mantener mi plan» si se arrepiente, y **borrar la cuenta** (dentro del menú de
  tres puntos, con contraseña; cancela el cobro en Stripe al momento). Con su guía en Docs.
- **Preguntas frecuentes** visibles en la portada, en los dos idiomas.

## 4. Google y los buscadores de IA

| Qué                                                                                            | Estado |
| ---------------------------------------------------------------------------------------------- | ------ |
| Dominio verificado en Google Search Console y mapa del sitio enviado (20 oct)                  | ✅     |
| Mapa del sitio: 32 páginas (portada, Docs, 26 guías y los 4 legales)                           | ✅     |
| El texto de cada página va escrito dentro del HTML: Google y las IAs lo leen sin JavaScript    | ✅     |
| Datos estructurados: aplicación gratis, preguntas frecuentes, sitio, artículos y migas de Docs | ✅     |
| Archivo para IAs `llms.txt` (índice) y `llms-full.txt` (todas las guías completas)             | ✅     |
| robots.txt invita por su nombre a 18 buscadores de IA (ChatGPT, Claude, Perplexity, Gemini…)   | ✅     |
| Páginas privadas (biblioteca, cuenta, grabar, pago, panel) marcadas para que no se indexen     | ✅     |
| Cada guía con su dirección fija, título y resumen propios                                      | ✅     |

Sugerencia: en Search Console, volver a enviar el mapa del sitio (ahora tiene 32 páginas en vez de 25).

## 5. Comparación con Loom (lo que se ve como visitante)

| Función                                            | Loom | Pantalay                     |
| -------------------------------------------------- | ---- | ---------------------------- |
| Grabar pantalla, cámara o las dos, en el navegador | ✅   | ✅                           |
| Enlace al instante al terminar                     | ✅   | ✅                           |
| Sonido de la computadora                           | ✅   | ✅                           |
| Dibujar mientras se graba                          | ✅   | ✅                           |
| Transcripción y subtítulos                         | ✅   | ✅ inglés y español          |
| Título, resumen, capítulos y documentos con IA     | ✅   | ✅                           |
| Comentarios y reacciones con el minuto             | ✅   | ✅                           |
| Quién lo vio y cuánto                              | ✅   | ✅                           |
| Recortar, quitar silencios y muletillas            | ✅   | ✅                           |
| Descargar MP4                                      | ✅   | ✅ (se graba directo en MP4) |
| Insertar en otra página                            | ✅   | ✅                           |
| Carpetas, buscar, archivar, duplicar               | ✅   | ✅                           |
| Botón de acción dentro del video                   | ✅   | ✅                           |
| Subir un video desde la computadora                | ✅   | ❌ pendiente                 |
| Video con contraseña                               | ✅   | ❌ pendiente                 |
| Extensión de Chrome y app de escritorio            | ✅   | ❌ pendiente                 |
| Espacios de equipo y carpetas compartidas          | ✅   | ❌ pendiente                 |
| Integraciones (Slack, Notion, Gmail)               | ✅   | ❌ pendiente                 |

Lo pendiente no frena el lanzamiento del plan gratis: son funciones de equipos y empresas para los planes pagos.

## 6. Avisos honestos antes de la publicidad

- 🔴 **No anunciar precios** hasta que salga bien la compra real de Richard. Después: volver la variable de días de
  prueba a 14, encender los límites del plan gratis y abrir la página de precios a Google.
- 🟡 **Almacenamiento: 20 GB** hasta que se suba a 500 GB en la sesión de YaDominios (alcanza para unas 13 a 16 horas
  de video en 1080p). El superadmin avisa en amarillo al 70 % y en rojo al 90 %. Hacerlo antes de meter dinero en
  publicidad.
- 🟡 Correo: 300 envíos al día (bienvenida, contraseña, facturas). Suficiente para empezar.
- 🟡 No se verifica el correo al registrarse (como en muchos competidores al inicio); queda en la fila.
