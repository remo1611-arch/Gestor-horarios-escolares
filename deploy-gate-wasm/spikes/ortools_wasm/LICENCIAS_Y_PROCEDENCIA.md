# Licencias y procedencia · Spike OR-Tools WASM

## cpsat-js

- Paquete: `cpsat-js`.
- Versión vendorizada: `1.0.0`.
- Descripción declarada: WebAssembly port of Google OR-Tools CP-SAT constraint programming solver.
- Licencia declarada: Apache-2.0.
- Archivo principal WASM: `vendor/cpsat-js/build/cpsat.wasm`.
- Tamaño aproximado del WASM: 5,9 MB.

## @bufbuild/protobuf

- Paquete: `@bufbuild/protobuf`.
- Versión vendorizada: `2.12.0`.
- Licencia declarada en `package.json`: `(Apache-2.0 AND BSD-3-Clause)`.
- Uso: serialización/deserialización de protos para comunicar JavaScript con el solver WASM.

## Advertencia

El paquete vendorizado no equivale a una distribución oficial JavaScript/browser publicada por Google OR-Tools. Antes de producción debe fijarse un procedimiento reproducible de obtención/actualización del binario y conservar hashes.
