# P6-0G-1A1 → P6-0G-1A4 · hoja de ruta ejecutada

## A1 · lectura temporal sintética
Entrada `browser-private.html`, modo explícito, `NullStorage`, CSP sin `unsafe-inline`/`unsafe-eval`, red de proyecto denegada, parser endurecido y copia binaria.

## A2 · serialización canónica y ciclo de sustitución
Escritor ZIP propio con STORE/DEFLATE, orden de miembros, manifiesto SHA-256, validación antes de descarga, reapertura automática y estado `DESCARGA_SOLICITADA`.

## A3 · proyecto vacío y edición parcial
Proyecto activo único, creación en memoria, edición de identidad/centro/curso/clasificación, estado limpio/modificado, cierre y descarte explícitos. Sin IndexedDB ni persistencia automática.

## A4 · candidata REAL/ANONYMIZED
La build acepta `REAL` y `ANONYMIZED` únicamente en BROWSER_PRIVATE temporal, dentro de los límites A0. No envía datos, no usa motor, XLSX ni almacenamiento. La autorización definitiva sigue vinculada a QA física en Chrome Android y otros navegadores reales.

## Publicación
La entrada nueva puede publicarse junto a P6-0F.2 sin reemplazar `index.html`. URL esperada en GitHub Pages: `browser-private.html`.
