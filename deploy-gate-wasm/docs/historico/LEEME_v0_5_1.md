# Generador de Horarios Escolares v0.5.1

Corrección semántica obligatoria sobre v0.5.0.

## Decisión cerrada

- **DC significa Docencia complementaria**.
- DC agrupa sesiones obligatorias de permanencia en el centro en las que no se imparte clase directa: guardias, tutorías de atención, coordinación, biblioteca, cargos, reuniones, permanencias, entrada/salida/recreo si computan como servicio del docente.
- **Docencia compartida** queda como tipo lectivo independiente: dos o más docentes intervienen en una misma sesión lectiva con grupo.
- **LD** queda como Libre disposición y puede ser lectiva si se imparte con grupo.

## Cambios

- Añadida clasificación horaria `Docencia complementaria`.
- Migración semántica de guardias, coordinación y servicios equivalentes a docencia complementaria.
- Textos visibles corregidos para evitar interpretar DC como docencia compartida.
- Ejemplo complejo actualizado.
- Esquema JSON 1.2.
- Prueba específica `semantica_dc.test.mjs`.

## Estado

Versión correctiva. No añade funcionalidad de motor. Sustituye a v0.5.0 como base semántica.
