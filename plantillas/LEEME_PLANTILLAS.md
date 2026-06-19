# Plantillas de importación profesional · A4

Estas plantillas contienen exclusivamente datos sintéticos neutros. Su finalidad es mostrar el orden de carga y el contrato de columnas; no representan un centro real.

## Orden recomendado

1. `01_materias.csv`
2. `02_docentes.csv`
3. `03_grupos.csv`
4. `04_espacios.csv`
5. `05_actividades.csv`
6. `06_disponibilidad.csv`

## Reglas de uso

- **Código** es un identificador externo estable. Permite actualizar un registro aunque cambie su nombre visible.
- **Procedencia** debe identificar el documento, acuerdo o matriz de donde procede el dato.
- **Vigente_desde** y **Vigente_hasta** usan `AAAA-MM-DD`.
- **Verificado_por** y **Fecha_verificacion** acreditan la revisión humana; no sustituyen la aceptación del horario.
- Los valores múltiples se separan con `|`.
- Las franjas se expresan como `DIA:TRAMO`, por ejemplo `MON:S1`.
- La aplicación presenta una vista previa, detecta referencias, duplicados, coincidencias ambiguas y avisos. Nada se aplica hasta seleccionar las filas y confirmar.
- El modo **actualización segura** busca primero por código y, si no existe, por nombre inequívoco. El modo **solo altas** rechaza coincidencias existentes.
- Las seis plantillas deben cargarse en un proyecto local. Los datos reales nunca deben incorporarse al repositorio público.

CSV/TSV es el formato de entrada de A4. La importación XLSX nativa queda fuera de esta fase.
