# Pantalay en Google Search Console

> Preparado el 20 de octubre de 2026. Todo lo técnico ya está publicado y comprobado en vivo en pantalay.com.
>
> ✅ **HECHO el 20 oct 2026:** Richard verificó pantalay.com (propiedad de dominio) y envió el sitemap. Google lo
> leyó ese mismo día: estado «Correcto», 25 páginas descubiertas. **No hay que volver a hacerlo.**

## Lo que ya está listo en el sitio

| Pieza                                                                            | Dónde                            | Estado                     |
| -------------------------------------------------------------------------------- | -------------------------------- | -------------------------- |
| Mapa del sitio con la portada, Docs y todas las guías                            | https://pantalay.com/sitemap.xml | ✅ 200, XML                |
| robots.txt que deja entrar a Google y señala el mapa                             | https://pantalay.com/robots.txt  | ✅                         |
| Dirección oficial (canonical) en cada página, siempre con pantalay.com           | cabecera de cada página          | ✅                         |
| Título y resumen propios en cada guía de Docs (no solo el de la portada)         | cabecera de cada guía            | ✅                         |
| Tarjeta para redes (Open Graph) con pantalay.com                                 | cabecera                         | ✅                         |
| Páginas privadas fuera de Google (biblioteca, grabar, editar, precios por ahora) | `noindex`                        | ✅                         |
| Dirección vieja (sitios.dev) y www pasan a pantalay.com con 301                  | servidor                         | ✅                         |
| Verificación por etiqueta `<meta>` y por archivo HTML                            | variable `GOOGLE_VERIFICACION`   | ✅ lista, espera el código |

## Cómo verificar (Richard)

**Recomendado: propiedad de DOMINIO** (cubre pantalay.com, www y todo lo que cuelgue).

1. En Search Console: «Agregar propiedad» → **Dominio** → escribir `pantalay.com`.
2. Google da un registro **TXT** que empieza con `google-site-verification=`.
3. Ponerlo en el DNS de pantalay.com en YaDominios: tipo **TXT**, nombre **@**, valor el que dio Google.
4. Volver a Search Console y tocar **Verificar**. Si dice que no lo encuentra, esperar unos minutos y repetir.

**Alternativa: propiedad con prefijo de URL** (`https://pantalay.com/`), por etiqueta HTML o archivo HTML:
Google da un código. Se guarda en la variable del sitio **GOOGLE_VERIFICACION** (el código de la etiqueta, o el
nombre del archivo `google….html`; varios se separan con coma) y se republica. El servidor pone la etiqueta en la
cabecera de todas las páginas y responde el archivo. Eso lo hago yo con la llave del hosting.

## Después de verificar

1. En **Sitemaps**, enviar `https://pantalay.com/sitemap.xml`.
2. En **Inspección de URLs**, pedir indexación de la portada `https://pantalay.com/` y de `https://pantalay.com/docs`.
3. Si la propiedad vieja de sitios.dev existiera, no hace falta: redirige sola a pantalay.com.

## Cómo se comprueba que sigue bien

- Prueba automática `pruebas/dominio.test.ts` (candados C-DOMINIO y C-GOOGLE).
- A mano: abrir https://pantalay.com/sitemap.xml y https://pantalay.com/robots.txt; ver el código fuente de una guía
  y buscar `canonical` y su título propio.
