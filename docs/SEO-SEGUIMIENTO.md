# Seguimiento de SEO de Pantalay

> Pedido de Richard el 9 nov 2026: «que no hagamos esta actualización hoy y la dejemos tirada; esto requiere
> seguimiento y mantenimiento». Este documento dice qué se revisa, cada cuánto y cómo saber si vamos bien.

## Punto de partida (9 nov 2026)

- Google Search Console verificado (dominio `pantalay.com`).
- `https://pantalay.com/sitemap.xml`: Correcto, 97 páginas descubiertas.
- `https://pantalay.com/video-sitemap.xml`: Correcto, 5 páginas y 5 videos descubiertos.
- Hecho ese día: español con su dirección `/es`, hreflang, títulos con palabras clave, 4 páginas por búsqueda,
  red de videos (`/videos`, Shorts, `VideoObject`), robots.txt dejando leer miniaturas y videos.
- Candados: C-SEO-IDIOMAS, C-RED-VIDEOS, C-VIDEO-SITEMAP (en `CANDADOS.md`).

## Cada lunes, 9:00 (automático): revisión técnica

La hace una tarea programada («Pantalay · revisión técnica de SEO»). Solo lee; no cambia nada.

1. Las páginas clave responden 200: `/`, `/es`, las 4 páginas por búsqueda en los dos idiomas, `/docs`, `/es/docs`,
   `/videos`, `/es/videos`, `/sitemap.xml`, `/video-sitemap.xml`, `/robots.txt`.
2. `robots.txt` sigue con `Allow: /media/*/miniatura`, `Allow: /media/*/video` y las dos líneas `Sitemap:`.
3. Las páginas en español traen `<html lang="es">` y hreflang; ninguna página pública trae `noindex` por error.
4. Cada video del mapa de videos abre su página con `VideoObject` y su miniatura responde 200.
5. `/datos/salud` responde y su commit es el de `main`.
6. Si algo falla: se dice en una línea qué y dónde, y se arregla en la sesión de PANTALAI (es un candado roto).

## Primer lunes de cada mes (recordatorio): revisión de resultados

Esto necesita los números de Google Search Console (los ve Richard con su cuenta, o se le da acceso de lectura a la
IA más adelante). Se miran los últimos 28 días contra los 28 anteriores:

| Qué se mira             | Dónde (Search Console)               | Vamos bien si…                                  |
| ----------------------- | ------------------------------------ | ----------------------------------------------- |
| Clics e impresiones     | Rendimiento → Resultados de búsqueda | Suben mes a mes (al principio, las impresiones) |
| Búsquedas que nos traen | Rendimiento → Consultas              | Aparecen «grabar pantalla», «screen recorder»…  |
| Páginas que más crecen  | Rendimiento → Páginas                | Las 4 páginas por búsqueda empiezan a aparecer  |
| Páginas indexadas       | Indexación → Páginas                 | Casi todas las del mapa del sitio, indexadas    |
| Videos indexados        | Indexación → Vídeos                  | Los videos publicados aparecen como indexados   |
| Errores                 | Indexación y Experiencia             | Cero errores nuevos                             |

Con eso se decide el trabajo del mes: escribir páginas nuevas para las búsquedas que asoman, mejorar el título y la
descripción de las páginas con muchas impresiones y pocos clics, y corregir lo que Google marque.

## Qué esperar (para no desesperar)

- Semanas 1 a 4: Google descubre e indexa; casi no hay clics.
- Semanas 4 a 12: empiezan las impresiones en búsquedas de cola larga («grabar pantalla y cámara gratis»).
- Mes 3 en adelante: clics constantes si se sigue publicando (videos en la red y guías nuevas).
- Lo que más ayuda: publicar videos en la red seguido (cada uno es una página nueva que Google puede mostrar) y
  conseguir enlaces desde otros sitios (redes, directorios de herramientas, artículos).
