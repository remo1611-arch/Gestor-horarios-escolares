# Contrato documental P5-4.0

## Principio rector

Todos los documentos consumen exclusivamente `ghf_document_model_1.0`. Ninguna salida recalcula el horario mediante una ruta paralela.

## Fuentes canónicas

- calendario: `dias` y `tramos`;
- entidades: `grupos`, `docentes` y `espacios`;
- asignaciones: `sesiones`;
- participantes: `sessionTeacherIds`;
- validación: `structuralPrevalidation` y `scheduleValidation`;
- capacidad: `teacherCapacityRows`;
- calidad: fotografía canónica disponible en el proyecto;
- trazabilidad: metadatos, hashes, linaje y auditoría.

## Documentos incluidos

Horario general, grupo, docente, espacio, recreos, reuniones, apoyos, equipo directivo, validación, calidad, trazabilidad y dossier técnico.

## Salidas

- vista HTML integrada;
- HTML autónomo;
- impresión/PDF mediante navegador;
- JSON documental y DocumentModel;
- CSV de consulta.

El XLSX nativo no forma parte de P5-4.0; deberá construirse más adelante como consumidor del mismo DocumentModel.

## Datos sintéticos

Toda salida derivada de un escenario sintético debe mostrar de forma visible `ESCENARIO SINTÉTICO DE VALIDACIÓN` y `NO CORRESPONDE A UN HORARIO REAL DE CENTRO`.

## Invariantes

1. Cero escritura directa sobre el proyecto desde el módulo documental.
2. Cero modificación del motor o de las asignaciones.
3. Cada sesión fuente aparece una sola vez en `DocumentModel.sessions`.
4. Las actividades multipersona aparecen en todos los horarios docentes afectados sin duplicarse en la fuente.
5. Espacios presentes en sesiones, aunque sean especiales, se incorporan al catálogo documental.
6. La orientación y el formato son propiedades del documento, no del motor.
