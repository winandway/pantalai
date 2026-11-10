# Ficha — Botón «Karaoke» en el Estudio de reacciones de Pantalay

Fecha: 9 nov 2026. Puesto: Investigador. Proyecto: PANTALAI (marca pública Pantalay).
No se tocó código del producto. Esta ficha solo investiga y propone.

## 0. Cómo se hizo y qué tan firme es (leer primero)

- **No se usó REA.** Los datos salen de búsqueda web y lectura de páginas públicas (guías de mezcla, documentación
  de MDN, manuales de mezcladores de karaoke, código abierto con licencia). No se descompiló ni se capturó tráfico de
  Smule, StarMaker, BandLab, WeSing ni TikTok.
- **Lo que NO se pudo averiguar [NV]:** los valores internos exactos de Smule, StarMaker, BandLab, WeSing y del efecto
  de canto de los lives de TikTok. No están publicados y averiguarlos exige descompilar, que está prohibido. Lo único
  público es que Smule usa reverb por convolución con respuestas de una sala real y da dos controles (cantidad de
  reverb y tamaño de sala). De StarMaker solo consta que ofrece reverb, eco y corrección de afinación.
- **Por eso los números de la cadena (sección 3) son nuestros [INF]:** salen de cruzar las guías de mezcla de voz y los
  manuales de mezcladores de karaoke, y quedan como punto de partida para afinar de oído. No se presentan como «los de
  Smule». Las pruebas de aceptación (sección 6) existen justamente para validar el sonido con una escucha.
- Etiquetas: [DOC] documentación o guía pública leída · [OBS] observado en una página pública · [INF] inferencia o
  decisión nuestra · [NV] no se pudo verificar.

## 1. Lo observado, con su fuente

### 1.1 Cadena de voz (orden y valores de guías de mezcla)

| Dato                                                                                                                                                                                                                 | Fuente                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orden de la cadena: EQ, compresor, de-esser, reverb, delay, toques finales. [DOC]                                                                                                                                    | Audient, «Crafting a Basic Vocal Chain» — https://audient.com/tutorial/crafting-a-basic-vocal-chain-a-step-by-step-tutorial/                                                                    |
| Pasa-altos desde 80 a 100 Hz; recorte de «barro» entre 200 y 500 Hz; presencia entre 1 y 4 kHz; aire con un toque suave entre 10 y 15 kHz (sin dB en la página). [DOC]                                               | Audient (misma)                                                                                                                                                                                 |
| Compresor 3:1 a 4:1, ataque rápido, release medio, hasta 5 dB de reducción en lo más fuerte. [DOC]                                                                                                                   | Audient (misma)                                                                                                                                                                                 |
| De-esser entre 5 y 10 kHz, unos 6 dB en las «s» más fuertes, release rápido. [DOC]                                                                                                                                   | Audient (misma)                                                                                                                                                                                 |
| Reverb de placa de 1,8 s, pre-delay de 10 a 20 ms; delay con mezcla «bastante baja». [DOC]                                                                                                                           | Audient (misma)                                                                                                                                                                                 |
| Pasa-altos de 70 a 90 Hz en voces graves y 90 a 110 Hz en agudas; placa corta de 1 a 1,5 s con pre-delay de 20 a 40 ms y mezcla baja; compresor lento 2,5:1, ataque 25 ms, release 180 ms (ejemplo cantautor). [DOC] | Resultados de búsqueda sobre guías de Splice, Soundfly y bchillmix, p. ej. https://splice.com/blog/what-is-a-vocal-chain/ (las cifras vienen del resumen del buscador, no se abrió cada página) |
| Pre-delay muy corto «lava» el ataque de las palabras; muy largo suena antinatural. [DOC]                                                                                                                             | Sage Audio, «Top 10 Vocal Reverb Tips» — https://sageaudio.com/articles/top-10-vocal-reverb-tips                                                                                                |
| Filtrar los retornos de reverb y delay alrededor de 300 Hz. [DOC, sin página única confirmada]                                                                                                                       | Resumen de búsqueda de guías de mezcla (Splice/Audient/otras); se toma como [INF]                                                                                                               |

