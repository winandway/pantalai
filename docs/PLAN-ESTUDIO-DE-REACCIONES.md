# Plan: Estudio de reacciones con máscara (9 nov 2026)

> Pedido de Richard: pegar el enlace de un video (YouTube, Shorts, TikTok…), reproducirlo dentro de Pantalay sin
> descargarlo, pausarlo y adelantarlo, y grabar la reacción con una «máscara» bonita estilo podcast (como la de los
> videos de entrevistas a IAs de Esenia): su cámara con su nombre, el video con el nombre del creador, el tema del día,
> y NADA del resto de la pantalla (ni barra del navegador, ni Dock, ni logos sueltos de otras redes).

## 1. ¿Existe ya un programa así?

**No existe uno que haga todo junto.** Lo que hay:

| Programa                        | Qué hace                                                   | Qué le falta                                                                                        |
| ------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Kapwing, VEED, Clipchamp        | Pegas el enlace o subes el video y grabas tu cámara encima | Es un editor: baja el video a sus servidores, la reacción no es en vivo y no hay máscara de podcast |
| Reaction Studio (iPhone)        | Pegas un enlace y grabas tu cara en una esquina            | Solo celular, sin máscara, sin nombres                                                              |
| StreamYard, Riverside, Restream | Tienen máscaras y nombres (overlays) muy bonitos           | Para reaccionar hay que compartir pantalla: vuelve a salir todo lo que no quieres                   |
| OBS                             | Puede hacerlo todo                                         | Hay que instalarlo y armar la escena a mano: no es para el público general                          |

Conclusión: **hay que hacerlo**. Y es una buena noticia: es una función que nadie da de forma sencilla, y encaja justo con
lo que Pantalay ya tiene (grabar en el navegador, el Short vertical, la marca de agua y «Para YouTube»).
No hace falta ingeniería inversa de nadie: las piezas son abiertas y oficiales (ver punto 3).

## 2. Cómo quedarían los videos

Dos formatos, la misma máscara:

- **Horizontal 16:9 (YouTube):** arriba el logo y el nombre del programa; al centro dos tarjetas con borde de color:
  a la izquierda la cámara de Richard con su cartel («Richard · Anfitrión»), a la derecha el video pegado con el cartel
  del creador («@creador · Reaccionando», sale solo del enlace); abajo la franja «Tema de hoy» con el título.
- **Vertical 9:16 (Shorts, TikTok, Reels):** el mismo diseño apilado: la cámara arriba, el video abajo, el tema al pie.
- La marca «pantalay.com» va sobre la cámara (plan gratis o si está encendida en Configuración).
- **Los botones (pegar enlace, play, pausa, ±5 s, cambiar máscara, grabar) quedan FUERA de lo que se graba.**
  Lo que se graba es solo el «escenario» de la máscara.

## 3. Cómo se hace por dentro (sin descargar nada)

1. **El video se reproduce con el reproductor oficial** de cada red, metido en la página: YouTube (reproductor
   insertado con su API: play, pausa, adelantar, sin videos sugeridos al final) y TikTok (su reproductor oficial
   «player v1», que deja ocultar controles y saltar a un segundo). Más adelante: Instagram, Facebook, X y archivos MP4.
2. **Se graba la propia pestaña recortada al escenario.** Chrome tiene una función oficial («Region Capture», desde la
   versión 104) que graba la pestaña actual pero SOLO el rectángulo de un elemento: exactamente la máscara. Así sale el
   video de YouTube o TikTok (porque se graba lo que se ve), la cámara y los carteles, y no sale nada más.
3. **El sonido:** el del video (sonido de la pestaña) y el micrófono de Richard, mezclados con el mismo mezclador que
   ya usa Pantalay (barras de nivel incluidas).
4. **El nombre del creador y el título** salen solos del enlace con el servicio público de cada red (oEmbed): sin
   claves y sin costo.
5. **Las máscaras son código nuestro** (diseño en la página, no imágenes de otro programa). La primera se calca de la
   de Esenia: Richard autorizó pedírsela a esa sesión para copiar colores, letras y proporciones.
6. **Funciona en Chrome y Edge de computadora** (Region Capture no existe todavía en Safari ni Firefox). En esos
   navegadores se avisa claro y se ofrece la grabación normal.

## 4. Fases

| Fase                     | Qué queda                                                                                                                                                                                                                   | Cómo se prueba                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Estudio básico        | Página «Estudio de reacciones»: pegar enlace de YouTube, reproductor con play, pausa y ±5 s, máscara «Podcast» horizontal, nombre del creador automático, grabar solo el escenario con cámara, micrófono y sonido del video | Prueba automática que graba con un video de prueba y comprueba que el archivo mide lo del escenario y que la barra del navegador no sale |
| 2. Vertical y TikTok     | Máscara 9:16 para Shorts, reproductor de TikTok, elegir dónde va la cámara                                                                                                                                                  | Igual, en vertical                                                                                                                       |
| 3. Personalizar          | Nombre del programa, logo, colores, cartel del anfitrión, tema; se guardan por cuenta (con borrador, como todos los formularios) y varias máscaras para elegir (podcast, noticiero, minimal)                                | Prueba de que se guarda y se recupera                                                                                                    |
| 4. Detalles que enamoran | Cartel «Hablando/Escuchando» que se enciende con el micrófono, barras de sonido que se mueven con la voz, «Para YouTube» con el título y el creador ya puestos                                                              | Revisión en pantalla                                                                                                                     |

Cada fase se publica al terminarla, con su guía en Docs en los dos idiomas y su candado.

## 5. Riesgos dichos de frente

- **Reglas de YouTube y TikTok:** el reproductor oficial está permitido; grabar la pantalla mientras suena es lo mismo que
  ya hace cualquier grabador (Loom, OBS). Lo que sí es responsabilidad de quien sube el video: que la reacción aporte
  comentario propio (uso justo) y respetar los derechos del creador. Pantalay lo dirá en la guía y en los términos.
- **Algunos videos no dejan insertarse** (el dueño lo desactivó, o tienen restricción de edad). En esos casos se avisa
  «este video no se puede reproducir fuera de YouTube» y se ofrece compartir la pestaña con el área marcada, que ya existe.
- **TikTok siempre muestra su botón central y su columna de iconos** en el reproductor oficial. La máscara puede
  recortar los bordes del video para que se note menos, pero no se puede ocultar del todo sin romper sus reglas.
- **Solo Chrome y Edge de computadora** para esta función, por ahora.

## 6. Lo que hace falta de Richard

Nada para empezar. La máscara de Esenia se pide a esa sesión (autorizado por Richard el 9 nov 2026).
