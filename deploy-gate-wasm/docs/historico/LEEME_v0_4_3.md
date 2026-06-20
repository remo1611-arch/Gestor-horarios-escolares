# Generador de Horarios Escolares v0.4.3

## Tipo de entrega

Microfase de seguridad de navegación y edición sobre v0.4.2.

No añade motor nuevo, ni nuevas condiciones docentes, ni gestión diaria. Su finalidad es evitar pérdidas accidentales y estados temporales confusos durante la edición.

## Cambios funcionales

- Botón **Cancelar selección** en Revisar y ajustar.
- Limpieza automática de selección al cambiar de sección.
- Limpieza automática de selección al cambiar vista o elemento en el editor.
- Limpieza de selección al tocar una zona no interactiva del editor.
- Tecla Escape para cancelar selección en ordenador.
- Confirmación al cerrar o recargar navegador si hay cambios sin guardar.
- Copia de emergencia al ocultarse la página, cambiar de app o ejecutar `pagehide`.
- Confirmación explícita al recuperar copia anterior o copia de emergencia.
- Confirmación antes de recalcular sobre un horario existente.
- Después de mover una sesión, se cancela la selección para evitar un segundo movimiento accidental.

## Política de seguridad

- Cambiar de pestaña interna no exige confirmación porque no pierde datos.
- Cambiar de pestaña interna sí cancela la edición temporal.
- Las acciones que sustituyen datos o pueden provocar pérdida real piden confirmación.
- La app conserva copia de emergencia cuando hay cambios pendientes y la página se oculta.

## Uso recomendado en Android

1. Toque corto sobre una sesión.
2. Botón **Mover aquí**.
3. Si se equivoca o cambia de idea, use **Cancelar selección** o toque una zona vacía.
4. Guarde o exporte JSON antes de cerrar la app.

## Estado

`0.4.3` sustituye a `0.4.2` como base recomendada para continuar.
