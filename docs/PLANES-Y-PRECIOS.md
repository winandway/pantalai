# Planes y precios de Pantalay (propuesta) — comparados con Loom

> Hecho el 20 de octubre de 2026. Fuente: la página pública de precios de Loom, observada con REA **como
> visitante** (sin descompilar nada). Evidencias REA: `ev_14bf107ec231bf208e6d76378d1e872ade4b42710ef9ec7e370375e3d67566ea`
> (texto y tabla completa) y `ev_14d56c90325d61dd9e573bf91f6be3d2cccf4fb20f04e105f59bbf083d102b2d` (captura,
> guardada en `docs/investigacion-rea/loom-precios.png`).
>
> **Aprobado por Richard el 20 de octubre de 2026**, con el plan gratis igual al de Loom: 25 videos y 5 minutos por
> grabación (no 50 y 10). Construido en `servidor/planes.ts` y en la página `/pricing`, apagado hasta tener el cobro.

---

## 1. Cómo arma Loom su página de precios

**Arriba:** «Choose the plan that fits your needs.» Dos controles: **tamaño del equipo** (número de usuarios) y
**cobro mensual o anual**, con la etiqueta «SAVE UP TO 17%» en el anual.

**Cuatro tarjetas, de izquierda a derecha.** Cada una tiene: nombre, una frase de para qué sirve, precio, botón, y
una lista corta de «lo que suma» encima del plan anterior («Everything in Starter, and…»). La tercera lleva la
etiqueta **«MOST POPULAR»** y un borde de color.

|                | **Starter**                                                                                                             | **Business**                                                                                                            | **Business + AI** ⭐                                                                                                                                                        | **Enterprise**                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Frase          | Get started with video communication                                                                                    | Move work forward faster with unlimited videos and basic editing                                                        | Communicate your best with videos instantly enhanced and edited with Loom AI                                                                                                | Control and securely manage your video content for the entire organization                                                                     |
| Precio mensual | 0 USD                                                                                                                   | **18 USD** por usuario al mes                                                                                           | **24 USD** por usuario al mes                                                                                                                                               | «Let's Talk»                                                                                                                                   |
| Precio anual   | 0 USD                                                                                                                   | **15 USD** por usuario al mes (180 al año)                                                                              | **20 USD** por usuario al mes (240 al año)                                                                                                                                  | a medida                                                                                                                                       |
| Botón          | Sign up                                                                                                                 | Try for free                                                                                                            | Try for free                                                                                                                                                                | Contact Sales                                                                                                                                  |
| Lo que suma    | 25 videos · grabaciones de 5 minutos · reuniones sin límite · transcripción en más de 50 idiomas · comentarios y emojis | videos ilimitados · tiempo de grabación ilimitado · edición básica · quitar la marca de Loom · subir y descargar videos | mejora automática del video · grabar para agentes · edición avanzada · video a texto · resumen de reuniones por correo · notas de reuniones · estadísticas de administrador | seguridad avanzada (SSO, SCIM) · Salesforce · 99,95 % de disponibilidad garantizada · cumplimiento EBA · estadísticas de usuarios descargables |

(El anual de 100 usuarios en Business sale 18.000 USD al año: 15 por usuario al mes. Se comprobó cambiando el
control en la página.)

**Debajo de las tarjetas:** un bloque «Loom AI» con lo que hace la IA, la **tabla comparativa completa** (sección 3),
y unas preguntas frecuentes: prueba gratis de los planes pagos, formas de pago, qué es un espacio de trabajo,
reembolsos al quitar miembros, uso de los datos, plan con descuento para educación y cómo funcionan las capturas.

---

## 2. Nuestra propuesta: los mismos cuatro planes, 50 % de descuento de por vida

La idea: **misma organización, mismos nombres de plan, mismas filas**, para que quien viene de Loom compare de un
vistazo. El precio de lista es el de Loom, tachado, y al lado el **«Precio de fundador»**: la mitad, **para siempre**,
para quien se suscriba durante la promoción de lanzamiento.

