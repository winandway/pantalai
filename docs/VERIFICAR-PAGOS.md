# Estado del cobro de Pantalay

> 🟡 **CONECTADO EN VIVO, FALTA EL PRIMER COBRO REAL.** Claves reales puestas el 20 oct 2026, aviso de Stripe creado y
> comprobado (llegó firmado y se procesó). Falta la compra real de Richard. No se anuncia la página de precios ni se
> encienden los límites hasta que esa compra salga bien.

## 🔴 LO QUE FALTA PROBAR (revisado el 8 nov 2026) — NO ANUNCIAR NI ENCENDER `COBRO_ACTIVO`

- 🔴 Ningún cobro real todavía: tarjeta, Apple Pay / Google Pay, prueba de 14 días con cobro al terminar, plan anual
  y cancelar al final del periodo están SIN PROBAR con Stripe real.
- 🔴 `PAGO_DIAS_PRUEBA` sigue en 0 (puesto para el video de la compra de Richard). Después de esa compra hay que
  volverlo a 14; si se enciende el cobro con 0, nadie tendría prueba gratis.
- 🔴 Modo de prueba de Stripe: NO se usa (decisión de Richard del 20 oct 2026: solo en vivo). No hay claves de prueba
  guardadas; la única prueba sin dinero real es la automática con Stripe simulado (`pruebas/pagos.test.ts`, verde).
- ✅ Construido: suscripción mensual y anual, prueba de 14 días configurable, aviso firmado (sin firma = 400) y canario
  `/datos/salud` → `pago.listo: true` (comprobado en vivo el 8 nov 2026).

## 🎬 GUION DE LA COMPRA REAL DE RICHARD (5 pasos, listo el 8 nov 2026)

Estado comprobado el 8 nov 2026 antes del guion: aviso de Stripe **activo** hacia `https://pantalay.com/datos/pago/aviso`
(suscripción creada, cambiada y borrada, factura pagada y pago fallido); precio de fundador Business + AI mensual
(12 USD) activo en Stripe; aviso sin firma → 400; canario `pago.listo: true`; `PAGO_DIAS_PRUEBA=0` (cobra en el
momento, para el video).

1. **Richard (grabando la pantalla):** entra a `https://pantalay.com` con su cuenta y abre `https://pantalay.com/pricing`.
2. **Richard:** elige **Business + AI · mensual (12 USD)**, toca el botón del plan y escribe su tarjeta en el cuadro de
   Stripe que aparece DENTRO de Pantalay. Confirma.
3. **Richard:** espera unos segundos y abre «Mi cuenta»: tiene que decir Business + AI activo, con fecha de renovación.
   Ahí termina el video.
4. **IA (yo), en cuanto avise:** compruebo en Stripe el cobro de 12 USD, la factura enviada y la suscripción `active`;
   en Pantalay el plan activo y en el superadmin la cuenta con Business + AI. Vuelvo `PAGO_DIAS_PRUEBA` a 14 y
   republico. Anoto fecha y compra en la tabla de abajo.
5. **Richard + IA:** en «Mi cuenta» Richard toca «Cancelar plan» (Stripe debe decir «cancela el <fecha>») y luego
   «Mantener mi plan» (vuelve a renovar). Con eso en verde y su sí: `COBRO_ACTIVO=1`, la página de precios al menú y
   se quita el noindex. Anual, Apple Pay / Google Pay y la prueba de 14 días siguen en rojo hasta que una compra
   real los use.

## Comprobado en vivo el 20 oct 2026 (sin cobrar)

- Las claves funcionan; la página crea sola el producto y el precio de fundador (Business + AI mensual, 12 USD:
  `pantalay_business_ia_mensual_fundador`).
- El cuadro de la tarjeta (Payment Element) se abre DENTRO de pantalay.com con la cuenta real (tarjeta y cuenta
  bancaria de EE. UU.).
- Aviso (webhook) `we_1USmD0LDByFATg8RqtBB0vMe` → `https://pantalay.com/datos/pago/aviso`, eventos de suscripción.
  Stripe mandó el aviso real de una suscripción incompleta, la firma se validó y la cuenta quedó «inactiva» (correcto:
  no se pagó). Esa suscripción de prueba se canceló.
- Sin firma, el aviso responde 400.
- `PAGO_DIAS_PRUEBA=0` puesto para la compra del video de Richard. **Después de esa compra, volver a 14.**
- La cuenta de Stripe es la de Windoce, LLC y la comparten otros negocios: no se toca ningún otro aviso ni producto.

## Agregado el 21 oct 2026 (probado con Stripe simulado, SIN probar con Stripe real)

- Una sola suscripción por persona: cambiar de plan modifica la misma suscripción con prorrateo (no crea otra).
- El aviso lee siempre la suscripción fresca en Stripe y descarta los eventos de suscripciones viejas.
- «Mi cuenta»: cancelar al final del período y «Mantener mi plan» (deshace la cancelación).
- Borrar la cuenta cancela la suscripción en Stripe al momento; si Stripe no responde, la cuenta NO se borra.
- Cómo se prueba en vivo después de la compra de Richard: en Mi cuenta tocar Cancelar plan (en Stripe debe verse
  «cancela el <fecha>»), luego Mantener mi plan (vuelve a renovar). El borrado se prueba con una cuenta «Soporte E2E».

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
