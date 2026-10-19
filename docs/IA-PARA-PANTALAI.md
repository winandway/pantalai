# La IA de PANTALAI: cuál usar, qué hace y qué genera

Fecha: 19 de octubre de 2026. Precios leídos hoy en las páginas oficiales (fuentes al final).

## La recomendación, en una línea

**Dos piezas: un «oído» y un «cerebro».**

| Pieza   | Qué es                                                                            | Modelo                 | Dónde corre                          | Precio                                                                                         |
| ------- | --------------------------------------------------------------------------------- | ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Oído    | Convierte la voz del video en texto, palabra por palabra y con su segundo exacto  | Whisper Large v3 Turbo | Cloudflare Workers AI                | Gratis hasta unos 210 minutos de audio por día; después, 3 centavos de dólar por hora de audio |
| Cerebro | Lee ese texto y escribe: título, resumen, capítulos, tareas, documentos, reportes | Gemini 2.5 Flash       | Google (API de Gemini, plan de pago) | 0,30 USD por millón de palabras-pieza que lee y 2,50 USD por millón que escribe                |

Es la misma receta que usa Loom: un modelo que transcribe (Loom usa Whisper y Speechmatics) y un modelo
de lenguaje que escribe sobre esa transcripción (Loom usa GPT y Gemini).

### Por qué estos y no otros

- **Whisper en Cloudflare** es el más barato que existe hoy para transcribir y tiene un regalo diario
  (10 000 «neuronas» al día ≈ 214 minutos de audio). Si se acaba el regalo y no hay plan de pago, **se
  detiene; no cobra de más**. Eso cumple tu regla de cuentas que no generan deuda sorpresa.
  - Groq cobra casi lo mismo (4 centavos la hora), pero sería un proveedor más que administrar.
  - OpenAI cobra unas nueve veces más.
- **Gemini 2.5 Flash** es el modelo de texto que ya tienes aprobado en tus reglas. Escribe bien en
  inglés y en español. Además puede **ver el video**, no solo leer el texto, y eso abre la puerta a los
  «documentos con capturas» y a los «video prompts» de Loom.
  - Si se quiere gastar todavía menos, **Gemini 2.5 Flash-Lite** cuesta un tercio (0,10 / 0,40 USD) y
    alcanza para títulos y resúmenes.
- **En plan de pago, Google no usa tus datos para entrenar** (en el plan gratis sí). Por eso va en el de pago.

### Lo que mejora frente a lo que hay hoy

Hoy PANTALAI transcribe con el reconocimiento de voz del navegador. Eso es gratis, pero tiene límites:

- solo funciona en Chrome y Edge;
- da frases sueltas, sin el segundo de cada palabra;
- no sirve para videos subidos desde otro lado.

Con Whisper, el servidor transcribe cualquier video, en cualquier navegador, con puntuación y con el
segundo exacto de cada palabra. Ese segundo por palabra es lo que permite **quitar las muletillas** y
**editar borrando palabras**.

---

## Qué haría la IA en PANTALAI (todo lo de Loom AI)

| Función                       | Qué ve la persona                                                                    | Pieza que lo hace                                    |
| ----------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Transcripción de calidad      | Texto con puntuación, palabra por palabra, en 99 idiomas                             | Oído                                                 |
| Subtítulos                    | Subtítulos exactos (CC) y en otro idioma si se pide                                  | Oído + Cerebro (traducción)                          |
| Título automático             | «Cómo exportar el reporte de ventas» en lugar de «Grabación sin título»              | Cerebro                                              |
| Resumen                       | Un párrafo debajo del video que dice de qué trata                                    | Cerebro                                              |
| Capítulos                     | 00:00 Introducción · 01:20 Panel · 03:45 Usuarios… en la barra del video             | Cerebro                                              |
| Tareas                        | Lista de pendientes que se mencionaron («Corregir el registro»)                      | Cerebro                                              |
| Quitar muletillas             | Se saltan «eh», «este», «mmm», «o sea»                                               | Oído (segundo por palabra) + Cerebro (decide cuáles) |
| Editar borrando texto         | Borras una frase de la transcripción y se corta del video                            | Oído                                                 |
| Botón automático (CTA)        | Propone el botón según la página que se mostró                                       | Cerebro                                              |
| Documentos a partir del video | Procedimiento paso a paso, guía, descripción de un cambio de código, pasos de prueba | Cerebro                                              |
| Reporte de error              | Pasos para reproducir, qué se esperaba y qué pasó, listo para pegar en un ticket     | Cerebro                                              |
| Buscar y preguntar            | «¿En qué video expliqué la facturación?» → te lleva al minuto                        | Cerebro                                              |
| Mensaje para compartir        | El texto del correo o del WhatsApp que acompaña el enlace                            | Cerebro                                              |

