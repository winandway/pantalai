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

## Cómo se prueba (cuando lleguen las claves)

1. Modo de prueba: guardar las claves de prueba en el sitio, crear el aviso (webhook) apuntando a
   `https://pantalay.com/datos/pago/aviso` y guardar su secreto.
2. Comprar Business + AI anual con la tarjeta 4242 4242 4242 4242: el plan debe cambiar a Business + AI en segundos.
3. Repetir con la tarjeta que pide verificación del banco (4000 0025 0000 3155) y con una rechazada (4000 0000 0000 0002).
4. Cancelar desde Stripe: el aviso tiene que devolver la cuenta a Starter.
5. Con las claves reales: una compra real del equipo, ver el cobro en Stripe, el plan activo, y reembolsar.
6. Recién ahí: `COBRO_ACTIVO=1`, la página de precios al menú y al mapa del sitio.

Pruebas automáticas: `pruebas/pagos.test.ts` (Stripe simulado; firma comprobada en rojo).
