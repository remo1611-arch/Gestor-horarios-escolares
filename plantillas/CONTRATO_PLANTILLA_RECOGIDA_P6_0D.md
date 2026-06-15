# Contrato de la plantilla de recogida P6-0D

## Estado

`P6-0D_CERRADA_CON_RESERVA_DE_IMPORTADOR`

`PUBLICACION_PUBLICA_NO_AUTORIZADA`

## Objeto

La plantilla XLSX es una fuente de entrada normalizada para recopilar datos
organizativos. No es un proyecto `.ghfproject`, no contiene el horario
resultante y no ejecuta el motor.

P6-0E será la única fase autorizada para convertir una plantilla validada en
un contenedor `ghf_project_1.0`.

## Reglas

1. Una fila representa una entidad o relación.
2. Los códigos son únicos, estables y no dependen del nombre visible.
3. Las referencias se realizan por código.
4. Los campos con `*` son obligatorios cuando la fila está en uso.
5. `SI/NO` se transforma en booleanos.
6. `parametros_json` debe ser un objeto JSON válido.
7. Las filas vacías se ignoran.
8. Las observaciones `staging-only` no crean una segunda autoridad.
9. Ninguna ausencia se completa silenciosamente.
10. La plantilla real se considera privada.

## Incluye

Identidad, centro, curso, días, tramos, grupos, profesorado, especialidades,
reducciones, roles, materias, espacios, necesidades, requisitos,
disponibilidad, actividades organizativas, restricciones y configuración.

## Excluye

Sesiones colocadas, candidatos, aceptaciones, snapshots, trazabilidad de
ejecución, DocumentModel, HTML, PDF, CSV, XLSX derivados y estado visual.

## Invariantes

La importación futura mantendrá:

- `directWriteAllowed=false`;
- vista previa obligatoria;
- aceptación explícita;
- reparación sobre copia;
- bloqueo de conflictos duros;
- revalidación de borradores importados;
- ausencia de colocación automática.