### 1.2 Eco/delay en karaoke

| Dato                                                                                                                                                                             | Fuente                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Para cantar sirven mejor tiempos cortos; el eco tipo «slapback» va de 80 a 140 ms; con tiempos largos el eco de una nota pisa la siguiente y cuesta cantar. [DOC]                | Guía de efectos de delay para DJ y karaoke de Lazada Mediahub — https://mediahub.lazada.sg/a-practical-guide-to-using-delay-effects-in-dj-mixing-and-karaoke-sg/ y patente US5753845 (karaoke) — https://www.google.ca/patents/US5753845 |
| En mezcladores de karaoke reales el eco tiene tres perillas: nivel (ECHO), repeticiones (REPEAT) y tiempo (DELAY). El manual manda empezar con el nivel en 5 (a la mitad). [DOC] | Manual VocoPro PKJ-9090PRO — https://www.manualsdir.com/manuals/219242/vocopro-pkj-9090pro.html?page=19                                                                                                                                  |
| Retroalimentación alta = bucle que crece sin fin; baja = una sola repetición limpia. [DOC]                                                                                       | Guía Lazada (arriba) y referencia de afinación Bongiovi — https://sdk.bongiovidps.com/dps-tuning-software-help/karaoke-reverb/                                                                                                           |
| Rangos de hardware: 0 a 400 ms y 400 a 800 ms (JB Systems KM-4.1); preset de Roland hasta 650 ms. [DOC]                                                                          | Reseña/ficha JB Systems — https://www.bax-shop.co.uk/19-inch-rack-mixer/jb-systems-km-4-1-karaoke-mixer                                                                                                                                  |

### 1.3 Música frente a voz y «ducking»

| Dato                                                                                                                                                          | Fuente                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ducking suave: 1 a 3 dB de reducción, ataque rápido, release de 80 a 150 ms (se dice de una pista de acompañamiento; es guía de mezcla, no de karaoke). [DOC] | bchillmix — https://bchillmix.com/blogs/news/how-to-make-vocals-sit-on-a-2-track-beat-without-fighting-the-instrumental           |
| Los equipos de karaoke caseros traen «control automático de volumen»: baja la música mientras se canta y la devuelve al callar. [DOC]                         | Manual de un sistema de karaoke (Goodmans XB7CDGIP) — https://videogame.manualsonline.com/manuals/mfg/goodmans/xb7cdgip.html?p=11 |
| **[NV]** No se encontró ninguna fuente que dé el nivel voz/música recomendado en dB para karaoke. El valor propuesto abajo es decisión nuestra [INF].         | —                                                                                                                                 |

### 1.4 Reverb en Web Audio

