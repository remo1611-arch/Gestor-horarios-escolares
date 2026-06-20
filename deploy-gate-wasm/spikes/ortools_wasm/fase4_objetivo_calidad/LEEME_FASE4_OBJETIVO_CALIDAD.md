# LEEME · Fase 4 objetivo de calidad CP-SAT

Esta carpeta contiene una prueba experimental de OR-Tools CP-SAT WebAssembly con objetivo de calidad.

No es el motor productivo. No sustituye el motor JavaScript actual.

## Comando rápido

```bash
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_objetivo_calidad_node.mjs
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos.mjs
# Validación completa opcional, más lenta y no apta como gate automático:
# node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos_completa.mjs
```

## Panel navegador

```text
spikes/ortools_wasm/fase4_objetivo_calidad/browser/panel_cp_sat_fase4.html
```

Debe servirse con servidor local o GitHub Pages. La apertura directa por `file://` puede fallar por módulos, worker y WASM.
