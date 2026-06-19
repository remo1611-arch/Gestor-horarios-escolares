# P12-1 · Motor web mínimo acreditado

Estado: `WEB_WORKER_SOLVER_MINIMUM_IMPLEMENTED_FOR_P12_1_SCOPE`.

Esta fase añade una capa explícita `WEB_SOLVER` ejecutada en Web Worker. No requiere Python ni OR-Tools para los proyectos compatibles con P12-1. CP-SAT se conserva como oráculo técnico de comparación, no como dependencia del usuario final.

## Alcance acreditado

- Semana única.
- Actividades de un solo tramo (`durationSlots = 1`).
- No solape de profesorado.
- No solape de grupos.
- No solape/capacidad de espacios.
- Disponibilidad/presencia de docentes ya soportada por el generador web heredado.
- Compatibilidad de espacios por etiquetas y espacios permitidos.
- Colocaciones fijas de un tramo cuando no entran en conflicto.
- Revalidación heredada e independiente antes de aceptar propuestas.

## Fuera de alcance

- Ciclos A/B o personalizados.
- Actividades multitramos.
- Relaciones de actividades, desdobles y simultaneidades.
- Servicios, guardias, segmentos anclados y presencia mínima organizativa 4.1.
- Sustitución del CP-SAT como oráculo.

## Criterio de usuario

Si el proyecto es compatible, el botón ordinario “Generar horario” genera localmente en navegador. Si no es compatible, la app debe bloquear con razón explícita y no degradar silenciosamente a una solución débil.
