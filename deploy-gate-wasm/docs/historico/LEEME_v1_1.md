# Generador de Horarios Escolares · v1.1.0

## Estado

Candidata v1.1 centrada en calidad del horario. No modifica el formato canónico del proyecto, que sigue siendo `horario-escolar-json-1.6`.

## Base

Parte de `v1.0-rc1`, que ya incorporaba motor incremental, corte temporal real, validación final completa y métricas básicas.

## Novedades principales

- Nuevo módulo `assets/js/dominio/calidad_horario.js`.
- Panel visible `Calidad del horario` en Documentos.
- Informe TXT de calidad del horario.
- CSV de calidad del horario.
- Indicadores por docente:
  - huecos;
  - jornadas con huecos;
  - primeras horas;
  - últimas horas;
  - sesiones lectivas;
  - DC;
  - servicios;
  - desequilibrio diario.
- Indicadores por grupo:
  - huecos;
  - jornadas con huecos;
  - primeras horas;
  - últimas horas;
  - desequilibrio diario.
- Resumen global:
  - nivel `Buena`, `Mejorable` o `Revisar`;
  - penalización orientativa;
  - reparto de servicios;
  - reparto de DC;
  - sesiones pendientes.

## Qué no promete

La v1.1 no garantiza horario óptimo. La calidad es orientativa y debe servir para revisar alternativas, detectar problemas visibles y decidir mejoras manuales o nuevos cálculos.

## Dictamen

`CANDIDATA_V1_1_PENDIENTE_QA_FISICO_GITHUB_PAGES_Y_PRUEBA_PRIVADA`.