|                                                    | **Starter** | **Business**                    | **Business + AI** ⭐           | **Enterprise** |
| -------------------------------------------------- | ----------- | ------------------------------- | ------------------------------ | -------------- |
| Precio de lista mensual                            | 0 USD       | ~~18 USD~~                      | ~~24 USD~~                     | Hablemos       |
| **Precio de fundador mensual (−50 % de por vida)** | **0 USD**   | **9 USD** por usuario al mes    | **12 USD** por usuario al mes  | a medida       |
| Precio de lista anual                              | 0 USD       | ~~15 USD~~ al mes               | ~~20 USD~~ al mes              |                |
| **Precio de fundador anual**                       | **0 USD**   | **7,50 USD** al mes (90 al año) | **10 USD** al mes (120 al año) |                |

**Plan gratis (decidido por Richard):** igual al de Loom, 25 videos y 5 minutos por grabación.

**Qué es la promoción, en palabras para la página:**
«Founder pricing: 50% off for life. Subscribe during our launch and keep half price forever, as long as your plan
stays active.» — «Precio de fundador: 50 % de descuento de por vida. Suscríbete durante el lanzamiento y paga la
mitad para siempre, mientras tu plan siga activo.»

Recomiendo ponerle **fecha o cupo** (por ejemplo, los primeros 1.000 clientes o hasta el 31 de enero de 2027): sin
límite, «promoción» deja de significar algo.

---

## 3. Tabla completa: fila por fila, Loom contra lo que Pantalay da HOY

Las filas son las de Loom, en su mismo orden. Las cuatro columnas del medio dicen en qué plan lo da Loom. La última
dice si Pantalay ya lo tiene:

- ✅ ya lo tenemos y funciona en vivo
- 🟡 lo tenemos a medias
- ❌ no lo tenemos todavía

S = Starter · B = Business · B+IA = Business + AI · E = Enterprise

### Miembros y videos

| Función                       | S          | B          | B+IA       | E          | Pantalay hoy                                 |
| ----------------------------- | ---------- | ---------- | ---------- | ---------- | -------------------------------------------- |
| Miembros del espacio          | hasta 50   | ilimitados | ilimitados | ilimitados | ❌ cada cuenta es individual; faltan equipos |
| Grabaciones por persona       | 25         | ilimitadas | ilimitadas | ilimitadas | ✅ ilimitadas                                |
| Largo de grabación            | 5 min      | ilimitado  | ilimitado  | ilimitado  | ✅ sin límite                                |
| Capturas de pantalla (imagen) | ilimitadas | ilimitadas | ilimitadas | ilimitadas | ❌                                           |
| Grabar reuniones              | ilimitado  | ilimitado  | ilimitado  | ilimitado  | ❌                                           |

### IA

| Función                                      | S   | B   | B+IA | E   | Pantalay hoy                       |
| -------------------------------------------- | --- | --- | ---- | --- | ---------------------------------- |
| Títulos automáticos                          | ✓   | ✓   | ✓    | ✓   | ✅                                 |
| Botón de acción automático                   |     | ✓   | ✓    | ✓   | 🟡 el botón existe, se pone a mano |
| Notas y resúmenes de reuniones               |     |     | ✓    | ✓   | ❌ (no grabamos reuniones)         |
| Flujos de IA (documentos a partir del video) |     |     | ✓    | ✓   | ✅ «Generar documentos»            |
| Resúmenes automáticos                        |     |     | ✓    | ✓   | ✅                                 |
| Capítulos automáticos                        |     |     | ✓    | ✓   | ✅                                 |
| Quitar muletillas («eh», «este»)             |     |     | ✓    | ✓   | ✅                                 |
| Quitar silencios                             |     |     | ✓    | ✓   | ✅                                 |
| Grabar para agentes de IA                    |     |     | ✓    | ✓   | ❌                                 |

### Espacio de equipo

