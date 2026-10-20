# Superadmin de Pantalay — cómo se usa

> Documento interno (no va en Docs públicas). Hecho el 20 de octubre de 2026.

## Para qué sirve

Ver, antes del lanzamiento y después, **cuántas personas se registraron, qué plan tiene cada una y qué están
grabando**, y poder mirar ese material para comprobar que nada sale mal hecho en el software.

## Cómo se entra

1. Entra a pantalay.com con tu cuenta de Soporte (el correo tiene que estar en la lista del servidor, ver abajo).
2. Abre tu nombre arriba a la derecha y toca **🛡️ Superadmin**. La dirección es `https://pantalay.com/admin`.
3. Si no estás en la lista, la página responde «404», como si no existiera: nadie más se entera de que está ahí.

Quién puede entrar lo decide la variable del sitio **SUPERADMIN_CORREOS** (correos separados por coma) en
YaDominios Cloud. La cuenta tiene que llamarse con la palabra **Soporte** (regla de las cuentas nuestras).

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
