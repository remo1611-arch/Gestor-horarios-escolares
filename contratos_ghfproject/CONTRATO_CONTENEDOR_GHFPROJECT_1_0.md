# CONTRATO DEL CONTENEDOR `.ghfproject` 1.0

## 1. Estado y alcance

Este contrato formaliza P6-0B sin modificar la aplicación P5-4.2. Define el archivo privado de proyecto que P6-0C deberá implementar.

Estado de P6-0B: `P6-0B_CERRADA_CON_RESERVA_DE_PUBLICACION`.

Estado de publicación: `PUBLICACION_PUBLICA_NO_AUTORIZADA`.

## 2. Naturaleza del archivo

`*.ghfproject` es un ZIP sin cifrado interno, macros, ejecutables, enlaces simbólicos ni rutas absolutas. El archivo es privado cuando contiene datos reales. La extensión no cambia la naturaleza ZIP ni sustituye las políticas de custodia.

## 3. Estructura contractual

```text
<proyecto>.ghfproject
├── envelope.json                         obligatorio
├── project.json                          obligatorio
├── manifest.sha256                       obligatorio
├── snapshots/                            opcional
│   ├── index.json
│   └── <snapshotId>.json
├── traceability/                         obligatorio
│   ├── index.json
│   ├── lineage.json                      opcional
│   ├── audit.jsonl
│   ├── acceptance/<receiptId>.json       opcional
│   └── generation/<requestId>/
│       ├── summary.json                  obligatorio por generación
│       ├── request.json                  opcional
│       └── response.json                 opcional
└── extensions/                           opcional
    ├── source-import/
    └── p5-legacy/
```

## 4. Autoridades únicas

- `project.json:schedule.sessions[]` es la única autoridad de sesiones, colocaciones y bloqueos.
- `teachingNeeds[]` es la autoridad de demanda curricular, apoyos y docencia compartida.
- `organizationalActivities[]` es la autoridad de reuniones, recreos, coordinaciones, guardias y actividades no curriculares.
- `teachers[]` es la autoridad de identidad funcional, empleo, carga, reducciones y roles docentes.
- `constraints[]` es la autoridad de restricciones; `solverConfiguration` no debe duplicarlas.
- `snapshots/` conserva estados históricos, pero ningún snapshot sustituye al proyecto activo hasta restauración explícita y guardado en copia.
- `traceability/` documenta decisiones y linaje; no modifica el proyecto.

Quedan prohibidos bloques paralelos como `acceptedAssignments`, `locks`, `staffingPlan` autoritativo o una segunda lista de sesiones.

## 5. Invariantes obligatorios

```text
directWriteAllowed = false
previewRequired = true
explicitAcceptanceRequired = true
repairCreatesCopy = true
blockHardConflicts = true
importedDraftRequiresRevalidation = true
automaticPlacement = false
```

Abrir o migrar un proyecto no cambia `updatedAt`, no sobrescribe el archivo y no escribe en `localStorage` de forma silenciosa.

## 6. Privacidad

- El sobre declara si contiene datos personales.
- Si `containsPersonalData=true`, `publicReleaseAllowed` debe ser `false`.
- Los fixtures de P6-0B son inequívocamente sintéticos.
- Los archivos reales, exportaciones, capturas, logs y evidencias no pueden incorporarse a un repositorio público.
- El cifrado no forma parte del schema 1.0; debe resolverse mediante custodia externa, almacenamiento cifrado o una fase posterior específica.

## 7. Snapshots

- Máximo contractual recomendado de 10 snapshots automáticos no fijados.
- Los manuales, de aceptación, migración o fijados no se eliminan automáticamente.
- La eliminación exige acción explícita y evento de trazabilidad.
- Restaurar crea primero un snapshot `RESTORE_SAFETY`.

## 8. Trazabilidad

Cada generación conserva obligatoriamente un `summary.json` con hashes, backend, semilla, estado y métricas. Los payloads completos son opcionales; para resultados aceptados se conservan por defecto salvo decisión explícita y documentada.

Toda aceptación o rechazo debe producir un recibo. La aceptación genera una copia; nunca modifica directamente el proyecto de origen.

## 9. Extensiones

- Las extensiones opcionales desconocidas se preservan byte a byte y se muestran como advertencia.
- Una capacidad obligatoria desconocida provoca rechazo antes de leer `project.json`.
- Las extensiones legacy no son autoridades y no pueden contradecir el núcleo.
- Un dato legacy solo pasa al núcleo mediante migración explícita, validada y trazada.

## 10. Salidas excluidas

No se persisten DocumentModel, HTML, PDF, CSV, XLSX, vistas, filtros, pila deshacer/rehacer, caches, métricas regenerables ni archivos de trabajo del servidor. Se regeneran desde el proyecto y la trazabilidad.

## 11. Relación con P5-4.2

El mapeo de los 54 bloques observados está en `MAPEO_P5_4_2_A_GHFPROJECT_1_0.csv`. Los 43 registros `PENDIENTE_DECISION` quedan resueltos en `RESOLUCION_43_PENDIENTES_P6_0B.csv`.

## 12. Implementación posterior

P6-0C deberá implementar lectura, validación, migración en memoria, comparación semántica, guardado y roundtrip 1:1. Este paquete no modifica código funcional ni autoriza P6-0C.