| Función               | S   | B   | B+IA | E   | Pantalay hoy                        |
| --------------------- | --- | --- | ---- | --- | ----------------------------------- |
| Biblioteca personal   | ✓   | ✓   | ✓    | ✓   | ✅ con carpetas, búsqueda y archivo |
| Biblioteca compartida | ✓   | ✓   | ✓    | ✓   | ❌                                  |
| Biblioteca del equipo | ✓   | ✓   | ✓    | ✓   | ❌                                  |

### Grabación

| Función                                | S          | B        | B+IA     | E        | Pantalay hoy                                     |
| -------------------------------------- | ---------- | -------- | -------- | -------- | ------------------------------------------------ |
| Calidad                                | hasta 720p | hasta 4K | hasta 4K | hasta 4K | ✅ hasta 4K                                      |
| Pantalla + burbuja de cámara           | ✓          | ✓        | ✓        | ✓        | ✅ burbuja flotante, tres formas, borde animado  |
| Sonido de la computadora               | ✓          | ✓        | ✓        | ✓        | ✅ (desde hoy)                                   |
| Transcripción y subtítulos             | ✓          | ✓        | ✓        | ✓        | ✅ en vivo y con IA                              |
| Lienzo de grabación y marcos de cámara | ✓          | ✓        | ✓        | ✓        | 🟡 formas y borde de colores                     |
| Fondos virtuales                       | ✓          | ✓        | ✓        | ✓        | ❌                                               |
| Quitar ruido de fondo                  | ✓          | ✓        | ✓        | ✓        | ✅ en el micrófono                               |
| Notas del presentador                  | ✓          | ✓        | ✓        | ✓        | ❌                                               |
| Medidas de grabación a elección        |            | ✓        | ✓        | ✓        | 🟡 burbuja vertical; la pantalla no              |
| No molestar                            |            | ✓        | ✓        | ✓        | ❌                                               |
| Lápiz de dibujo y resaltar el cursor   |            | ✓        | ✓        | ✓        | 🟡 lápices sí (desde hoy); resaltar el cursor no |
| Difuminar partes de la pantalla        |            |          |          |          | ❌ (Loom tampoco lo marca en ninguno)            |

### Edición

| Función                          | S   | B   | B+IA | E   | Pantalay hoy                     |
| -------------------------------- | --- | --- | ---- | --- | -------------------------------- |
| Miniatura animada (GIF)          | ✓   | ✓   | ✓    | ✓   | ❌ (miniatura fija sí)           |
| Recortar y unir videos           |     | ✓   | ✓    | ✓   | 🟡 recortar y cortar sí; unir no |
| Fondos                           |     | ✓   | ✓    | ✓   | ❌                               |
| Rebobinar en vivo                |     | ✓   | ✓    | ✓   | 🟡 «Reiniciar» empieza de cero   |
| Miniatura a elección             |     | ✓   | ✓    | ✓   | ✅                               |
| Enlaces dentro del video         |     | ✓   | ✓    | ✓   | ✅ botón de acción               |
| Subtítulos con estilo            |     | ✓   | ✓    | ✓   | ❌                               |
| Editar cortando el texto         |     |     | ✓    | ✓   | ✅                               |
| Textos, cuadros y flechas encima |     |     | ✓    | ✓   | ✅                               |

### Marca propia

| Función                                      | S   | B   | B+IA | E   | Pantalay hoy                                                                                 |
| -------------------------------------------- | --- | --- | ---- | --- | -------------------------------------------------------------------------------------------- |
| Quitar la marca en la página del video       |     | ✓   | ✓    | ✓   | ❌ hay que construir la marca «Hecho con Pantalay» en el plan gratis y quitarla en los pagos |
| Quitar la marca en el reproductor incrustado |     | ✓   | ✓    | ✓   | ❌ igual                                                                                     |
| Tu logo en la página del video               |     | ✓   | ✓    | ✓   | ❌                                                                                           |
| Colores del reproductor a elección           |     | ✓   | ✓    | ✓   | ❌                                                                                           |

### Organización de los videos

