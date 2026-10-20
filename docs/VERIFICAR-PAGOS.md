# Estado del cobro de Pantalay

> 🔴 **EL CIRCUITO DE PAGOS NO ESTÁ PROBADO.** Está construido, pero no hay claves de Stripe todavía. No se anuncia
> la página de precios ni se manda a nadie a pagar hasta completar la tabla de abajo.

## Cómo funciona

- La tarjeta se escribe DENTRO de Pantalay, en el cuadro seguro de Stripe (Payment Element). Nadie sale a otra página.
- `POST /datos/pago/suscripcion` crea (o reutiliza) el cliente, busca o crea el precio de fundador y crea la
  suscripción «incompleta». La página confirma la tarjeta (con prueba de 14 días se guarda la tarjeta y se cobra al
  terminar la prueba; sin prueba se cobra al momento).
- El plan se enciende SOLO con el aviso firmado de Stripe (`POST /datos/pago/aviso`, eventos
  `customer.subscription.created`, `.updated` y `.deleted`). Sin firma válida no se toca nada.
- Precios de fundador (por usuario): Business 9 USD al mes o 90 al año; Business + AI 12 USD al mes o 120 al año.
  Se crean solos en Stripe la primera vez, con llaves `pantalay_<plan>_<ciclo>_fundador`.
- Variables del sitio: `STRIPE_SECRETA` (clave restringida rk_), `STRIPE_PUBLICABLE` (pk_) y
  `STRIPE_WEBHOOK_SECRETO` (whsec_). Canario: `/datos/salud` → `pago.listo`.
- Los límites de los planes se encienden aparte con `COBRO_ACTIVO=1`, recién con todo esto probado.

## Prueba por método y moneda

| Método                                           | Moneda | Modo de prueba | Compra real   | Fecha y con qué compra |
| ------------------------------------------------ | ------ | -------------- | ------------- | ---------------------- |
| Tarjeta (Payment Element)                        | USD    | ❌ sin probar  | ❌ sin probar | —                      |
| Apple Pay / Google Pay (dentro del mismo cuadro) | USD    | ❌ sin probar  | ❌ sin probar | —                      |
| Prueba gratis 14 días y cobro al terminar        | USD    | ❌ sin probar  | ❌ sin probar | —                      |
| Cancelar al final del periodo                    | USD    | ❌ sin probar  | ❌ sin probar | —                      |

## Cómo se prueba (decidido por Richard el 20 oct 2026)

**Solo en vivo, con la clave REAL de Stripe. No se usa modo de prueba.**

1. Guardar la clave restringida real (rk_live) y la publicable (pk_live) en las variables del sitio, crear el aviso
   (webhook) apuntando a `https://pantalay.com/datos/pago/aviso` y guardar su secreto.
2. Richard hace una compra real de **un mes** (Business + AI mensual, 12 USD, o Business, 9 USD) con su tarjeta, y la
   graba en video para mostrarle a la gente cómo se paga.
   Ojo: la primera suscripción de cada cuenta trae 14 días gratis y ese día no cobra. Para que el video muestre el
   cobro del mes en el momento, antes de la compra se pone la variable del sitio `PAGO_DIAS_PRUEBA=0` (y después se
   vuelve a 14 o se borra).
3. Comprobar: el cobro (o la tarjeta guardada) en el panel de Stripe, el plan activo en Pantalay y en el superadmin,
   y la factura enviada por Stripe.
4. Cancelar al final del periodo desde Stripe y ver que el aviso devuelve la cuenta a Starter cuando termina.
5. Anotar fecha y compra en la tabla de arriba. Recién ahí: `COBRO_ACTIVO=1` y la página de precios al menú.

Pruebas automáticas: `pruebas/pagos.test.ts` (Stripe simulado; firma comprobada en rojo).
