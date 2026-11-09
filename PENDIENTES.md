# Pendientes de PANTALAI

## 👤 Depende de Richard

- 👤 Recuperar sus 2 grabaciones de 5 min del 19 oct: abrir la Biblioteca en la MISMA computadora y navegador y
  tocar «Subir otra vez» en «Grabaciones guardadas en esta computadora».

- 👤 (Opcional) Claves de Cloudflare Turnstile para el escudo anti-robots en entrar y registrarse.

- 👤 Publicar la extensión en la Chrome Web Store: hace falta la cuenta de desarrollador de Chrome de Richard (pago
  único de 5 USD a Google, a su nombre). Con la cuenta: subir `web/public/pantalay-extension.zip` (sale de
  `npm run extension`), capturas de `docs/capturas/extension-*.png` y `reporte-*.png`, y la política de privacidad de
  pantalay.com. Destraba: instalar con un clic, sin modo desarrollador. Mientras tanto, Docs explica cómo cargarla
  descomprimida.

## 👤 Claves de Stripe

- ✅ Claves reales de Stripe recibidas y conectadas (20 oct 2026).
- 👤 Hacer la compra real de un mes (Business + AI, 12 USD) y grabarla en video. Después: volver PAGO_DIAS_PRUEBA a 14,
  decidir encender COBRO_ACTIVO y anunciar la página de precios. Destraba: probar el
  cobro de punta a punta y encender los planes. Plano y enlaces en el chat del 20 oct 2026; estado en docs/VERIFICAR-PAGOS.md.

## 👤 Almacenamiento a 500 GB (decidido por Richard el 20 oct 2026)

- ✅ (24 oct 2026, hecho) Subir el almacenamiento del sitio `pantalai` a 500 GB en la sesión de YaDominios (YaPanel), cobrando lo que cuesta
  en Cloudflare (0,015 USD por GB al mes). Encargo listo en el chat del 20 oct 2026. Cuando esté hecho, aquí: poner la
  variable del sitio `ALMACEN_LIMITE_GB=500` y republicar, para que el superadmin muestre el tope nuevo.

## Hecho por Richard

- ✅ 20 oct 2026: pantalay.com verificado en Google Search Console y sitemap enviado (Correcto, 25 páginas).

## De mi lado

- [x] SEO (9 nov 2026): español con su dirección «/es», hreflang, títulos y descripciones con palabras clave, datos
      estructurados, mapa del sitio con las dos versiones y 4 páginas por búsqueda (C-SEO-IDIOMAS).
- [ ] SEO, siguiente: medir en Search Console en 2 a 4 semanas qué búsquedas traen visitas y escribir más páginas
      para las que asomen. «Pantalla verde» (fondo virtual) no existe en Pantalay: si se quiere posicionar, primero
      hay que construir la función.

- [x] Estudio de reacciones, fase 1 (9 nov 2026): `/studio`, enlace de YouTube con reproductor oficial, ±5 s y
      atajos, creador y título automáticos, máscara «Podcast» neón 16:9, graba solo el escenario (candado
      C-ESTUDIO-RECORTE), guía en Docs en los dos idiomas.
- [x] Estudio: TikTok (enlaces largos y cortos) y selector de posiciones en el escenario 16:9: cámara + video ancho,
      dos horizontales, video vertical (9 nov 2026, pedido de Richard).
- [x] Estudio, fase 2: escenario vertical 9:16 para Shorts, TikTok y Reels (cámara arriba, video abajo) (9 nov 2026).
- [x] Estudio a la vista (9 nov 2026): botón «Reacciones» en el menú, opción en Grabar, tarjeta grande en la portada y
      aviso amable de que TikTok pide la sesión iniciada en el navegador.
- [ ] Estudio, fase 3: personalizar nombre del programa, logo y colores guardados por cuenta; varias máscaras.
- [ ] Estudio, fase 4: cartel «Hablando/Escuchando» con el micrófono, barras de sonido, «Para YouTube» con el
      creador ya puesto.

- [x] Partes de subida iguales (grabaciones largas), vista previa con imagen, burbuja flotante, forma vertical,
      borde de colores, «Grabando» arriba, ruedita de subida, «Subir otra vez» (19 oct 2026, comprobado en vivo).

- [x] Marca pública Pantalay (19 oct 2026), portada con cabeceras de seguridad, guía «Empieza aquí» con
      capturas originales tomadas del sitio publicado con la IA real.

- [x] Presupuesto de 10 USD en Google Cloud puesto por Richard (19 oct 2026).
- [x] Prueba en vivo con IA real en español (C-IA-VIVO) en verde; corregidas las tareas.

- [x] Oído encendido en producción (19 oct 2026): token de Cloudflare «pantalai-whisper» en el sitio; prueba real
      en vivo con voz: transcripción exacta en frases y muletillas «um» y «uh» encontradas.
- [x] Llave de Gemini: ya estaba puesta como secreto GEMINI_API_KEY (19 oct 2026); el canario dice cerebro encendido
      (comprobado el 8 nov 2026).
- [ ] Hay cuentas de prueba «Soporte E2E…» en producción, creadas por las pruebas en vivo. Borrarlas solo si Richard dice.