| Función                           | S   | B   | B+IA | E   | Pantalay hoy |
| --------------------------------- | --- | --- | ---- | --- | ------------ |
| Archivar                          | ✓   | ✓   | ✓    | ✓   | ✅           |
| Carpetas                          | ✓   | ✓   | ✓    | ✓   | ✅           |
| Buscar                            |     | ✓   | ✓    | ✓   | ✅           |
| Subir videos desde la computadora |     | ✓   | ✓    | ✓   | ❌           |
| Espacios                          | ✓   | ✓   | ✓    | ✓   | ❌           |
| Pedir el correo para ver          |     | ✓   | ✓    | ✓   | ❌           |

### Estadísticas

| Función                        | S   | B   | B+IA | E   | Pantalay hoy |
| ------------------------------ | --- | --- | ---- | --- | ------------ |
| Quién lo vio                   | ✓   | ✓   | ✓    | ✓   | ✅           |
| Cuánto lo vieron               |     | ✓   | ✓    | ✓   | ✅           |
| Exportar las estadísticas      |     | ✓   | ✓    | ✓   | ❌           |
| Estadísticas del administrador |     |     | ✓    | ✓   | ❌           |

### Interacción

| Función              | S   | B   | B+IA | E   | Pantalay hoy |
| -------------------- | --- | --- | ---- | --- | ------------ |
| Reacciones con emoji | ✓   | ✓   | ✓    | ✓   | ✅           |
| Comentarios          | ✓   | ✓   | ✓    | ✓   | ✅           |
| Transcripción        | ✓   | ✓   | ✓    | ✓   | ✅           |
| Subtítulos           | ✓   | ✓   | ✓    | ✓   | ✅           |
| Ver más tarde        | ✓   | ✓   | ✓    | ✓   | ❌           |

### Seguridad y privacidad

| Función                                        | S   | B   | B+IA | E   | Pantalay hoy |
| ---------------------------------------------- | --- | --- | ---- | --- | ------------ |
| Video privado o con enlace                     | ✓   | ✓   | ✓    | ✓   | ✅           |
| Video con contraseña                           |     | ✓   | ✓    | ✓   | ❌           |
| Privacidad por defecto del equipo              |     | ✓   | ✓    | ✓   | ❌           |
| Entrar con la cuenta de la empresa (SSO, SCIM) |     |     |      | ✓   | ❌           |
| Registro de actividad                          |     | ✓   | ✓    | ✓   | ❌           |
| Privacidad avanzada                            |     |     | ✓    | ✓   | ❌           |

### Administración

| Función                                     | S   | B   | B+IA | E   | Pantalay hoy |
| ------------------------------------------- | --- | --- | ---- | --- | ------------ |
| Pasar la cuenta y los videos a otra persona |     |     |      | ✓   | ❌           |
| Roles de usuario                            | ✓   | ✓   | ✓    | ✓   | ❌           |
| Cuánto tiempo se guardan los videos         |     |     | ✓    | ✓   | ❌           |
| No dejar descargar                          |     |     | ✓    | ✓   | ❌           |

### Soporte e integraciones

| Función                                                     | S   | B   | B+IA | E   | Pantalay hoy                                                  |
| ----------------------------------------------------------- | --- | --- | ---- | --- | ------------------------------------------------------------- |
| Soporte                                                     |     | ✓   | ✓    | ✓   | ✅ Docs en dos idiomas                                        |
| Slack, Jira, Confluence, GitHub, Gmail, Notion, Figma y más | ✓   | ✓   | ✓    | ✓   | 🟡 se puede incrustar con código; sin vista previa automática |
| Salesforce, importar de Zoom                                |     |     |      | ✓   | ❌                                                            |

### Lo que Pantalay da y Loom NO marca en su tabla

- **Copia MP4 de cada video**, lista para el iPhone, Final Cut y YouTube.
- **Todo en inglés y español**, incluida la ayuda.
- **Nunca se pierde una grabación**: se guarda en la computadora mientras se sube y se puede volver a subir.
- **Sin instalar nada**: todo funciona en el navegador.

---

