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

## Qué se ve

| Parte                             | Qué muestra                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cifras de arriba                  | Usuarios (y cuántos nuevos esta semana), videos, minutos grabados con el espacio que ocupan, y cuántas cuentas hay en cada plan                                                            |
| Pestaña Usuarios                  | Nombre, correo, plan, cuántos videos tiene, minutos grabados, cuándo se registró y su último video. Buscador por nombre o correo. Tocar el número de videos abre los videos de esa persona |
| Pestaña Videos                    | Miniatura, título, dueño, cuándo, tamaño, si es privado o con enlace. Tocar la miniatura lo reproduce ahí mismo, aunque sea privado                                                        |
| Menú de tres puntos de cada video | **Mirar** y **Sacar del aire (hacer privado)**: el enlace deja de funcionar para todos menos su dueño. No se borra nada                                                                    |
| Registro de actividad             | Cada video que miras y cada video que sacas del aire queda anotado con fecha y quién lo hizo                                                                                               |

## Lo que NO hace (a propósito)

- No borra videos ni cuentas: borrar datos de un cliente es una decisión de Richard, caso por caso.
- No cambia planes a mano: el plan pagado solo lo enciende Stripe (ver `docs/VERIFICAR-PAGOS.md`).

## Cómo se comprueba que sigue bien

- Prueba automática «C-SUPERADMIN» en `pruebas/servidor.test.ts`: una cuenta normal recibe 404, el superadmin ve
  usuarios, planes y videos (también privados), y mirar y sacar del aire quedan en el registro.
