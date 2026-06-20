# Fase 2 · Traductor CP-SAT experimental

Este directorio contiene un prototipo aislado de traducción del modelo escolar actual a CP-SAT.

No forma parte del flujo ordinario de la app y no sustituye el motor visible.

## Ejecutar prueba Node

Desde la raíz del proyecto:

```bash
node spikes/ortools_wasm/fase2_traduccion/tests/fase2_traduccion_node.mjs
```

Debe imprimir `status: PASS` y generar:

```text
spikes/ortools_wasm/fase2_traduccion/evidencias/evidencia_fase2_traduccion_node.json
```

## Archivos principales

```text
src/traductor_cp_sat_fase2.mjs
```

Construye un modelo CP-SAT experimental a partir de `horario-escolar-json-1.7`.

```text
tests/fase2_traduccion_node.mjs
```

Valida casos pequeños.

## Restricciones de seguridad

- No importar este módulo desde `assets/js/aplicacion.js`.
- No conectar con `trabajador_generacion.js`.
- No modificar `generador_horario.js` en esta fase.
- No declarar la app como migrada a OR-Tools.

