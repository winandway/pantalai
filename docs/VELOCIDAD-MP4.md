# Por qué tardaba el MP4 y qué se cambió (20 oct 2026)

## Qué pasaba

- Pantalay le pedía al navegador grabar en MP4 con el código «avc1,mp4a», que Chrome **rechaza** (exige el perfil
  completo, por ejemplo «avc1.640028,mp4a.40.2»). Entonces Chrome caía siempre en **WebM (VP9 + Opus)**.
- El iPhone, Final Cut y YouTube necesitan MP4 (H.264 + AAC). Para tenerlo, al abrir el video la computadora del dueño
  **bajaba el video entero, volvía a codificar cada cuadro y lo subía otra vez**. Un video de 8 minutos son unos 14.000
  cuadros: eso es lo lento, y si la computadora se queda corta de memoria o cierras la pestaña, falla («No se pudo
  preparar la versión MP4»).

## Qué hacen los grandes (observado con REA, como visitante)

En la página pública de Loom los videos se sirven ya convertidos desde su nube, en una ruta
`cdn.loom.com/sessions/transcoded/<id>.mp4` (evidencia REA `ev_5075195e31612b630c19d063585e7a419b359bef0ec2a76f53797e041a4ddab7`).
Es decir: la conversión la hacen sus servidores, nunca la computadora de quien graba.

## Qué se hizo

- **Grabar directo en MP4 (H.264 High + AAC)**, con los códigos completos (`web/src/logica/grabadora.ts`,
  `tipoDeGrabacion`). Chrome, Edge y Safari lo graban así. Comprobado con ffprobe: H.264 High 1080p 30 cuadros + AAC,
  duración correcta, se decodifica sin errores.
- Si el original ya es MP4 y no tiene puntas cortadas, **el original ES el MP4** que se ve y se descarga: no hay copia,
  no hay espera (`fuenteMp4` en `servidor/app.ts`).
- Con puntas cortadas, la copia se arma **sin volver a codificar** (se copian los cuadros, mediabunny): segundos.
- Los videos viejos en WebM siguen convirtiéndose como antes, una vez. Si falla, el error **ahora llega al servidor**
  y se ve en el superadmin → Sistema → «Errores en las computadoras de los clientes».

## Lo que queda como mejora futura

- Convertir en la nube (como Loom) los videos viejos o los navegadores que no graban MP4 (Firefox): necesita un
  servicio de conversión pago (por ejemplo Cloudflare Stream). No hace falta para Chrome, Edge ni Safari.
