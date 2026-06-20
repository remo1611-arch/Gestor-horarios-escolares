# QA · v1.2.0

## Alcance

Validación automática de la fase de importación CSV y plantillas sobre la base v1.1.

## Pruebas automáticas ejecutadas

- `npm test`: PASS.
- 25/25 pruebas Node: PASS.
- `node --check` en todos los JS/MJS: PASS.
- Parseo JSON de ejemplos, esquema y VERSION: PASS.
- Servidor local HTTP 200: PASS.
- Manifiesto SHA-256: PASS.
- Integridad ZIP: PASS.

## Pruebas nuevas

- `importacion_csv.test.mjs`:
  - parser CSV con comillas;
  - plantilla de docentes;
  - importación de docentes;
  - importación de grupos y subgrupos;
  - importación de espacios;
  - importación de tramos reales;
  - importación de actividades con acompañantes;
  - errores graves si una actividad referencia datos inexistentes.

- `v12_producto.test.mjs`:
  - versión 1.2.0;
  - formato 1.6;
  - existencia de plantillas;
  - presencia de sección UI de importación CSV.

## Pendiente

- QA físico Android.
- QA físico tableta.
- QA físico PC.
- GitHub Pages real.
- Impresión A4/PDF.
- Prueba privada con datos reales o anonimizados.
