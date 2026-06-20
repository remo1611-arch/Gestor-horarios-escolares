# Generador de Horarios Escolares · v1.2.0

## Estado

Candidata funcional centrada en importación CSV y plantillas. No es todavía versión estable final: siguen pendientes QA físico Android/tableta/PC, GitHub Pages real, impresión A4 y prueba privada con datos reales o anonimizados.

## Base técnica

Parte de v1.1.0 y conserva:

- motor incremental de RC1;
- formato `horario-escolar-json-1.6`;
- validación independiente;
- edición segura;
- tramos reales con inicio, fin y duración;
- LD, DC, servicios, subgrupos y docencia compartida;
- carga docente;
- calidad del horario.

## Novedades v1.2

- Nueva sección **Importación CSV**.
- Plantillas descargables para:
  - docentes;
  - grupos y subgrupos;
  - espacios y zonas;
  - tramos horarios;
  - actividades horarias.
- Importación CSV con actualización por nombre.
- Validación de columnas obligatorias.
- Resolución de vínculos por nombre:
  - grupo;
  - docente responsable;
  - docentes acompañantes;
  - espacio.
- Importación de tramos con inicio, fin, duración, tipo de tramo, clase/servicios y permanencia.
- Si se importan tramos, se vacía el horario colocado para evitar huecos incompatibles.
- Nuevas pruebas:
  - `importacion_csv.test.mjs`;
  - `v12_producto.test.mjs`.

## Orden recomendado de importación

1. Docentes.
2. Grupos y subgrupos.
3. Espacios y zonas.
4. Tramos horarios.
5. Actividades.

Las actividades deben ir al final porque dependen de los nombres de docentes, grupos y espacios.

## Limitaciones

- No importa todavía XLSX directamente.
- No importa desde XADE u otra plataforma oficial.
- No resuelve duplicados complejos más allá de actualizar por nombre exacto normalizado.
- No crea automáticamente grupos, docentes o espacios mencionados en actividades si no existen: lo marca como error grave.
- La importación de tramos borra el horario colocado.

## Recomendación de uso

Antes de importar CSV, exporte siempre el proyecto JSON. Después de importar, revise la sección **Asistente → Revisión** y calcule de nuevo.
