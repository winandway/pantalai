# Ficha REA: YouTube (web pública, como visitante) — 9 nov 2026

> Pedido de Richard: estudiar con REA cómo resuelve YouTube su red de videos para que la nuestra quede completa
> («el buscador no está listo», «los Shorts están muy abajo»). Límite de siempre: solo se OBSERVA la web pública
> como visitante (sin sesión); nada de descompilar ni analizar su código, y no se copia su marca ni su diseño
> visual. Se toman las FUNCIONES y el ORDEN de la experiencia, que son el estándar del rubro.

## Cómo se observó

- Chrome sin sesión con depuración local; REA `capture_web_screenshot` (página de resultados de «reaccion tiktok»)
  e `inspect_web_page` con texto de accesibilidad (página de un video). Captura: `youtube-busqueda-observada.png`.

## Lo observado

### Buscador (página de resultados)

- La caja de búsqueda va arriba al centro, siempre visible, con botón de buscar y búsqueda por voz.
- Debajo, botones para filtrar los resultados: «Todo», «Shorts», «Sin mirar», «Videos», «Subidos recientemente»,
  «En vivo», y a la derecha «Filtros».
- Cada resultado es una FILA: miniatura grande a la izquierda; a la derecha el título, vistas y antigüedad
  («356 k · hace 1 a»), el canal con su avatar, un pedazo de la descripción y un «Resumen» corto.
- La búsqueda encuentra por palabras del título aunque no estén en orden ni con las mismas tildes.
- (No observado en esta pasada, conocido del uso público: al escribir aparece una lista de sugerencias que se
  recorre con el teclado.)

### Página de un video

- Arriba: botón de guía, la caja de búsqueda (combobox «Buscar»), búsqueda por voz.
- El reproductor con atajos de teclado anunciados en los botones (Pausa «k», Silenciar «m», Subtítulos «c», Modo
  cine «t», Pantalla completa «f»).
- Debajo del video: título, canal con «Suscribirme», «Me gusta» con el conteo, «No me gusta», «Compartir»,
  «Guardar en una playlist» y «Más acciones».
- A la derecha: la lista de videos relacionados, cada uno con su título y duración.
- Para dar me gusta o comentar pide entrar («Accede para dar Me gusta…»).

### Orden de la portada (conocido del uso público)

- Una fila de videos y enseguida el estante de Shorts; después, más filas. Los Shorts no quedan al fondo.

## Qué adoptamos en Pantalay (con nuestra marca)

1. Buscador de la red: caja en todas las páginas de Videos, con sugerencias mientras se escribe (teclado: flechas,
   Enter y Escape), que encuentra sin importar tildes ni mayúsculas, por título, creador, descripción y lo que se
   dice en el video (transcripción); resultados en filas con miniatura, título resaltado, vistas, antigüedad,
   creador y el pedazo donde aparece la palabra; filtros «Todo», «Videos», «Shorts» y «Recientes».
2. Shorts arriba: el estante va después de la PRIMERA fila de Videos, y también en la página de cada video, entre
   los relacionados.
3. Google: la página de cada video trae su título, su descripción, su creador y su enlace escritos en el HTML (además
   del `VideoObject` y del mapa de videos), y «Videos» trae los enlaces a los videos para que Google los recorra.

## Pendiente para otra fase (anotado en PENDIENTES)

- Suscribirse a un creador, «No me gusta», guardar en listas, comentarios en la red, historial y «Sin mirar».
