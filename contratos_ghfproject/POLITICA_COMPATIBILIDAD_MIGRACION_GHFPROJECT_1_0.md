# POLÍTICA DE COMPATIBILIDAD Y MIGRACIÓN GHFProject 1.0

## Versiones

- `containerVersion` y `projectSchemaVersion` usan SemVer.
- El lector distingue versión del contenedor, schema del proyecto y versión de la aplicación.
- La versión de la aplicación no gobierna el formato del proyecto.

## Apertura

1. Comprobar que es ZIP y que no contiene rutas peligrosas, enlaces ni ejecutables.
2. Leer únicamente `envelope.json`.
3. Validar el envelope.
4. Rechazar capacidades obligatorias desconocidas.
5. Comprobar versión mayor.
6. Validar `manifest.sha256` y `projectSha256`.
7. Leer y validar `project.json`.
8. Ejecutar validación referencial y semántica.
9. Mostrar resumen, privacidad, migraciones y advertencias.
10. Cargar solo tras confirmación cuando exista migración o advertencia relevante.

## Política por versión

- Misma versión: abrir sin migración.
- Versión menor compatible: migrar en memoria mediante pasos identificados e idempotentes.
- Versión mayor desconocida: rechazar.
- Schema desconocido: rechazar.
- Extensión opcional desconocida: preservar y advertir.
- Capacidad obligatoria desconocida: rechazar.

## Migración

- Nunca modifica el archivo de origen.
- Nunca escribe automáticamente en `localStorage`.
- Cada clave legacy se analiza de forma aislada; un JSON corrupto no interrumpe los demás candidatos.
- La migración genera informe, hash anterior, hash posterior y lista de transformaciones.
- El usuario debe usar `Guardar copia`.
- La copia migrada conserva referencia al origen y recibo de migración.
- No se elimina ninguna clave legacy durante P6-0C.

## Fin de soporte

Una versión solo puede retirarse cuando exista fixture anonimizado, lector probado, migración idempotente, roundtrip sin pérdida, aviso y exportación verificada.