- [x] Sitio en vivo (19 oct 2026): salud ok, base y almacén ok, variable `SITIO_CONECTADO=1` puesta y grabación
      de punta a punta pasada contra https://pantalai.sitios.dev.
- [x] La portada «/» ya pasa por el programa y lleva las cabeceras de seguridad (comprobado el 21 oct 2026).
- [x] Lápices para dibujar mientras se graba (20 oct 2026, candado C-LAPICES).
- [x] Sonido de la computadora encendido por defecto, sin filtros, con medidores y aviso (20 oct 2026, C-SONIDO-COMPUTADORA).
- [x] Dibujar ENCIMA de cualquier página web sin volver a Pantalay, y énfasis del cursor: extensión de Chrome
      (8 nov 2026, C-EXTENSION).
- [ ] Dibujar encima de programas de escritorio FUERA de Chrome (Excel, Figma de escritorio, la terminal…): necesita
      una app de escritorio (por ejemplo, ventana transparente siempre encima). La extensión no puede.
- [x] Mapa del sitio con todas las guías de Docs y pantalay.com como dirección principal (20 oct 2026, C-DOMINIO).
- [x] Extensión de Chrome con modo «reporte de error» (consola y red) (8 nov 2026, C-REPORTE-ERROR).
- [x] Espacios de equipo: crear, invitar por correo o enlace, unirse, compartir videos (también privados) y salir
      (8 nov 2026, C-EQUIPOS).
- [ ] 👤 Decidir en qué plan van los equipos (hoy, con el cobro apagado, cualquier cuenta crea equipos sin tope).
- [ ] Carpetas compartidas dentro de un equipo (hoy se comparte video por video).
- [ ] Cobro: conectar Stripe (suscripción mensual y anual, prueba de 14 días, precio de fundador), llenar
      `suscripciones`, probar de punta a punta y recién ahí encender `COBRO_ACTIVO=1` y anunciar la página de precios
      (`/pricing`, hoy oculta con noindex). Mensual y anual, prueba de 14 días, aviso firmado y canario: construidos.
      Starter ya limita la miniatura a elección y el botón de acción (8 nov 2026, C-PLANES-EDICION). Falta SOLO la
      compra real de Richard (ver docs/VERIFICAR-PAGOS.md).
- [x] Los cortes del MEDIO (silencios, cortar por texto) ya salen en el MP4 descargado (8 nov 2026, C-RECORTE-MEDIO).
- [x] Superadmin en /admin con usuarios, planes y grabaciones (20 oct 2026, C-SUPERADMIN, uso en docs/SUPERADMIN.md).
- [x] Cobro con Stripe dentro de la página construido (20 oct 2026, C-PAGOS); falta probarlo con las claves.
- [x] Auditoría de lanzamiento (21 oct 2026): una sola suscripción por persona y avisos de Stripe en orden
      (C-PAGOS-UNA-SUSCRIPCION), límites del plan en el servidor (C-LIMITES-SERVIDOR), errores traducidos, borrador
      sin restos, recorrido completo de una persona (C-AUDITORIA).
- [x] Textos legales propios, Mi cuenta (cancelar plan y borrar cuenta) y lectura para Google y las IAs (21 oct 2026,
      C-LEGAL, C-CUENTA, C-SEO-IA).
- [x] Subir un archivo de video desde la computadora (8 nov 2026, C-SUBIR-VIDEO).
- [x] Renombrar carpeta con una ventanita propia (8 nov 2026, C-RENOMBRAR-CARPETA).
- [x] Verificar el correo al registrarse (8 nov 2026, C-VERIFICAR-CORREO): franja, sin pagar sin confirmar y tope de 7 días.
- [ ] Borrar cuenta y volver a registrarse con el mismo correo da otra prueba gratis: decidir si se guarda una huella.
- [x] Recortador acelerado: 20 s de cada punta al instante y tira de fotos que ya no sale negra (23 oct 2026, C-RECORTE-ACELERADO).
- [x] Raíz para quien MIRA: el MP4 grabado (y el subido) queda con el índice al principio, reemplazando el original
      después de comprobar la copia (8 nov 2026, C-INDICE-MP4).
- [x] «Para YouTube»: tres títulos, descripción, palabras clave y hashtags con botones de copiar (23 oct 2026, C-YOUTUBE).
- [ ] Miniatura para YouTube generada desde el video (Richard la hace aparte por ahora).
- [x] Marca de agua gris «Pantalay» en el reproductor para el plan gratis, aunque el cobro siga apagado (23 oct 2026, C-MARCA-AGUA).
- [x] Marca «pantalay.com» grabada dentro de los videos nuevos del plan gratis: sale en el MP4 descargado (24 oct 2026, C-MARCA-GRABADA).
- [ ] Los videos grabados ANTES del 24 oct no la tienen dentro (solo en el reproductor).
- [x] Grabar solo una parte de la pantalla y cámara dentro del video al compartir una pestaña (24 oct 2026, C-AREA, C-CAMARA-EN-PESTANA).
- [x] Short vertical para reacciones: encuadre, cámara arriba o abajo, preparación antes de grabar (24 oct 2026, C-SHORT).
- [x] Almacenamiento a 500 GB (YaDominios, 24 oct 2026) y `ALMACEN_LIMITE_GB=500` puesto.
