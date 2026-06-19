# P12-5 · Motor web para centro medio compatible

P12-5 amplía el motor web hacia un caso medio de centro, sin convertirlo todavía en motor universal.

## Acreditado

- Generación local en navegador con `WEB_SOLVER`.
- Sin Python, OR-Tools ni backend para el caso compatible.
- Ejemplo `P12_WEB_MEDIUM` con 5 grupos, 8 docentes, 8 espacios y servicios organizativos simples.
- Validación independiente posterior.

## No acreditado

- Frián real completo.
- Multitramos, ciclos A/B, sedes, desplazamientos, recursos, desdobles y servicios complejos.
- Paridad real con CP-SAT ejecutada en Windows.

## Regla de producto

El usuario sigue viendo una sola acción: `Generar horario`. Si el proyecto es compatible, genera en navegador. Si no lo es, debe bloquearse con explicación y no degradarse silenciosamente.
