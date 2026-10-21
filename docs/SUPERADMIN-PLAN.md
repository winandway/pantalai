# Superadmin de Pantalay: qué hay, qué faltaba y qué se construye

> 20 de octubre de 2026. Revisión hecha con REA sobre NUESTRO panel (evidencia
> `ev_f9fe57da17806f5944d633483cd53efc0a606cc95e89ceec1cc5a73e8b467b5f`).

## Lo que REA encontró en el panel

- Cifras: usuarios, videos, minutos grabados y cuántas cuentas hay por plan.
- Pestaña Usuarios (tabla: nombre, correo, plan, videos, minutos, alta, último video) con buscador.
- Pestaña Videos: mirar (aunque sea privado) y sacar del aire.
- Registro de actividad.

## Lo que faltaba para operar

| #   | Necesidad de Richard                               | Qué se construye                                                                                                                                                                                                                         |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ver quién pagó, quién no y cuánto entra            | Pestaña **Pagos**: cuántos pagan, en prueba, con pago fallido, cancelados y gratis; ingreso mensual (MRR); cada cliente con su plan, monto, próxima renovación y enlace directo a Stripe                                                 |
| 2   | Entrar dentro de un cliente y ver todo lo que creó | **Ficha del cliente**: datos, plan y estado del pago, todos sus videos (mirarlos aunque sean privados), espacio usado, sus accesos (fecha, dirección IP, país, navegador)                                                                |
| 3   | Suspender a quien grabe cosas prohibidas           | **Suspender / reactivar cuenta**: no puede entrar, se le cierran las sesiones y todos sus videos salen del aire; al reactivar vuelven como estaban. Con motivo, queda en el registro                                                     |
| 4   | Bloquear una dirección IP                          | Pestaña **Seguridad**: bloquear y desbloquear IP con motivo; lista de IP que más golpean la puerta del panel; desde la ficha se bloquea con un toque. La IP bloqueada no puede usar Pantalay (el superadmin nunca se bloquea a sí mismo) |
| 5   | Revisar a todo el mundo                            | Pestaña **Moderación**: los videos que todavía nadie revisó, del más nuevo al más viejo; marcar «Revisado, está bien», sacar del aire o **borrar** (borrar va dentro de los tres puntos y pide confirmación)                             |

Todo queda en el registro de actividad: quién suspendió, bloqueó, revisó o borró, y cuándo.

## Lo que NO se hace desde aquí (a propósito)

- Cobrar, devolver dinero o cancelar suscripciones: se hace en Stripe (la ficha trae el enlace directo al cliente
  y a la suscripción). Así el dinero tiene un solo lugar de verdad.
