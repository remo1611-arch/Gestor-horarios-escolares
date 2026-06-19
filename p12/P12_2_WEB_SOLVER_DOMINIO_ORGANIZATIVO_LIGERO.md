# P12-2 · Motor web con dominio organizativo ligero

P12-2 amplía P12-1 sin sustituir CP-SAT como oráculo. El objetivo es que la acción ordinaria **Generar horario** pueda resolver en navegador proyectos con una capa organizativa ligera.

## Cubierto

- Semana única.
- Sesiones de un tramo.
- No solape de profesorado, grupo y espacio.
- Disponibilidad/presencia docente.
- Compatibilidad de espacios.
- Colocaciones fijas de un tramo.
- Presencia mínima simple.
- Límite básico de LD simultánea.
- Reglas duras: FORBID_DAY, FORBID_SLOT, REQUIRE_DAY, REQUIRE_SLOT, REQUIRE_SPACE_TAG.
- Preferencias: PREFER_DAY, PREFER_SLOT, AVOID_FIRST/LAST/EDGE_SLOTS.
- Relaciones inmediatas simples: IMMEDIATELY_BEFORE e IMMEDIATELY_AFTER.

## No cubierto

- Frián real completo.
- Multitramos.
- Ciclos A/B o semanas personalizadas.
- Multisedes, desplazamientos y viajes.
- Recursos de dominio.
- Desdobles/simultaneidades.
- Servicios organizativos configurables.
- Segmentos anclados.
- Vigilancias de recreo por zonas.
- Exactitud de carga docente como cierre oficial.

## Regla de seguridad

Si un proyecto sale del alcance P12-2, el motor web debe declararlo no soportado y no debe generar una solución aparentemente completa.