## 4. Qué entra en cada plan nuestro (lo que se pondría en las tarjetas)

**Starter — 0 USD.** «Empieza a comunicarte con video.»
25 videos · 5 minutos por grabación · hasta 720p · pantalla y cámara · sonido de la computadora · transcripción
en vivo · comentarios y emojis · títulos automáticos · copia MP4 · marca «Hecho con Pantalay».

**Business — 9 USD con el precio de fundador (lista 18).** «Videos sin límite y edición para avanzar más rápido.»
Todo lo de Starter, y: videos ilimitados · grabaciones sin límite de tiempo · 4K · lápices para dibujar · recortar y
cortar · miniatura a elección · botón de acción · sin la marca de Pantalay · descargar.

**Business + AI — 12 USD con el precio de fundador (lista 24). EL MÁS POPULAR.** «Tus videos mejorados y editados
solos con IA.»
Todo lo de Business, y: resúmenes y capítulos automáticos · quitar muletillas y silencios · editar cortando el texto ·
textos, cuadros y flechas · generar documentos a partir del video.

**Enterprise — Hablemos.** «Control y seguridad para toda la empresa.»
Todo lo de Business + AI, y: equipos y roles · entrar con la cuenta de la empresa · registro de actividad · soporte
prioritario.

**Prueba gratis de 14 días** de Business y Business + AI, como Loom.

---

## 5. ¿Nos da la cuenta? Costo por cliente

Lo que cuesta un usuario de Business + AI que graba **una hora al mes** (cálculo nuestro, con precios de los
proveedores ya aprobados):

- Transcripción con Whisper en Cloudflare: unos **3 centavos** por hora.
- Gemini 2.5 Flash (título, resumen, capítulos, documentos): **1 o 2 centavos**.
- Guardar los videos (unos 2 GB por hora en 1080p): **3 centavos al mes**, que se van sumando mes a mes.

Total: **menos de 10 centavos** el primer mes contra 12 USD cobrados. El costo que crece es el del almacenamiento de
los videos viejos; con precios de 7,50 a 12 USD queda mucho margen, aunque alguien acumule cientos de horas.

---

## 6. 🔴 Lo que hay que saber ANTES de publicar precios

1. **Hoy Pantalay NO cobra.** No hay pasarela de pago, ni planes, ni límites en el código. Publicar esta página sin
   eso sería anunciar algo que no se puede comprar. **El circuito de pagos no está construido ni probado**: no se
   anuncia ni se mandan clientes hasta probarlo de punta a punta (regla de pagos).
2. **El tope de IA de 10 USD al mes** es para las pruebas. Con clientes de Business + AI hay que subirlo, y eso es
   decisión de Richard, con el costo por escrito (candado C-IA-GASTO).
3. **Hoy todo es gratis y sin límite.** Al poner los límites del plan gratis (25 videos, 5 minutos), las cuentas que
   ya existen tienen que conservar sus videos. Recomiendo que las cuentas creadas antes del lanzamiento queden como
   fundadoras.
4. **Lo que Loom tiene en Starter y nosotros no** (equipos, bibliotecas compartidas, capturas, grabar reuniones):
   en nuestra página esas filas se muestran como «Próximamente», nunca con una marca de incluido.

---

## 7. Lo que falta construir para poder vender

| Trabajo                                                                                                     | Para qué                          |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Límites por plan en el código (videos, minutos, 4K, IA, marca)                                              | Que el plan gratis empuje a pagar |
| Marca «Hecho con Pantalay» en el gratis y quitarla en los pagos                                             | Crecer con cada video compartido  |
| Pasarela de pago (Stripe), suscripciones mensual y anual, prueba de 14 días, con su prueba de punta a punta | Cobrar                            |
| Página de precios bilingüe con el precio de fundador                                                        | Que la gente vea y elija un plan  |
| Equipos: miembros, biblioteca compartida, roles                                                             | Poder vender Business a empresas  |

Va en ese orden. Todo lo que ya está en la columna ✅ sigue funcionando igual.
