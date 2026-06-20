# Fase 3 · Implementación aislada del motor CP-SAT WebAssembly

## Estado

`FASE_3_IMPLEMENTACION_AISLADA_CP_SAT_NODE_PASS_SUSTITUCION_BLOQUEADA`

Esta fase implementa un motor CP-SAT aislado y ejecutable, basado en el traductor de Fase 2, sin conectar el cálculo ordinario de la aplicación a OR-Tools.

## Alcance

Se incorpora:

- `src/motor_cp_sat_aislado.mjs`: wrapper de producto experimental con formato próximo a `generarHorario`.
- `browser/worker_cp_sat_aislado.mjs`: worker experimental para pruebas en navegador.
- `browser/panel_cp_sat_aislado.html`: panel local de QA del motor aislado.
- `tests/fase3_motor_aislado_node.mjs`: prueba mínima de motor aislado.
- `tests/fase3_validacion_cruzada_ejemplos.mjs`: validación cruzada con los siete ejemplos existentes.
- evidencias JSON de ejecución.

No se modifica:

- `assets/js/motor/generador_horario.js`.
- `assets/js/motor/trabajador_generacion.js`.
- `assets/js/aplicacion.js` para conectar CP-SAT.
- `schemas/proyecto_horario.schema.json`.
- ejemplos de `/ejemplos`.
- flujo visible de usuario.

## Resultado de validación cruzada

El motor CP-SAT aislado coloca las mismas sesiones que el motor actual en los siete ejemplos y no genera errores graves. Sin embargo, no iguala la calidad global del motor actual en todos los casos.

Bloqueos detectados en la evidencia actual:

- `ejemplo_centro_complejo_sintetico.json`: mantiene 23/33, pero con penalización ligeramente peor que el motor actual.
- `ejemplo_centro_exigente_sintetico.json`: completa 78/78, pero con penalización de calidad claramente peor que el motor actual.

Por tanto, esta fase acredita implementación aislada, pero no autoriza sustitución.

## Dictamen

La Fase 3 puede considerarse técnicamente cerrada como implementación aislada. No habilita Fase 5. Antes de sustituir el motor actual debe abrirse una Fase 4 real de validación cruzada y mejora del objetivo de calidad.

## Gates pendientes

- QA navegador real del panel CP-SAT aislado.
- Android Chrome.
- Tableta.
- PC.
- GitHub Pages real.
- Mejora del objetivo CP-SAT para igualar o superar calidad del motor actual.
- Validación formal de apertura local y carga de WASM.
- Decisión explícita sobre mantenimiento del binario WASM vendorizado.
