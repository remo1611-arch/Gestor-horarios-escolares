# Generador de Horarios Escolares v0.4.2

## Dictamen

La v0.4.1 no debe considerarse base válida para Android/tablet: la corrección de pulsación prolongada cancelaba `touchstart`, y en Chrome Android esa cancelación puede impedir el `click` ordinario. El resultado es que el editor táctil puede dejar de seleccionar o mover sesiones.

## Corrección aplicada

- Se elimina la cancelación de `touchstart`.
- `touchstart` pasa a ser no bloqueante y pasivo.
- Se bloquean solo `contextmenu` y `dragstart` en dispositivos táctiles.
- La edición móvil queda como: toque corto sobre sesión + botón “Mover aquí”.
- El arrastre sigue desactivado en Android/tablet y disponible solo en ordenador con puntero fino.

## Estado

Corrección mínima sobre v0.4.1. No añade funciones nuevas.
