# Superadmin de Pantalay — cómo se usa

> Documento interno (no va en Docs públicas). Hecho el 20 de octubre de 2026.

## Para qué sirve

Ver, antes del lanzamiento y después, **cuántas personas se registraron, qué plan tiene cada una y qué están
grabando**, y poder mirar ese material para comprobar que nada sale mal hecho en el software.

## Cómo se entra

1. Entra a pantalay.com con tu cuenta (la que está en la lista del servidor) por la página normal de **Entrar**.
2. Al entrar, Pantalay te lleva **solo** a la dirección secreta del panel. También está en tu menú de arriba a la
   derecha, «🛡️ Superadmin», que solo ve el superadmin.
3. La dirección secreta NO está en el código, ni en git, ni en este documento. Vive en la variable secreta del sitio
   **SUPERADMIN_RUTA** y, como respaldo, en la carpeta privada de la computadora (`~/.config/pantalai/superadmin-ruta`).

## Seguridad (por qué nadie más entra)

| Capa                            | Qué hace                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dirección secreta               | El panel solo existe en una dirección larga que no se publica. `/admin` y cualquier otra dirección bajo `/panel/` responden «404», igual que una página que no existe |
| Cuenta de la lista              | Además hay que tener la sesión abierta de un correo de **SUPERADMIN_CORREOS**                                                                                         |
| Doble comprobación en los datos | Cada pedido de datos del panel manda la dirección secreta y el servidor la compara (en tiempo fijo). Sin ella: 404                                                    |
| Videos privados                 | Se ven solo con una firma del día que da el panel; la sesión sola no alcanza                                                                                          |
| Límite de intentos              | Quien golpea la puerta muchas veces queda frenado (429)                                                                                                               |
| Registro                        | Cada intento fallido (con su dirección de internet), cada video mirado y cada video sacado del aire quedan anotados y se ven en el panel                              |
| Sin rastro                      | La página del panel no se guarda en caché, no la indexa Google y no manda su dirección a otros sitios                                                                 |

## Qué se ve y qué puedes hacer

| Pestaña               | Qué tiene                                                                                                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cifras de arriba      | Usuarios (y nuevos esta semana), videos, minutos grabados con el espacio que ocupan y cuántas cuentas hay en cada plan                                                                                                                                                 |
| **Usuarios**          | Nombre, correo, plan, videos, minutos, alta y último video. Buscador. **Toca el nombre para abrir su ficha**                                                                                                                                                           |
| **Videos**            | Todos los videos con miniatura, dueño, fecha, tamaño y si es privado. Toca la miniatura para mirarlo aunque sea privado                                                                                                                                                |
| **Moderación**        | Los videos que todavía nadie revisó, del más nuevo al más viejo. En los tres puntos: marcar como revisado, ver la ficha del dueño, sacar del aire o **borrar** (pide confirmación; no se puede deshacer)                                                               |
| **Pagos**             | Ingreso mensual (MRR), cuántos pagan, cuántos están en prueba gratis, cuántos tienen el pago atrasado o sin terminar, cuántos cancelaron y cuántos están en el plan gratis. Cada cliente con plan, estado, monto, fecha de renovación y el enlace a su ficha en Stripe |
| **Seguridad**         | Bloquear una dirección IP con motivo; la lista de bloqueadas (desbloquear con un toque) y las direcciones que más golpean la puerta del panel                                                                                                                          |
| Registro de actividad | Todo lo que se hace en el panel: quién miró, revisó, sacó del aire, borró, suspendió, bloqueó, y cada intento sin permiso                                                                                                                                              |

## La ficha del cliente

Plan y estado del pago (con los enlaces a su cliente y su suscripción en Stripe), cuántos videos tiene y cuánto ocupan,
**todo lo que grabó** (tocar para mirarlo) y sus **últimos 30 accesos** con fecha, dirección IP, país y navegador.

- **Suspender la cuenta** (tres puntos de arriba, con motivo): no puede entrar, se le cierran las sesiones y TODOS sus
  videos salen del aire. **Reactivar** la deja entrar otra vez y sus videos vuelven a estar como estaban.
- **Bloquear una IP** desde sus accesos (tres puntos de cada fila): nadie desde esa dirección puede usar Pantalay.
  Tu propia dirección nunca se puede bloquear.

## Cobros, devoluciones y cancelaciones

Se hacen en Stripe, con los enlaces de la ficha o de la pestaña Pagos. El panel solo muestra: el dinero tiene un solo
lugar de verdad.

## Lo que NO hace (a propósito)

- No borra cuentas: se suspenden. Borrar un video sí se puede (contenido prohibido), con confirmación y queda anotado.
- No cambia planes a mano: el plan pagado solo lo enciende Stripe (ver `docs/VERIFICAR-PAGOS.md`).

## Cómo se comprueba que sigue bien

- Prueba automática «C-SUPERADMIN» en `pruebas/servidor.test.ts`: una cuenta normal recibe 404, el superadmin ve
  usuarios, planes y videos (también privados), y mirar y sacar del aire quedan en el registro.
