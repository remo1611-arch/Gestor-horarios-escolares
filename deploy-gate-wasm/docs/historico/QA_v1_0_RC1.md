# QA · v1.0-rc1

## Resultado automático

- `npm test`: PASS.
- 21/21 pruebas Node: PASS.
- `node --check` en JS/MJS: PASS.
- JSON de ejemplos: PASS.
- `unzip -t`: PASS.
- Manifiesto SHA-256: PASS.
- HTTP local: 200.

## Pruebas nuevas

- `motor_incremental.test.mjs`: verifica que el motor incremental no bloquea de forma prolongada con un centro exigente escalado y que informa métricas de calidad básicas.
- `rc1_motor.test.mjs`: verifica versión, documentación RC1, ausencia de residuo `actividad.group_id`, presencia de motor incremental y corte temporal.

## Dictamen

RC1 corrige el bloqueo algorítmico principal detectado en RC0. Sigue siendo candidata pendiente de QA físico y prueba privada; no debe etiquetarse como versión estable hasta completar esas evidencias.