---

## El ejemplo completo: un video de 8 minutos

**La situación.** Una persona del equipo graba 8 minutos explicando cómo dar de alta un cliente en el
panel de una empresa. Habla en español, con algunas pausas y muletillas.

### Paso 1 — Graba (igual que hoy)

Graba pantalla y cámara. El video se sube por partes mientras habla. Al tocar «Terminar», el enlace ya
está copiado. **Hasta aquí no interviene ninguna IA.**

### Paso 2 — El oído escucha (unos 10 segundos)

El servidor manda el audio del video a Whisper en Cloudflare. Whisper devuelve cada palabra con su segundo:

```
00:00.4  "Hola"          00:00.8  "equipo,"       00:01.1  "eh,"
00:01.6  "hoy"           00:01.9  "les"           00:02.0  "muestro"
00:02.4  "cómo"          00:02.7  "dar"           00:02.9  "de"
00:03.0  "alta"          00:03.3  "un"            00:03.4  "cliente…"
… (unas 1 100 palabras en total)
```

Con eso PANTALAI arma la transcripción con puntuación y los subtítulos exactos. Al momento ya se puede
buscar dentro del video.

**Costo:** 8 minutos × 0,0005 USD = **0,004 USD** (y gratis si cae dentro del regalo diario).

### Paso 3 — El cerebro lee y escribe (unos 5 segundos)

PANTALAI le manda a Gemini la transcripción completa con una instrucción fija, más o menos así:

> «Este es el texto de un video con el segundo de cada frase. Devuelve en JSON: un título de 8 palabras
> como máximo, un resumen de 3 frases, capítulos con su segundo, las tareas que se mencionaron y la lista
> de muletillas con su segundo. Responde en el idioma del video. No inventes nada que no se haya dicho.»

Gemini contesta algo así, y PANTALAI lo coloca solo en cada lugar de la página:

```json
{
  "titulo": "Cómo dar de alta un cliente en el panel",
  "resumen": "Se muestra el alta de un cliente nuevo desde el panel: datos de contacto, condiciones de pago y asignación de vendedor. Se explica qué campos son obligatorios y cómo corregir un cliente duplicado. Al final se revisa que el cliente aparezca en la lista.",
  "capitulos": [
    { "segundo": 0, "titulo": "Introducción" },
    { "segundo": 42, "titulo": "Abrir el formulario de clientes" },
    { "segundo": 135, "titulo": "Datos de contacto y obligatorios" },
    { "segundo": 260, "titulo": "Condiciones de pago" },
    { "segundo": 370, "titulo": "Clientes duplicados" },
    { "segundo": 440, "titulo": "Comprobar en la lista" }
  ],
  "tareas": [
    "Revisar por qué el campo de teléfono no acepta el código de país",
    "Agregar una nota en el formulario sobre clientes duplicados"
  ],
  "muletillas": [{ "inicio": 1.1, "fin": 1.4, "palabra": "eh" }, "… 23 más"]
}
```

**Lo que ve la persona en su página del video, sin haber escrito nada:**

- El título cambia de «Grabación sin título» a **«Cómo dar de alta un cliente en el panel»**.
- Debajo del video aparece el **resumen**.
- La barra del video se parte en **6 capítulos** con su nombre.
- En el editor aparece **«Quitar 24 muletillas (ahorra 19 segundos)»**: un toque y se saltan.
- En la pestaña Actividad aparecen las **2 tareas**, listas para copiar.

**Costo:** unas 2 500 piezas de entrada y 800 de salida ≈ **0,003 USD**.

### Paso 4 — Botón «Generar» (cuando la persona lo pide)

Como en Loom, en el video hay un botón **Generar** con plantillas. Ejemplo con «Procedimiento paso a paso»:

> **Cómo dar de alta un cliente**
>
> 1. Abre Clientes y toca «Nuevo cliente» (minuto 0:42).
> 2. Escribe nombre, correo y teléfono; los tres son obligatorios (2:15).
> 3. Elige las condiciones de pago: contado o crédito a 30 días (4:20).
> 4. Si el sistema avisa que el cliente ya existe, abre el existente en lugar de crear otro (6:10).
> 5. Guarda y comprueba que aparece en la lista (7:20).

Cada paso lleva el enlace a su minuto. Con Gemini viendo el video, además lleva **la captura de esa
pantalla**. Las otras plantillas son: guía para clientes, reporte de error, descripción de un cambio de
código, pasos de prueba y mensaje para compartir.

**Costo:** entre 0,002 y 0,01 USD por documento (más si incluye capturas).

### El total del ejemplo

| Qué                                             | Costo                                         |
| ----------------------------------------------- | --------------------------------------------- |
| Transcribir 8 minutos                           | 0,004 USD (o gratis dentro del regalo diario) |
| Título, resumen, capítulos, tareas y muletillas | 0,003 USD                                     |
| Un documento con «Generar»                      | 0,01 USD                                      |
| **Total por video**                             | **menos de 2 centavos de dólar**              |

Con **100 videos al mes**, la cuenta queda en **1 a 2 USD al mes**. Loom cobra 24 USD por persona al mes
por su plan con IA.

---

## Cómo se arma por dentro

1. Al terminar de subir un video, el servidor de PANTALAI lo pone en la fila de «procesar».
2. Le manda el audio a Cloudflare Whisper y guarda la transcripción palabra por palabra.
3. Le manda el texto a Gemini con la instrucción fija y guarda lo que vuelve.
4. La página del video muestra «Generando resumen…» y se completa sola al terminar.
5. Si algo falla, el video sigue funcionando igual, sin resumen, y queda el botón «Intentar otra vez».
   **Nunca se pierde el video por culpa de la IA.**

## Los candados de gasto (van en el código, no en un papel)

- **Lista cerrada de modelos permitidos:** Whisper Turbo y Gemini 2.5 Flash o Flash-Lite. Cualquier otro
  modelo queda bloqueado en el código, también como respaldo.
- **Tope diario de minutos** que se mandan a transcribir y **tope diario de llamadas** a Gemini. Si se
  llega al tope, se avisa y se espera al día siguiente; nunca sigue gastando.
- Videos de más de 2 horas no se procesan automáticamente; solo si la persona lo pide.
- En la estadística del panel se ve cuánto se gastó en el mes.
- El proveedor y su cuenta se anotan en el registro privado de cuentas, como pide tu regla.

## Lo que necesito de ti (solo esto)

1. **¿En qué cuenta de Cloudflare va el oído?** La de Windoce que ya usas para otros proyectos sirve.
   Desde ahí se crea una llave de Workers AI. Te paso el plano de la pantalla, casilla por casilla.
2. **Una llave de la API de Gemini en plan de pago**, con un **tope de presupuesto mensual**. Mi
   recomendación es 10 USD: alcanza para miles de videos.
3. El correo de cada cuenta y los últimos cuatro números de la tarjeta, para el registro privado de
   proveedores.

Con eso lo construyo, lo pruebo en vivo con un video real y lo dejo en Docs, en los dos idiomas.

---

## Fuentes

- Precios de Cloudflare Workers AI (Whisper Large v3 Turbo a 0,0005 USD por minuto, regalo diario de
  10 000 neuronas, modelos de texto): https://developers.cloudflare.com/workers-ai/platform/pricing/
- Precios de la API de Gemini (2.5 Flash, 2.5 Flash-Lite y datos del plan gratis): https://ai.google.dev/gemini-api/docs/pricing
- Whisper Large v3 Turbo en Groq (0,04 USD por hora): https://console.groq.com/docs/model/whisper-large-v3-turbo
- Comparación con OpenAI Whisper (0,36 USD por hora): https://www.morphllm.com/groq-pricing
- Qué IA usa Loom y qué funciones tiene: el informe que pegaste el 18 de octubre (documentación oficial
  de Loom y Atlassian).
