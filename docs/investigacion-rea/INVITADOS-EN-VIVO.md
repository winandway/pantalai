# Ficha de investigación — Invitado remoto en vivo en el Estudio de reacciones (entrevista a distancia)

Fecha: 10 nov 2026. Investigador: puesto Investigador. Pedido de Richard: qué hace falta para que la segunda tarjeta de la
máscara tipo podcast muestre a un INVITADO REMOTO en vivo (estilo StreamYard / Riverside), con opción de grabar y de
transmitir en vivo a YouTube y Facebook.

Etiquetas: [REA] observado con REA (con hash) · [OBS] observado a mano · [DOC] documentación oficial leída hoy ·
[INF] inferencia o cálculo nuestro · [NV] no pude comprobarlo.

Límite respetado: a StreamYard, Riverside y Restream solo se les miró la web pública como visitante (páginas de precios,
sin cuenta, sin entrar a ningún estudio, sin analizar ni descompilar su código). REA se usó con un Chrome aislado y vacío,
`capture_browser_scenario` con árbol de accesibilidad y lista de direcciones a las que llama la página.

---

## 1. Lo que REA mostró de cada competidor

Evidencias REA (páginas de precios, 10 nov 2026):

- StreamYard `/pricing` — `ev_3f6822e88e9d380b28b32ebb23d6ceac86a4e7ae13ee5bc6c316a5492e419de2`
- Riverside `/pricing` — `ev_83a75cc46720713ba1674ea5e297b5ef1a683d18c657e1fac2922c1a85edd748`
- Restream `/pricing` — `ev_87727b2c31d0a3998d1fca2dd23156a92dd440bd6a62193c446ecc4725af2ba6`

### StreamYard (https://streamyard.com/pricing)

- Precios por mes [REA]: Free 0 USD · Essential 18,99 (14,99 pagando por año) · Core 44,99 (35,99 por año) ·
  Advanced 88,99 (68,99 por año). Prueba gratis de 7 días en los de pago.
- Participantes en pantalla [REA]: Free 6 · Core 10 · Advanced 15 «backstage». Multistream: Essential 2 destinos, Core 3,
  Advanced 8, más RTMP propio desde Core.
- Grabación [REA]: Free solo «grabación local 2 horas/mes»; Core trae «Live streams are recorded», «Unlimited local
  recordings» y «Cloud recording». Advanced: grabación local en 4K.
- Cómo entra el invitado [DOC]: con el enlace de invitación del estudio, sin cuenta ni descarga (se puede exigir Google o
  Facebook como seguridad extra); Chrome, Edge, Firefox y Opera, y también Safari; en iPhone/iPad recomiendan su app de
  invitado. Fuente: https://support.streamyard.com/hc/articles/360043291612 y
  https://support.streamyard.com/hc/en-us/articles/360043733751 (leídas vía búsqueda 10 nov 2026).
- Tecnología [NV]: la web pública solo llama a su propio dominio, Stripe, Sentry y analítica (lista de orígenes de la
  captura); no se ve ningún proveedor de video en vivo. No hay documento oficial que diga SFU ni proveedor. Una sola
  fuente no oficial (comentario en foro) dice que el servidor entra a la llamada como un participante más; no es fiable.
  Una oferta de empleo de su equipo de estudio pide experiencia con FFmpeg/GStreamer (lo que sugiere composición en
  servidor, solo una pista, no una confirmación).

### Riverside (https://riverside.com/pricing)

- Precios por mes [REA]: Pro 35 (24 pagando por año) · Grow 45 (34 por año) · Webinar 99 (79 por año) · Business a medida.
  Nota: la página dice «hasta 20 % menos» pero 24 contra 35 es 31 %; se anota lo que muestra la página.
- Personas grabadas en una sola sesión [REA]: 10 en todos los planes. Video hasta 4K en escritorio, audio 44,1 y 48 kHz.
- Transmisión en vivo [REA]: solo desde Grow, 1080p, a destinos ilimitados (YouTube, Facebook, LinkedIn, X, Twitch,
  Instagram, TikTok) y RTMP propio.
