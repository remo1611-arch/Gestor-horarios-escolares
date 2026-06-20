# QA · Fase 4B-DEPLOY-GATE WASM

## Estado

`DEPLOY_GATE_PREPARADO_QA_NAVEGADOR_FISICO_PENDIENTE`

## Validación ejecutada en contenedor

| Control | Resultado | Alcance |
|---|---:|---|
| `node fase4b_deploy_gate_static_node.mjs` | PASS | Inspección estática, compilación WASM y resolución mínima Node |
| `node fase4b_deploy_gate_http_probe.mjs` | PASS | Recursos críticos por HTTP local de prueba y `application/wasm` |
| `npm test` | PASS 34/34 | No regresión del producto v1.4.1 |

## Evidencias generadas

- `evidencias/evidencia_fase4b_deploy_gate_static_node.json`
- `evidencias/evidencia_fase4b_deploy_gate_http_probe.json`
- `evidencias/fase4b_deploy_gate_static_node.log`
- `evidencias/fase4b_deploy_gate_http_probe.log`
- `evidencias/npm_test_34_34_deploy_gate.log`

## Pendiente obligatorio

Ejecutar el panel:

`spikes/ortools_wasm/fase4b_deploy_gate/browser/panel_deploy_gate_wasm.html`

en:

- Android Chrome;
- tableta;
- PC;
- GitHub Pages real;
- HTTP local real;
- opcionalmente `file://` si se pretende conservar apertura directa sin servidor local.

## Criterio de bloqueo

Si el panel no resuelve en worker con `PASS_DEPLOY_GATE_NAVEGADOR`, no se autoriza Fase 4C ni sustitución del motor.
