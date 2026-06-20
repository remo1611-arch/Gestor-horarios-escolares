# QA · v1.1.0

## Objetivo

Verificar que la capa de calidad del horario se integra sin romper el motor, la validación, la persistencia ni las exportaciones previas.

## Validaciones automáticas ejecutadas

- `npm test`
- `node --check` en JavaScript/MJS
- Parseo JSON de ejemplos y versión
- Servidor HTTP local 200
- Manifiesto SHA-256
- `unzip -t`

## Nuevas pruebas

- `calidad_horario.test.mjs`
- `v11_producto.test.mjs`

## Resultado esperado

La app debe permitir:

- calcular horario;
- revisar carga docente;
- revisar calidad del horario;
- exportar CSV de calidad;
- exportar informe TXT de calidad;
- mantener compatibilidad con proyectos `horario-escolar-json-1.6`.

## Pendiente

- QA físico Android.
- QA físico tableta.
- QA físico PC.
- GitHub Pages real.
- Impresión A4/PDF.
- Prueba privada con datos reales o anonimizados.
