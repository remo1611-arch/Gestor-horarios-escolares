# Fase 4B · Objetivo lexicográfico CP-SAT

## Alcance

Fase experimental aislada. No sustituye el motor JavaScript actual y no conecta el botón ordinario **Calcular horario** al motor OR-Tools.

## Cambio técnico

Se añade un resolver CP-SAT de dos etapas:

1. **Cobertura**: maximiza sesiones colocadas, sin sacrificar sesiones por calidad.
2. **Calidad**: fija una cobertura mínima y optimiza huecos docentes, huecos de grupo, últimas horas y desequilibrio docente básico.

## Decisión de seguridad

La carga docente objetivo sigue siendo diagnóstico. No se convierte en restricción dura porque en v1.4.1 no bloquea el cálculo.

## Gate

La sustitución solo podría reabrirse si la validación cruzada cumple simultáneamente:

- 7/7 ejemplos sin errores graves.
- 0 ejemplos con menos sesiones que el motor actual.
- 0 ejemplos con peor penalización de calidad que el motor actual.
- QA navegador físico, Android, tableta, PC y GitHub Pages.

## Dictamen de esta fase

Consultar `evidencias/evidencia_fase4b_validacion_cruzada_ejemplos.json`.
