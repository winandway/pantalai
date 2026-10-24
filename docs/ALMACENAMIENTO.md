# Almacenamiento de Pantalay: cuánto ocupa, cuánto cuesta y qué hacer

> 20 de octubre de 2026. Fuentes: guía de planes de YaDominios Cloud y la página de precios de Cloudflare R2
> (https://developers.cloudflare.com/r2/pricing/), leídas ese día.

## Hoy

- 29 videos, 16 minutos grabados, unos **160 MB** en total (110 MB de grabaciones originales + 50 MB de copias MP4).
- Se ve en vivo en el superadmin → **Almacenamiento**: el total frente al tope, qué parte son originales, copias MP4 y
  miniaturas, cuánto ocupa cada minuto, cuánto creció en 7 y 30 días, cuántas horas caben todavía, en cuántos días se
  llena al ritmo actual, quién ocupa más y los videos más pesados.

## El tope que hay que vigilar

El sitio `pantalai` está en el plan **Galaxia** de YaDominios Cloud, que trae **20 GB** de almacenamiento.

Cada minuto grabado se guarda dos veces (el original y la copia MP4 que abre el iPhone y YouTube):

| Tipo de grabación                        | Lo que ocupa un minuto (original + MP4) | Horas que caben en 20 GB |
| ---------------------------------------- | --------------------------------------- | ------------------------ |
| Pantalla con poco movimiento (lo de hoy) | ~10 MB                                  | ~33 horas                |
| Uso normal en 1080p                      | ~20–25 MB                               | ~13–16 horas             |
| Mucho movimiento o 4K                    | 40–70 MB                                | 5–8 horas                |

**Conclusión: 20 GB alcanzan para probar y para los primeros clientes, no para crecer.** Con 100 personas grabando
una hora cada una ya se pasa.

## Lo que cuesta de verdad (Cloudflare R2, donde viven los videos)

- Guardar: **0,015 USD por GB al mes**. 1 TB (unas 700–1.000 horas de video) = **15 USD al mes**.
- Ver y descargar los videos: **gratis** (R2 no cobra la salida, que en otros servicios es lo más caro).
- Subidas y lecturas: centavos (4,50 USD por millón de subidas, 0,36 USD por millón de lecturas).

Ejemplo: 1.000 clientes con una hora de video cada uno ≈ 1,2 TB ≈ **18 USD al mes** de almacenamiento. Con un solo
cliente de Business + AI (12 USD al mes) se pagan unos 800 GB. **El almacenamiento es barato; lo único que limita es el
tope del plan del sitio.**

## Decisión (20 oct 2026)

Richard eligió la opción 1: **subir el sitio `pantalai` a 500 GB en YaDominios, cobrando lo que cuesta en Cloudflare.**
✅ Hecho el 24 oct 2026: la sesión de YaDominios dejó el sitio en 500 GB (20 del plan + 480 extra, 7,20 USD al mes) y
aquí se puso `ALMACEN_LIMITE_GB=500`. Uso ese día: unos 950 MB.

## Las opciones que se miraron

1. **Subirle el almacenamiento al sitio `pantalai` en YaDominios** (es nuestra plataforma) a un tope a la medida, por
   ejemplo 500 GB, cobrando lo que cuesta en Cloudflare. Es el camino más simple: no cambia nada en el código.
2. Si no se quiere tocar YaDominios: guardar los videos en un almacén propio de Cloudflare en la cuenta de Windoce.
   Es un cambio en el código y una cuenta más que vigilar.
3. Mientras tanto: el plan gratis ya trae tope (25 videos de 5 minutos, encendido junto con el cobro), y el
   superadmin avisa en amarillo al 70 % y en rojo al 90 %.

Para que el superadmin muestre bien el tope si cambia el plan: variable del sitio `ALMACEN_LIMITE_GB`
(hoy 20; vale 20 si no está).
