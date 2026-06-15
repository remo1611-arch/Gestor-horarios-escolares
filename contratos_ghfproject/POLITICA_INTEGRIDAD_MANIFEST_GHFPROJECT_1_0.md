# POLÍTICA DE INTEGRIDAD Y MANIFIESTO GHFProject 1.0

## Formato

Cada línea de `manifest.sha256` contiene:

```text
<sha256 en minúsculas><dos espacios><ruta POSIX relativa>
```

El manifiesto:

- no se incluye a sí mismo;
- se ordena lexicográficamente por ruta;
- contiene todos los miembros del contenedor, excepto el propio manifiesto;
- no admite rutas duplicadas, absolutas, `..`, barras invertidas ni nombres normalizados ambiguos;
- no admite enlaces simbólicos, macros, ejecutables ni miembros cifrados de ZIP.

## Comprobaciones

1. El ZIP debe superar `testzip`.
2. Cada miembro debe figurar en el manifiesto y coincidir en SHA-256.
3. No puede haber miembros extra ni ausentes.
4. `envelope.integrity.projectSha256` debe coincidir con `project.json`.
5. Los índices de snapshot y trazabilidad deben referenciar archivos existentes y sus hashes.
6. Un fallo de integridad bloquea la apertura; no se ofrece reparación silenciosa.

## Límites preventivos

El lector debe aplicar límites configurables de número de miembros, tamaño total, tamaño por miembro y relación de compresión para reducir riesgos de ZIP bomb. Los límites no forman parte del contenido funcional del proyecto.