| Dato                                                                                                                                                                                                                                        | Fuente                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConvolverNode` convoluciona la entrada con un `AudioBuffer` (respuesta al impulso) y es el camino estándar de reverb; la entrada puede ser mono, estéreo o de 4 canales; `normalize` escala con potencia igual al asignar el buffer. [DOC] | MDN, ConvolverNode — https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode                                                                  |
| Generar el impulso con ruido blanco por una caída exponencial (unos −60 dB en la duración) es el truco clásico; cuanto más corto, más seco. El costo sube con la duración y con el número de canales. [DOC/INF]                             | MDN (ConvolverNode) + conocimiento general; el fragmento de ejemplo lo escribió la herramienta de lectura, no MDN                                    |
| Valores por defecto del compresor nativo: umbral −24 dB, rodilla 30, ratio 12, ataque 0,003 s, release 0,25 s; rangos: umbral −100 a 0, rodilla 0 a 40, ratio 1 a 20. [DOC]                                                                 | Especificación Web Audio / MDN createDynamicsCompressor — https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createDynamicsCompressor |
| Freeverb de Tone.js: 8 filtros peine (1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116 muestras a 44,1 kHz) y 4 pasa-todo (225, 556, 441, 341), `roomSize` 0,7 y `dampening` 3000 Hz por defecto. Licencia de Tone.js: MIT. [DOC]             | https://github.com/Tonejs/Tone.js/blob/dev/Tone/effect/Freeverb.ts y licencia https://github.com/Tonejs/Tone.js (MIT)                                |
| Smule usa reverb por convolución con respuestas de una sala real (la Ópera de San Francisco) y da dos controles: cantidad de reverb y tamaño de sala. [DOC]                                                                                 | Blog de Ópera de San Francisco sobre Smule — https://www.sfopera.com/blog/2015/12/our-newest-collaboration-with-music-app-developer-smule/           |
| `AudioContext` acepta `latencyHint` («interactive», «balanced», «playback» o segundos); la latencia total de salida ≈ `baseLatency` + `outputLatency` (esta última es estimación, mayor con Bluetooth). [DOC]                               | MDN, AudioContext.outputLatency — https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency                                        |

### 1.5 Afinación automática (auto-tune) en el navegador

- No existe, que se haya encontrado, una librería abierta, mantenida y completa de corrección de afinación en tiempo
  real para navegador. Existen **piezas**: detector de tono en WebAssembly con AudioWorklet (pitchlite, MIT) y
  desplazadores de tono (SoundTouchJS en AudioWorklet, phaze, rubberband-wasm). Un proyecto web de afinación (autotone,
  MIT) usa un modelo de TensorFlow.js y no está pensado para tiempo real. [DOC] Búsqueda: «real-time pitch correction
  browser AudioWorklet»; páginas: https://github.com/sevagh/pitchlite · https://github.com/olvb/phaze ·
  https://cdn.jsdelivr.net/npm/@soundtouchjs/audio-worklet@2.0.3/README.md (licencias de cada pieza sin revisar a fondo).
- **Recomendación honesta: NO incluirlo en la primera versión** (ver sección 5).

### 1.6 Cancelación de eco, ruido y ganancia automática

- Los proveedores de transmisión recomiendan apagar los tres filtros para música (eco, ruido, ganancia) porque
  recortan sostenidos y aplanan la voz cantada: nanoStream — https://docs.nanocosmos.de/docs/webrtc/nanostream_webrtc_speech_music
  y la prueba de respuesta en frecuencia de cat-in-136 — https://cat-in-136.github.io/2020/10/gum-frequency-characteristic-depending-on-audio-parameters.html
  (con ambos filtros apagados la respuesta salió plana). [DOC/OBS de terceros]
- En Firefox, poner `echoCancellation: false` apaga también ruido y ganancia salvo que se pidan; en Safari las
  restricciones `false` han fallado o lanzado error. Hay que leer `track.getSettings()` para saber qué se aplicó.
  Fuentes: https://arai.searchfox.org/firefox-main/source/dom/media/webrtc/tests/mochitests/test_defaultAudioConstraints.html ·
  https://bugs.webkit.org/show_bug.cgi?id=179411 · MDN https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/echoCancellation [DOC]

## 2. Cómo está hoy el código y dónde encaja [OBS del repositorio propio]

- `web/src/logica/grabadora.ts`: cada fuente (`micro`, `sistema`) pasa por un `GainNode` (volumen 0 a 2, por defecto 1) y
  luego al `LIMITADOR` (umbral −10 dB, rodilla 6, ratio 4, ataque 3 ms, release 250 ms), luego a una curva `WaveShaper`
  (techo −3 dB = 0,71) y al `MediaStreamDestination` que se graba. La barrita mide por un `AnalyserNode` por fuente.
- El `AudioContext` se crea con `new AudioContext()` (latencia por defecto) y solo se construye si hay pistas de audio.
- `restriccionesMicro()` pide `echoCancellation: true` y `noiseSuppression: true` fijos; solo la ganancia automática es
  configurable. El Estudio (`web/src/paginas/Estudio.tsx`, línea 489) ya la apaga con `autoGanancia: false`.
- El Estudio graba la pestaña actual con `preferCurrentTab` (`pestanaRecortada`), con el audio de la pestaña pedido sin
  eco/ruido/ganancia. La música llega, pues, por la pista de pantalla y se mezcla como `sistema`.
- Consecuencia: la cadena de voz nueva se inserta **entre la fuente del micrófono y su `GainNode`/limitador**, sin
  tocar el resto. El limitador y el techo siguen protegiendo el resultado, así que el reverb no puede saturar.

## 3. Cadena recomendada (valores exactos por defecto)

Todo es nuestro [INF], armado desde las fuentes de la sección 1. Una voz mono entra; sale estéreo si el impulso es estéreo.

```
micrófono ─► [1] pasa-altos 100 Hz (Q 0,707)
          ─► [2] corte de barro: peaking 300 Hz, Q 1,0, −2 dB
          ─► [3] presencia: peaking 3 kHz, Q 0,9, +2 dB
          ─► [4] aire: highshelf 10 kHz, +2 dB
          ─► [5] compresor de voz (umbral −24, rodilla 12, ratio 3, ataque 0,010, release 0,200)
          ─► [6] ganancia de voz = «voz seca»
                    ├──► seco ──────────────────────────────────────┐
                    ├──► [7] envío de reverb:                       │
                    │       pasa-altos 300 Hz → retardo 25 ms →     │
                    │       ConvolverNode (impulso 1,7 s, estéreo,  │
                    │       lowpass 6 kHz horneado) → ganancia REV ─┤
                    └──► [8] envío de eco:                          │
                            pasa-altos 300 Hz → retardo 120 ms →    │
                            pasa-bajos 3,5 kHz → ganancia ECO       │
                            (con retroalimentación 0,235 al retardo)─┤
                                                                    ▼
                                              suma ─► ganancia voz (VOZ_DB) ─► limitador existente