- Grabación [REA][DOC]: filas «Local recording», «Progressive uploading» y «Automatic cloud backups» en la tabla de
  planes. Su propia página dice que graba primero en el dispositivo de cada participante y sube durante la sesión, y que
  soporta que el navegador se cierre solo (https://riverside.com/recording y https://riverside.com/faq). Pistas separadas
  de audio y video: 15 h/mes en Pro, 20 en Grow, 25 en Webinar.
- Invitado: sin cuenta y sin descarga en computadora [DOC, reseñas y su guía para invitados]; el invitado debe dejar la
  pestaña abierta hasta que termine de subir su copia local [OBS de reseñas, no oficial].
- Tecnología [NV]: la web pública no revela proveedor; ninguna fuente oficial dice «WebRTC» ni «SFU». No se pudo entrar a un
  estudio de invitado sin invitación real.

### Restream (https://restream.io/pricing)

- Precios por mes [REA], etiquetados «Annual pricing»: Free 0 · Standard 19 · Professional 49 · Business 239. El precio
  mensual sin contrato no salió en la captura [NV].
- En pantalla [REA]: Free 6 · Standard/Pro/Business 10. El estudio es 720p en Free y Standard, 1080p desde Professional.
  Multistream: 2, 3, 5 y 8 canales. Grabación en la nube hasta 6 h (Free) o 10 h por transmisión.
- Invitados [DOC]: la ayuda oficial dice 5 invitados en Free y 9 en los de pago contando anfitriones; el blog dice 6 y 9;
  la página de precios dice 6 o 10 en pantalla. Las tres cifras no coinciden: [NV] la cifra exacta.
  Fuente: https://support.restream.io/en/articles/3998533-guests-in-studio
- Entra con enlace fijo, sin software, pueden entrar solo con micrófono [DOC].
- Tecnología [NV]: la página llama a su propio dominio de datos y analítica; no se ve proveedor de video.

**Conclusión de la observación:** ninguno de los tres publica qué tecnología de video usa ni su proveedor, y ningún estudio
de invitado se pudo ver sin invitación; esto queda como [NV] y no se intentó saltarlo (reglas del puesto).
Todo apunta a un navegador con WebRTC y un servidor en medio, pero eso es [INF], no hecho comprobado.

Lo que sí es común [REA]: invitado por enlace sin cuenta, 6 a 10 personas en pantalla, transmisión a varios destinos solo
en planes de pago (desde unos 19 a 45 USD al mes), y Riverside se diferencia por grabar cada uno en su equipo y subir.

---

## 2. Precios oficiales de infraestructura (leídos el 10 nov 2026)

| Pieza                                                                          | Precio oficial                                                                                                                                                                                                                | Fuente                                                                                                         |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Cloudflare Realtime SFU y TURN                                                 | 0,05 USD por GB de salida; los primeros 1.000 GB al mes gratis (compartidos SFU+TURN); entrada gratis; el tráfico TURN↔SFU no se cobra dos veces                                                                              | https://developers.cloudflare.com/realtime/sfu/pricing/ · https://developers.cloudflare.com/realtime/turn/faq/ |
| Cloudflare RealtimeKit (producto armado: sala, invitados, grabación, RTMP/HLS) | 0,002 USD por minuto-participante con video (0,0005 solo audio), 10.000 min incluidos; exportar (grabar, RTMP o HLS) 0,010 USD por minuto, 100 min incluidos; actualizada 5 nov 2026                                          | https://developers.cloudflare.com/realtime/realtimekit/pricing/index.md                                        |
| Cloudflare Stream                                                              | 1 USD por 1.000 minutos entregados; 5 USD al mes por 1.000 minutos guardados; entrada y codificación gratis; las salidas RTMP/SRT (simulcast) cuentan como minutos entregados; WebRTC se cobra desde el 15 oct 2026           | https://developers.cloudflare.com/stream/pricing/                                                              |
| LiveKit Cloud                                                                  | Build 0 USD (5.000 min-participante, 50 GB); Ship desde 50 USD/mes (150.000 min, 250 GB, 0,0005 USD/min extra, 0,12 USD/GB extra); Scale desde 500; exportar/transcodificar 0,02 USD/min de video (600 min incluidos en Ship) | https://livekit.com/pricing                                                                                    |
| Daily                                                                          | 10.000 min gratis al mes; 0,004 USD por minuto-participante (video); RTMP en vivo 0,015 USD por minuto codificado; grabación en nube 0,01349 USD/min; sin cargo de ancho de banda listado                                     | https://www.daily.co/pricing/video-sdk/                                                                        |
| Agora                                                                          | 10.000 min gratis al mes; video HD 3,99 USD por 1.000 min por participante (Full HD 8,99); Media Push (a CDN/RTMP) desde 1,99 USD por 1.000 min; grabación desde 0,99                                                         | https://prod.agora.io/en/pricing/agora-rtc · https://www.agora.io/en/pricing/                                  |

Limitaciones del precio:

- Cloudflare Stream con entrada WebRTC (WHIP) **no admite simulcast RTMP/SRT ni grabación** [DOC:
  https://developers.cloudflare.com/stream/webrtc-beta/]. Para reenviar a YouTube, Stream necesita una entrada RTMP/SRT,
  y un navegador no habla RTMP. Por eso Stream solo sirve si hay algo en medio que convierta WebRTC a RTMP.
- Agora no dice qué resolución es «HD»; la página no lo define [NV: que HD sea 720p].
- Agora Media Push y LiveKit «transcode egress» como cobro de RTMP de salida: lo segundo es [INF] (la tabla de LiveKit no
  nombra RTMP, solo «recording/export»).
- Si Cloudflare Realtime exige plan de pago de Workers para usar la cuota gratis: no lo leí [NV].

---

## 3. Cuenta de costo de una entrevista típica

Supuestos (dichos claramente): 2 personas, 60 minutos, 720p. Ninguna fuente oficial dio el consumo por participante,
así que uso **1,5 Mbps por flujo de video** [INF] (el audio, unos 0,05 Mbps, se ignora).

Datos por entrevista [INF]:

- 1,5 Mbps × 3.600 s = 5.400 Mb = 675 MB por flujo. Con SFU cada persona recibe el flujo de la otra: 2 flujos = **1,35 GB
  de salida** (la subida de cada uno es gratis en Cloudflare).
- 2 participantes × 60 min = **120 minutos-participante**.
- Si el 20 % tuviera que pasar por TURN (cifra de la industria «alrededor de 20 %», sin medición reciente fiable) serían
  0,27 GB por entrevista por esa vía, ya incluidos en el consumo.

### Sin transmitir (solo hablar y grabar en el navegador del anfitrión, como ya hace el Estudio)

| Camino                                                                        | 1 entrevista                                         | 100 entrevistas al mes                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Directo entre los dos (WebRTC punto a punto) + TURN de Cloudflare de respaldo | 0 USD de video (solo los ~0,27 GB posibles por TURN) | 27 GB: **0 USD** (dentro de 1.000 GB gratis)                                                                                         |
| Cloudflare Realtime SFU                                                       | 1,35 GB × 0,05 = 0,068 USD sin descuento             | 135 GB: sin descuento 6,75 USD; con la cuota gratis **0 USD**                                                                        |
| Cloudflare RealtimeKit                                                        | 120 × 0,002 = 0,24 USD sin descuento                 | 12.000 min − 10.000 gratis = 2.000 × 0,002 = **4 USD**                                                                               |
| LiveKit                                                                       | 120 min-participante                                 | Build gratis cubre unas 41 entrevistas (5.000 min); para 100 hace falta Ship: **50 USD** (12.000 min y 135 GB entran en lo incluido) |
| Daily                                                                         | 120 × 0,004 = 0,48 USD sin descuento                 | 2.000 × 0,004 = **8 USD**                                                                                                            |
| Agora (HD)                                                                    | 120 × 0,00399 = 0,48 USD sin descuento               | 2.000 × 0,00399 = **7,98 USD**                                                                                                       |

### Transmitiendo además a YouTube (60 min, un solo destino)

| Camino                             | Extra por entrevista                                                          | 100 entrevistas al mes (total)                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| RealtimeKit con exportación RTMP   | 60 × 0,010 = 0,60 USD                                                         | 6.000 min − 100 gratis = 5.900 × 0,01 = 59 USD + 4 USD de participantes = **63 USD** |
| Daily con RTMP                     | 60 × 0,015 = 0,90 USD                                                         | 90 USD + 8 USD = **98 USD**                                                          |
| LiveKit Ship con salida RTMP [INF] | 60 × 0,02 = 1,20 USD                                                          | 50 USD + (6.000 − 600) × 0,02 = 108 USD = **158 USD**                                |
| Agora con Media Push [NV, «desde»] | 60 × 0,00199 = 0,12 USD (si cuenta por minuto de transmisión)                 | ~8 + ~12 = **~20 USD** (no comprobado el detalle de cobro)                           |
| Cloudflare Stream                  | solo reenvía si recibe RTMP/SRT; 60 min × 1 destino = 0,06 USD, 6 USD por 100 | **6 USD + el costo de quien convierta WebRTC a RTMP** (no existe aún en lo que leí)  |

Cada destino extra en Cloudflare Stream suma 0,06 USD por hora [DOC+INF]; en RealtimeKit y Daily el cobro es por
exportación (no consta si es por destino) [NV].

Lectura: sin transmitir, el costo para 100 entrevistas al mes es de 0 a 8 USD con Cloudflare; con transmisión a YouTube, de
unos 60 a 160 USD, dominado por el cobro de la exportación RTMP, no por el video.

---

## 4. Desafíos técnicos

1. **Dos personas en redes distintas (TURN).** WebRTC intenta conexión directa; cuando una red no lo permite hace falta un
   relevo TURN. La cifra más repetida es que alrededor de 1 de cada 5 llamadas lo necesita, pero viene de blogs de proveedores y
   de una medición de 2016 que habla de llamadas fallidas (22 %), no de todas [fuentes: https://www.metered.ca/blog/what-is-a-turn-server/
   y https://www.nojitter.com/know-where-turn-when-deploying-webrtc]. Cloudflare TURN cuesta 0,05 USD/GB con 1.000 GB gratis,
   así que el relevo no es el problema de dinero; sí es obligatorio tenerlo, porque sin él parte de los invitados no entra.
2. **Calidad y cortes.** Con punto a punto, la calidad la limita el peor de los dos enlaces y no hay quien adapte. Con SFU
   (Cloudflare Realtime) el servidor puede reenviar capas; el invitado no necesita más de 720p. Soporta H.264, VP8, VP9 y AV1,
   y reconecta si se pierde la conexión en 30 s [DOC: https://developers.cloudflare.com/realtime/sfu/platform/limits/].
3. **Eco.** Si el anfitrión graba el audio de la pantalla y el invitado habla por los altavoces, el invitado se oye a sí mismo
   y la grabación se ensucia. Hace falta cancelación de eco en la captura de cada micrófono y pedir audífonos [INF]; lo
   exacto (restricciones de captura) se verifica en prueba, no se leyó una fuente oficial hoy [NV].
4. **Sincronizar el audio de los dos en la grabación.** Si el anfitrión graba en su navegador lo que ve y oye (composición
   actual), el invitado ya llega mezclado y sincronizado por construcción; el costo es que la calidad del invitado es la de la
   conexión de ese momento. Con grabación separada (estilo Riverside) hay que dar a cada pista una marca de tiempo común y
   alinearlas al unir [INF].
5. **Grabar en el navegador del anfitrión o grabar cada uno en local y subir.** Lo primero ya existe en Pantalay y no cuesta.
   Lo segundo (Riverside) da calidad estudio aunque la conexión falle, pero exige subida por partes a nuestro almacenamiento
   mientras se graba, que el invitado deje la pestaña abierta al final y mucho cuidado con equipos lentos [DOC/OBS Riverside].
6. **Navegadores y iPhone.** StreamYard dice que sus invitados entran con Safari y que en iPhone recomiendan una app propia
   [DOC]. La captura de pantalla recortada (Region Capture, la del Estudio) está marcada por MDN como «disponibilidad
   limitada» (no funciona en algunos navegadores muy usados): el anfitrión debe ser Chrome o Edge de escritorio. MDN también
   avisa que `getDisplayMedia` no es estándar en todos; que iOS no lo soporta es conocimiento general, [NV] con la tabla
   oficial (no cargó). El invitado solo necesita cámara y micrófono, que sí funcionan en Safari.
7. **Qué hace falta del lado del servidor.** Una «sala» donde los dos intercambian ofertas y rutas (señalización): se puede
   hacer con un Durable Object con WebSockets, o con un Worker que apunte a Cloudflare Realtime (la propia documentación
   dice que la señalización puede correr en Workers y que el servidor debe guardar el estado de cada sesión mientras dura
   [DOC: https://developers.cloudflare.com/realtime/sfu/get-started/connection-patterns/]). La documentación de SFU no menciona
   Durable Objects de forma obligatoria [DOC]. **Regla de Richard:** lo que use Durable Objects se publica directo en
   Cloudflare Workers, no en YaDominios Cloud; eso implica un Worker aparte y una cuenta/recursos nuevos (👤 su visto bueno
   antes de crear nada). Alternativa que evitaría Durable Objects para 2 personas: señalización por consultas cortas a nuestra
   base D1 [INF, no comprobada, más lenta].
8. **Transmitir a YouTube/Facebook desde el navegador.** Un navegador no envía RTMP. Hay que pasar por un servicio que
   convierta (RealtimeKit, LiveKit, Daily, Agora) y cobre por minuto, y Cloudflare Stream por WHIP no reenvía a RTMP [DOC].
   La máscara de Pantalay (dos tarjetas) tendría que reproducirse del lado servidor; RealtimeKit menciona una app de
   grabación personalizada, pero si admite el diseño propio y la salida RTMP no está confirmado [NV].

---

## 5. Comparación con lo nuestro

- Hoy: máscara de podcast con cámara del anfitrión y un video de YouTube/TikTok grabado en el navegador con Region Capture.
  Costo de infraestructura: cero (todo corre en el navegador del anfitrión).
- Para el invitado: reemplazar la tarjeta del video por el flujo remoto (un elemento de video con el flujo recibido, el
  recorte de captura ya no hace falta para esa tarjeta).

## 6. Decisión recomendada (el camino más seguro y barato)

1. **Fase 1 — entrevista 1 a 1, grabada en el navegador del anfitrión (0 USD).** Invitado entra con un enlace sin cuenta;
   conexión directa WebRTC con TURN de Cloudflare de respaldo; señalización en un Worker con una sala. Sin servidor de medios,
   sin cobro por minuto. Candado: probar entre dos redes distintas con TURN forzado y con Safari como invitado.
2. **Fase 2 (si se quiere más de 2 personas o calidad pareja):** pasar a Cloudflare Realtime SFU; 100 entrevistas al mes
   siguen dentro de la cuota gratis (135 GB de 1.000).
3. **Fase 3 — transmitir a YouTube/Facebook:** es lo caro (60 a 160 USD por 100 entrevistas de una hora). Hacerla solo cuando
   haya plan de pago que la cubra, con el tope escrito antes de encender nada (regla global de gasto) y sin billetera de agente.
   Primera opción a probar: RealtimeKit con exportación RTMP (0,01 USD/min); segunda, Daily (0,015 USD/min).
4. **Fase 4 — grabación por separado estilo Riverside:** la última, por ser la más compleja.

Pruebas de aceptación sugeridas (para el desarrollador): (a) dos navegadores en redes distintas se ven y se oyen; (b) con TURN
forzado sigue funcionando; (c) invitado en Safari/iPhone entra por enlace y se ve; (d) el video grabado trae a los dos con
audio sincronizado y sin eco; (e) si se cae el invitado, vuelve a entrar con el mismo enlace sin perder la grabación;
(f) un contador de minutos de invitado por entrevista y un tope mensual.

## Lo que no pude comprobar

Proveedor y arquitectura de StreamYard, Riverside y Restream; cuántos invitados exactos da Restream; precio mensual de
Restream; consumo real por participante (usé 1,5 Mbps como supuesto); si Cloudflare Realtime exige plan de pago;
si RealtimeKit/Agora/LiveKit cobran el RTMP de salida como supuse; soporte de `getDisplayMedia` en iOS (tabla de MDN no cargó);
Facebook como destino de Stream (la documentación lo nombra, sin instrucciones).

## Fuentes (leídas el 10 nov 2026)

- https://streamyard.com/pricing · https://riverside.com/pricing · https://restream.io/pricing (observadas con REA)
- https://support.streamyard.com/hc/articles/360043291612 · https://support.restream.io/en/articles/3998533-guests-in-studio
- https://riverside.com/recording · https://riverside.com/faq
- https://developers.cloudflare.com/realtime/sfu/pricing/ · /realtime/turn/faq/ · /realtime/realtimekit/pricing/index.md · /realtime/sfu/platform/limits/ · /realtime/sfu/get-started/connection-patterns/ · /realtime/realtimekit/recording-guide/
- https://developers.cloudflare.com/stream/pricing/ · /stream/webrtc-beta/ · /stream/stream-live/simulcasting/
- https://livekit.com/pricing · https://www.daily.co/pricing/video-sdk/ · https://prod.agora.io/en/pricing/agora-rtc
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia · https://developer.mozilla.org/en-US/docs/Web/API/CropTarget
- https://www.metered.ca/blog/what-is-a-turn-server/ · https://www.nojitter.com/know-where-turn-when-deploying-webrtc
