# QA · Fase 4 objetivo de calidad CP-SAT

## Pruebas ejecutadas

```bash
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_objetivo_calidad_node.mjs
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos.mjs
# Validación completa opcional, más lenta y no apta como gate automático:
# node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos_completa.mjs
npm test
```

## Resultado

- Prueba Node mínima Fase 4: PASS.
- Validación cruzada Fase 4: PASS técnico con bloqueos de sustitución.
- `npm test`: debe conservar 34/34 PASS.

## Gate de sustitución

Bloqueado. No se permite conectar el motor CP-SAT Fase 4 a `trabajador_generacion.js` ni al botón ordinario **Calcular horario**.

## QA físico pendiente

- Panel navegador experimental Fase 4.
- Android Chrome.
- Tableta.
- PC.
- GitHub Pages real.
- Apertura local/servidor local.
