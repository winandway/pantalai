# Solución: el video en el celular y para qué sirve la transcripción

Fecha: 19 de octubre de 2026. Publicado y comprobado.

## Lo que pasaba

1. **Al darle play en el iPhone, el video se escondía.** La transcripción va marcando la frase que suena. Para
   mostrarla, movía la página entera hacia abajo, y en el celular el video quedaba fuera de la pantalla. Lo
   medimos con el motor de Safari: la página bajaba sola casi medio metro de pantalla.
2. **«El reproductor no abre».** El video sí se reproducía, pero quedaba arriba, fuera de la vista. Además, el
   botón de pantalla completa no funcionaba en el iPhone, porque el iPhone solo deja poner en pantalla completa el
   video mismo.
3. **La descarga en el iPhone se perdía.** En el teléfono, una descarga normal va a la app Archivos, no a Fotos.

## Lo que se hizo

- **El video manda.** En el celular, la página muestra el video, el resumen y los capítulos. La transcripción y
  los comentarios quedan detrás de un botón, «Transcripción y comentarios». Quien recibe el enlace ve el video sin
  leer nada, y si quiere el texto, lo abre.
- **La transcripción ya no mueve la página.** Cuando está abierta, se desplaza sola por dentro de su recuadro.
- **Pantalla completa en el iPhone** con el reproductor propio del teléfono.
- **Guardar en Fotos.** En el celular, el botón dice «Descargar MP4». Al tocarlo prepara el archivo y cambia a
  «Guardar en Fotos». Ese botón abre el menú de compartir del teléfono, donde está «Guardar video», y el video queda
  en tu galería.
- **Aviso honesto.** Si un teléfono abre un video que todavía no tiene su versión MP4, dice que se está preparando,
  en lugar de mostrar un reproductor que no responde.
- Dejamos una prueba automática con un iPhone simulado que vigila que el video nunca vuelva a esconderse.

## ¿Para qué sirve la transcripción?

La transcripción es el texto de todo lo que se dice en el video. Casi no cuesta: la hace Whisper en Cloudflare, que
transcribe gratis hasta unos doscientos minutos al día. Sirve para seis cosas:

1. **Subtítulos sobre el video.** Es lo que pensabas, y ya existe: el botón CC del reproductor. Vienen encendidos.
   Sirven para ver el video sin sonido, por ejemplo en una oficina o en el transporte, que es como se ve la mayoría
   de los videos en el teléfono.
2. **El título, el resumen, los capítulos y las tareas.** La IA los escribe leyendo la transcripción. Sin ella no hay
   resumen ni capítulos.
3. **Buscar.** En tu biblioteca puedes buscar una palabra que dijiste y encontrar el video.
4. **Saltar al minuto exacto.** Tocas una frase y el video va justo ahí. En un tutorial de un error, quien lo recibe
   va directo a la parte que le importa.
5. **Editar sin volver a grabar.** Quitar muletillas y cortar frases funciona gracias a la transcripción.
6. **Generar documentos.** El procedimiento paso a paso, el reporte de error o la guía salen de la transcripción.

## Qué probar

1. Abre en el iPhone el enlace de un video tuyo. Dale play: el video tiene que quedar a la vista, con subtítulos.
2. Toca el botón de pantalla completa: tiene que abrirse el reproductor del iPhone.
3. Toca «Descargar MP4», espera a que diga «Guardar en Fotos», tócalo y elige «Guardar video». Búscalo en Fotos.
