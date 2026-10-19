# Ficha REA — Loom (observación pública como visitante)

Fecha: 18 oct 2026. Herramienta: REA (`inspect_web_page` y `capture_web_screenshot`) sobre un Chrome
aislado, sin cuenta, mirando solo páginas públicas. No se analizó ni se descompiló el código de Loom
(sus términos lo prohíben); solo la estructura visible y accesible de la página, como cualquier visitante.

Evidencias:

- Portada de loom.com — `ev_4fe85721e39d9723228a0af8af78489c1d2934f74cc29995799bb7155c205886` (captura: `loom-portada.png`)
- Página pública de un video (`/share/…`) — `ev_ee7a5fa7939d5ea9800fe771a37497e802e64d365e75b364af6c09bf1d29fc37` (captura: `loom-pagina-video.png`)

## Lo observado en la página del video [REA][OBS]

- Arriba: título grande, autor y «hace X tiempo», botón de copiar enlace a la derecha.
- Reproductor con barra de progreso **partida por capítulos**, subtítulos encima del video.
- Controles y atajos de teclado (leídos de las etiquetas accesibles):
  K pausa/reproduce · J atrás · L adelante · M silencio · A subtítulos · S velocidad (1.2× por defecto)
  · T modo teatro · P minimizar · F pantalla completa · Ajustes.
- Debajo: «Summary» (resumen) y «Chapters» (capítulos con su minuto, enlaces que saltan).
- Barra lateral derecha con dos pestañas: **Activity** (comentarios y reacciones) y **Transcript**
  (cada frase con su minuto, resaltada la que suena, botón Copiar y Buscar). «Hide sidebar» la pliega.
- «Copy link» y «Copy snippet» (código para insertar).
- Botón flotante abajo a la izquierda para grabar.
- Los datos de estadísticas viajan a una dirección propia de insights [REA: red].

## Lo observado en la portada [REA][OBS]

Mensajes de producto: grabar pantalla y cámara en pocos clics, compartir con enlace, editor
(recortar, unir, fondos, textos, flechas, recuadros), emojis, comentarios, tareas y CTA en el video,
transcripción y subtítulos en más de 50 idiomas, seguridad empresarial, integraciones.

## Decisión para PANTALAI

Se copia la estructura de la página del video tal cual (título, reproductor con capítulos y
atajos, resumen, barra lateral Actividad/Transcripción, copiar enlace y código para insertar).
Con nuestro código, nuestra marca y nuestros colores.

Lo que en Loom cuesta dinero y aquí sale gratis:

- Transcripción en vivo con el reconocimiento de voz del propio navegador (Chrome), sin proveedor de pago.
- Título automático, capítulos y quitar silencios calculados en el navegador, sin IA de pago.

Lo que requiere IA de pago (resúmenes reales, muletillas, documentos) queda «muy pronto» hasta que
Richard apruebe proveedor y costo.
