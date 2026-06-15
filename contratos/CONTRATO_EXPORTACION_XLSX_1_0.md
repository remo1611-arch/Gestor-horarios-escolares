# Contrato de exportación XLSX · P5-4.2

## Finalidad

Añadir una salida Excel 365 de consulta y auditoría sin convertir Excel en un segundo motor de horarios.

## Fuente única

```text
Proyecto activo
      ↓
ghf_document_model_1.0
      ↓
XLSX
```

El exportador no consulta directamente las tablas internas del editor y no recalcula sesiones, capacidades, conflictos ni calidad.

## Invariantes

1. El cuerpo recibido debe declarar `schemaId = ghf_document_model_1.0`.
2. La exportación no modifica el proyecto, la auditoría ni el almacenamiento local.
3. El XLSX contiene valores de consulta; no contiene fórmulas de generación del horario.
4. Las 502 sesiones se exportan una sola vez en `Sesiones`.
5. Las actividades multipersona conservan todos los docentes en una misma fila fuente.
6. Los subconjuntos `Recreos`, `Reuniones` y `Apoyos` proceden de las colecciones del DocumentModel.
7. La naturaleza sintética, provisional o real debe figurar en todas las hojas.
8. El servidor genera el archivo localmente y no envía datos a servicios externos.
9. El generador XLSX usa únicamente la biblioteca estándar de Python.
10. Si el servidor no está activo, el usuario puede exportar el DocumentModel y ejecutar el CLI incluido.

## Hojas

- Resumen
- Grupos
- Docentes
- Espacios
- Sesiones
- Recreos
- Reuniones
- Apoyos
- Equipo_directivo
- Validacion
- Calidad
- Trazabilidad

## Fuera de alcance

- edición masiva del proyecto desde el XLSX;
- importación automática del XLSX exportado;
- recalcular el solver en Excel;
- macros, VBA o conexiones externas;
- formato definitivo del centro real antes de disponer de sus datos.