música ─► ganancia sistema (MUSICA_DB) ───────────────────────────► limitador existente
```

| Etapa                  | Valor por defecto                                                                                    | Por qué / fuente                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Pasa-altos             | 100 Hz, Q 0,707                                                                                      | 80–100 Hz (Audient); un poco alto para quitar golpes de soplido de micrófonos de computadora                                     |
| Corte de barro         | 300 Hz, −2 dB                                                                                        | Zona 200–500 Hz (Audient); dB nuestro, suave a propósito                                                                         |
| Presencia              | 3 kHz, +2 dB                                                                                         | Zona 1–4 kHz (Audient)                                                                                                           |
| Aire                   | 10 kHz, shelf +2 dB                                                                                  | 10–15 kHz (Audient); +2 y no más, porque micrófonos baratos ya traen siseo                                                       |
| Compresor              | umbral −24 dB, rodilla 12, ratio 3:1, ataque 10 ms, release 200 ms                                   | Ratio 3:1 a 4:1 (Audient); ataque/release entre los de Splice (25/180) y «rápido/medio»; nodo nativo: ver nota de ganancia abajo |
| De-esser               | **No va en la primera versión**                                                                      | No hay nodo nativo; ver sección 4 y paso 11                                                                                      |
| Reverb                 | impulso de 1,7 s, pre-delay 25 ms, retorno con pasa-altos 300 Hz y pasa-bajos 6 kHz                  | Placa 1–1,5 s (Splice) a 1,8 s (Audient); pre-delay 20–40 ms (Splice) y 10–20 (Audient)                                          |
| Nivel del reverb (REV) | −14 dB respecto a la voz seca                                                                        | Mezcla «baja» en estudio; en karaoke se sube un poco para el brillo de «show» sin lavar la letra                                 |
| Eco                    | retardo 120 ms, retroalimentación 0,235, nivel −20 dB respecto a la voz seca, retorno 300 Hz–3,5 kHz | Slapback 80–140 ms (Lazada/patente); repeticiones pocas (VocoPro, Bongiovi)                                                      |
| Voz frente a música    | voz a 0 dB, música a −6 dB (ganancias 1,0 y 0,5)                                                     | [INF], sin fuente; ver 3.2                                                                                                       |
| Limitador y techo      | los que ya existen (−10 dB, 4:1; techo −3 dB)                                                        | No se cambian                                                                                                                    |

**Nota de ganancia del compresor.** El `DynamicsCompressorNode` aplica por especificación una ganancia de compensación
automática; no hace falta añadir «makeup» salvo que la prueba de nivel (sección 6) lo pida. El compresor nativo además
tiene una pequeña latencia interna de anticipación; hay que medirla, no darla por sabida.

### 3.1 El control único «Efecto» (0 a 100)

Un solo deslizador, `t = efecto / 100`. **Valor por defecto: 50.** Al tocar «Karaoke» el control aparece en 50 y
suena bien sin tocar nada. Mapa (todo se interpola linealmente en dB, nunca en ganancia lineal):

| Parámetro                              | t = 0                | t = 0,5 (defecto) | t = 1                |
| -------------------------------------- | -------------------- | ----------------- | -------------------- |
| Nivel de reverb (REV, dB vs. voz seca) | apagado (ganancia 0) | −14 dB            | −2 dB                |
| Nivel de eco (ECO, dB)                 | apagado (ganancia 0) | −20 dB            | −10 dB               |
| Retroalimentación del eco              | 0,12                 | 0,235             | 0,35 (tope duro 0,4) |
| Compresor (ratio)                      | 2:1                  | 3:1               | 4:1                  |
| Presencia + aire (dB cada una)         | +0,5                 | +2                | +3                   |

Fórmulas fijas: `REV_dB = lerp(−26, −2, t)` (rango −26 a −2 dB, defecto −14) y `ECO_dB = lerp(−30, −10, t)` (defecto −20), ambas
apagadas del todo (ganancia 0) cuando `t = 0`. `retro = lerp(0,12, 0,35, t)`. Lo que NO cambia al mover el deslizador: tiempo de reverb (impulso fijo de 1,7 s; reconstruir el impulso mientras se
arrastra produce chasquidos), pre-delay y tiempo de eco. Así el control solo sube o baja cantidades, que es lo que
hacen también los dos controles de Smule (cantidad y tamaño; aquí se deja el tamaño fijo para no complicar).
Cambios de valor con `setTargetAtTime(valor, ahora, 0.03)`, nunca asignar `.value` directo.

### 3.2 Música y voz

- **Por defecto: música −6 dB (ganancia 0,5), voz 0 dB** [INF]. Razón: la voz cantada pasa por compresor + limitador y
  suele pegar más que una pista ya masterizada; sin esto la música tapa la letra. Hoy ambas van en 1.0.
- Mantener los controles de volumen existentes (0 a 2); el valor Karaoke solo cambia el punto de partida.
- **Ducking:** versión 1 **sin ducking dinámico** (un recorte fijo de 6 dB ya hace el trabajo y no añade riesgo).
  Versión 2 opcional: bajar la música 2 a 3 dB cuando la voz suena (profundidad 1–3 dB y release 80–150 ms según
  bchillmix; los karaokes de consumo traen «control automático de volumen»). Web Audio no tiene sidechain nativo: se
  hace midiendo el nivel de la voz seca con el `AnalyserNode` que ya existe y moviendo la ganancia de la música con
  `setTargetAtTime` (ataque 0,05 s, release 0,25 s, umbral sobre −40 dBFS de RMS). Como los temporizadores se frenan
  en pestañas ocultas, lo robusto es un AudioWorklet pequeño; por eso se deja para después.

## 4. Decisiones de técnica (Web Audio)

1. **Reverb: ConvolverNode con impulso generado por código — RECOMENDADO.** Ruido blanco estéreo (dos canales
   distintos, para el ensanche) multiplicado por `exp(−6,91 · t / 1,7)` (−60 dB a 1,7 s), con un pre-suavizado de bajas
   (un pasa-bajos de un polo por muestra con coeficiente que crece con t, para que las altas mueran antes: da el
   «brillo» de placa). Se calcula una sola vez al activar Karaoke y se guarda (unas 80 mil muestras por canal a 48 kHz:
   milisegundos de cálculo). Es nativo, corre fuera del hilo de la página y su costo de CPU es bajo y fijo; no depende
   de `AudioWorklet`.
2. **Freeverb de Tone.js — descartado para v1.** Es MIT y suena bien, pero necesita 12 filtros por canal y la librería
   Tone.js (peso y dependencia nueva); el impulso por código da el mismo resultado audible en voz cantada. Queda como
   plan B si en la prueba de oído el impulso suena «metálico».
3. **Respuesta al impulso real (como Smule):** solo con permiso de uso claro y archivo pequeño. No se halló un impulso
   de sala libre revisado en esta investigación; por eso no se propone.
4. **Eco:** `DelayNode` (máximo 1 s) con realimentación `GainNode` ≤ 0,4 y filtro pasa-bajos 3,5 kHz dentro del lazo
   (cada repetición suena más oscura, como cinta/eco real y no «digital»). Tope duro de retroalimentación para que
   jamás se vuelva bucle infinito.
5. **De-esser:** no hay nodo nativo. Opción posterior: dividir en dos bandas (pasa-altos 5,5 kHz) con un
   `DynamicsCompressorNode` solo en la banda aguda. Omitido en v1; el mejor remedio es no subir el aire más de +2 dB.
6. **Afinación automática: NO en v1 y probablemente nunca en directo.** Razones [INF]: (a) falta una librería completa
   y mantenida (solo piezas); (b) detectar el tono, decidir la nota correcta y desplazar en un `AudioWorklet` añade
   latencia y artefactos «robot» si se hace mal; (c) para «corregir» hay que conocer la tonalidad de la canción, que
   el navegador no sabe; (d) la voz ya sale con compresor + reverb, que es la mayor parte de la sensación de «voz
   bonita». Si se quiere explorar: experimento aparte, detector + SoundTouch/phaze, con la nota más cercana de la
   escala cromática y «velocidad de ajuste» lenta (50–100 ms) para que suene a corrección suave y no a efecto T-Pain.
7. **Realimentación (el parlante vuelve al micrófono):**
   - Con **audífonos** no hay problema: se apagan eco, ruido y ganancia del navegador.
   - Con **parlantes** la música sale por el altavoz y el micrófono la recoge y la mezcla dos veces (y recibe reverb).
     Ahí **hay que dejar `echoCancellation: true`** (quita del micrófono lo que suena de la propia computadora) pero
     **`noiseSuppression: false` y `autoGainControl: false`**.
   - Esto es [INF] y depende del navegador: se comprueba leyendo `track.getSettings()` y con la prueba 3 de abajo.
8. **Monitoreo propio:** por defecto **la voz no se reenvía a los parlantes ni a los audífonos** desde la página: la
   latencia de entrada + proceso + salida (decenas de milisegundos, cientos con Bluetooth) hace difícil cantar y
   cualquier ruta del micrófono a la salida es un riesgo de acoplamiento. La persona se oye a sí misma de forma natural
   (y por audífonos oye la música). Consecuencia: **no escucha el reverb mientras canta, solo en lo grabado.** Un botón
   «Escuchar mi voz» (solo con audífonos, apagado por defecto, con aviso) puede venir después.

## 5. Riesgos

| Riesgo                                                                                                                                                                              | Cómo se maneja                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sincronía voz-música.** La persona canta al compás de lo que oye, que llega con retraso de salida (+ Bluetooth). La voz grabada queda tarde respecto a la música capturada. [INF] | Retrasar la música capturada en la mezcla con un `DelayNode` igual a `outputLatency + baseLatency` del contexto (mínimo 0, máximo 0,3 s), y ofrecer un ajuste fino de ±300 ms en Karaoke. Medir con el mismo método de la prueba 4.                   |
| **Eco/ruido/ganancia del navegador arruinan la voz cantada.**                                                                                                                       | Apagar `noiseSuppression` y `autoGainControl` en modo Karaoke; `echoCancellation` solo apagado con audífonos (punto 7). Leer `getSettings()` y avisar si el navegador no obedeció. Safari: usar restricciones sin `exact` y no fallar si lanza error. |
| **Bluetooth con micrófono** (el micro del audífono baja la calidad y sube el retraso).                                                                                              | Avisar y recomendar el micrófono de la computadora o uno con cable.                                                                                                                                                                                   |
| **El reverb se come la letra.**                                                                                                                                                     | Pre-delay 25 ms, retorno filtrado desde 300 Hz, nivel −14 dB por defecto, tope en −2 dB.                                                                                                                                                              |
| **Saturación al sumar voz+reverb+eco+música.**                                                                                                                                      | Ya mitigado por el limitador y el techo de −3 dB; además la voz y la música no suman más de 0 dB de pico nominal. Prueba de nivel obligatoria.                                                                                                        |
| **CPU en computadoras flojas** (la grabación ya mezcla video en lienzo).                                                                                                            | Un solo convolver estéreo de 1,7 s; si `latencyHint` por defecto se queda corto, probar `'interactive'` y, si hay cortes, `'balanced'`. Medir.                                                                                                        |
| **Chasquidos al mover el control.**                                                                                                                                                 | Solo cambiar ganancias con `setTargetAtTime`; nunca recrear el impulso arrastrando.                                                                                                                                                                   |
| **Pestaña grabada = la misma que reproduce la música.** El audio capturado ya incluye todo lo que suene en la pestaña.                                                              | No cambia nada del flujo actual; la cadena solo toca la rama del micrófono.                                                                                                                                                                           |
| **Sin fuente para los números exactos de las apps que citó el dueño.**                                                                                                              | Decirlo al dueño en la entrega; la afinación de oído se hace con las pruebas de aceptación.                                                                                                                                                           |

## 6. Plan de implementación en Web Audio (para el desarrollador)

1. **Pieza pura y probada** `web/src/logica/karaoke.ts`: constantes de la sección 3 (`KARAOKE_DEFECTO = { efecto: 50 }`),
   la función `parametrosKaraoke(efecto)` que devuelve los dB y ganancias de cada etapa (con los límites y el tope
   0,4 de la retroalimentación) y `impulsoReverb(ctx, segundos = 1.7)`. Prueba unitaria en rojo primero: valores en
   0, 50 y 100; monotonía; nunca > 0,4; `efecto` fuera de rango se recorta.
2. **Ajustes de la grabadora:** campos nuevos `karaoke?: { activo: boolean; efecto: number; audifonos: boolean;
desfaseMs?: number }` en el tipo de ajustes. `restriccionesMicro()` recibe un modo: Karaoke con audífonos →
   `echoCancellation false, noiseSuppression false, autoGainControl false`; Karaoke con parlantes →
   `echoCancellation true, noiseSuppression false, autoGainControl false`. Leer `getSettings()` y guardar lo aplicado.
3. **Contexto de audio:** crear `new AudioContext({ latencyHint: 'interactive' })` solo en modo Karaoke (resto igual).
4. **Cadena de voz:** en la rama del micrófono de `grabadora.ts` (justo donde se crea `fuente`), si hay Karaoke insertar
   pasa-altos, corte de barro, presencia, aire y compresor (etapas 1–5) y terminar en la ganancia «voz seca». Sin
   Karaoke, el cableado actual no cambia (el candado de que lo grabado sigue igual para quien no lo use).
5. **Reverb:** `ConvolverNode` con `impulsoReverb`, `normalize = true`, precedido de pasa-altos 300 Hz y un
   `DelayNode` de 25 ms; salida a una ganancia `REV`.
6. **Eco:** `DelayNode` 120 ms con lazo de retroalimentación (ganancia + pasa-bajos 3,5 kHz) y pasa-altos 300 Hz a la
   entrada; salida a una ganancia `ECO`. Tope duro en código de la retroalimentación a 0,4.
7. **Suma y ruta:** seco + REV + ECO → ganancia de voz → el `GainNode` de volumen `micro` ya existente → limitador.
   La barrita de nivel del micrófono sigue midiendo después del volumen, como hoy (lo que se mide es lo que se graba).
8. **Equilibrio:** al activar Karaoke poner el volumen `sistema` en 0,5 y el `micro` en 1,0 como punto de partida (sin
   pisar lo que la persona ya movió en esa grabación), y retrasar la música con un `DelayNode` de
   `outputLatency + baseLatency` (tope 0,3 s) más el ajuste fino del usuario.
9. **Control en pantalla** (`Estudio.tsx`): botón «Karaoke / Karaoke» (español e inglés), al encenderse aparece el
   deslizador «Efecto / Effect» 0–100 con 50 por defecto, un interruptor «Uso audífonos / I'm using headphones» y el
   ajuste fino de sincronía. Todo guardado con el hook de borrador de la casa (nada se pierde al recargar). El cambio
   en vivo llama a un método `ajustarEfecto(valor)` de la `Grabadora` que usa `setTargetAtTime`.
10. **Pruebas automáticas:** unitarias de `karaoke.ts`; de la grabadora con Web Audio simulado (la cadena existe y
    termina en el limitador; sin Karaoke el cableado es el de hoy); end-to-end de Playwright (Chrome con micrófono
    simulado) que graba con Karaoke y comprueba que el audio del resultado tiene energía más allá del fin de una nota de
    prueba (la cola del reverb) y que el pico nunca pasa de −3 dB. Comprobarlas en rojo, quitando el reverb a propósito.
11. **Después (no en esta entrega):** de-esser por dos bandas; ducking con AudioWorklet; «Escuchar mi voz» con
    audífonos; presets «Sala / Teatro / Estadio» que solo cambien el impulso (1,0 / 1,7 / 2,6 s) construyéndolo una
    vez al elegir, nunca arrastrando.
12. **Guía pública en Docs, en español e inglés** (regla de la casa): «Cómo usar Karaoke» con capturas (audífonos
    recomendados, qué hace el deslizador, por qué no se oye el reverb mientras se canta).

### Pruebas de aceptación (hay que oírlas)

1. **Sonido «bonito» con valor por defecto.** Grabar 30 s cantando sobre una pista conocida, Karaoke encendido sin tocar
   nada: la voz se oye cercana, con brillo suave y una cola corta; la letra se entiende; no hay siseo ni chasquidos.
   Comparar con el audio sin Karaoke: debe notarse la diferencia sin que parezca otro micrófono.
2. **Control.** En 0 el audio es igual al de «sin efecto» (salvo el EQ y el compresor suaves); en 100 el reverb y el eco se
   oyen claramente pero la letra sigue entendible; arrastrar el control durante la grabación no produce chasquidos.
3. **Parlantes.** Con altavoces (sin audífonos), la música no aparece duplicada ni «con eco» dentro de la voz grabada.
4. **Sincronía.** Dar palmadas siguiendo el pulso de la música y grabar: el desfase entre palmada y pulso en el
   archivo grabado queda dentro de ±40 ms con y sin Bluetooth (con el ajuste automático más el fino).
5. **Nivel.** Voz fuerte + música fuerte: el pico del archivo nunca pasa de −3 dB y no hay recorte audible.
6. **Seguridad de realimentación.** Con la retroalimentación del eco en su máximo, un grito sostenido no produce un bucle
   que crezca.
7. **Navegadores.** Chrome (escritorio) completo; Safari y Firefox: Karaoke funciona o muestra un aviso claro, nunca una
   pantalla en blanco ni un error de restricción.
8. **Sin Karaoke, todo igual que hoy:** las pruebas existentes de la grabadora siguen en verde.

## 7. Decisión recomendada (tarea para el desarrollador)

Construir el botón **Karaoke** con la cadena de la sección 3 (EQ de 4 etapas + compresor 3:1 + reverb por
`ConvolverNode` de 1,7 s con pre-delay de 25 ms + eco de 120 ms), un único deslizador «Efecto» con valor 50, música a
−6 dB por defecto, sin afinación automática y sin ducking dinámico en la primera versión, con el interruptor de
audífonos que decide si queda activa la cancelación de eco. Seguir el plan de la sección 6 y no dar por terminado hasta
pasar las ocho pruebas de aceptación con una escucha de Richard.
