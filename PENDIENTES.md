# Pendientes de PANTALAI

## 👤 Depende de Richard

- 👤 (Opcional) Claves de Cloudflare Turnstile para el escudo anti-robots en entrar y registrarse.
- 👤 Llave de la API de Gemini (plan de pago, proyecto «pantalai») y presupuesto de 10 USD en Google Cloud.
  Destraba: título, resumen, capítulos, tareas y el botón Generar. (IA aprobada por Richard el 19 oct 2026.)

## De mi lado

- [x] Oído encendido en producción (19 oct 2026): token de Cloudflare «pantalai-whisper» en el sitio; prueba real
      en vivo con voz: transcripción exacta en frases y muletillas «um» y «uh» encontradas.
- [ ] Al llegar la llave de Gemini: guardarla como secreto GEMINI_API_KEY con la llave del hosting, republicar
      y repetir la prueba real en vivo (título, resumen, capítulos, tareas y Generar).
- [ ] Hay cuentas de prueba «Soporte E2E…» en producción, creadas por las pruebas en vivo. Borrarlas solo si Richard dice.

- [x] Sitio en vivo (19 oct 2026): salud ok, base y almacén ok, variable `SITIO_CONECTADO=1` puesta y grabación
      de punta a punta pasada contra https://pantalai.sitios.dev.
- [ ] La portada «/» la sirve la plataforma como estático y no lleva las cabeceras de seguridad (las demás
      páginas sí). Estudiar servirla desde el programa sin romper la portada.
- [ ] Grabación con dibujo sobre la pantalla y énfasis del cursor (necesita extensión de Chrome).
- [ ] Extensión de Chrome con modo «reporte de error» (consola y red).
- [ ] Carpetas compartidas y espacios de equipo.
