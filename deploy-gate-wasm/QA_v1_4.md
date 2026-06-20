# QA v1.4.1

## Resultado automático

- `npm test`: PASS, 32/32 pruebas Node.
- `node --check`: PASS.
- Parseo JSON: PASS.
- HTTP local: pendiente de validación final desde ZIP limpio.
- Manifiesto SHA-256: pendiente de generación final.
- Integridad ZIP: pendiente de generación final.

## Pruebas nuevas

- `motor_web_avanzado.test.mjs`: verifica modo `web_avanzado`, dominios, alternativas, progreso y validez final.
- `benchmark_motor_v14.test.mjs`: verifica corte temporal razonable en escenario escalado y ausencia de graves.
- `v14_producto.test.mjs`: verifica versión, documentación, worker, progreso y funciones de motor.

## Estado

Candidata técnica pendiente de QA físico Android/tableta/PC, GitHub Pages real, impresión A4/PDF y prueba privada.
