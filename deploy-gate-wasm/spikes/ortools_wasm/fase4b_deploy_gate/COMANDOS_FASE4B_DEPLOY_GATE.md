# Comandos · Fase 4B-DEPLOY-GATE WASM

## PowerShell

```powershell
Set-Location "D:\Generador_Horarios_Escolares_v1_4_1_FASE_4B_DEPLOY_GATE_WASM"

node .\spikes\ortools_wasm\fase4b_deploy_gate\tests\fase4b_deploy_gate_static_node.mjs
node .\spikes\ortools_wasm\fase4b_deploy_gate\tests\fase4b_deploy_gate_http_probe.mjs
npm test
python -m http.server 8008
```

Panel:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase4b_deploy_gate/browser/panel_deploy_gate_wasm.html?v=deploy-gate
```

## Termux / Linux

```bash
cd Generador_Horarios_Escolares_v1_4_1_FASE_4B_DEPLOY_GATE_WASM
node ./spikes/ortools_wasm/fase4b_deploy_gate/tests/fase4b_deploy_gate_static_node.mjs
node ./spikes/ortools_wasm/fase4b_deploy_gate/tests/fase4b_deploy_gate_http_probe.mjs
npm test
python3 -m http.server 8008
```

Panel:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase4b_deploy_gate/browser/panel_deploy_gate_wasm.html?v=deploy-gate
```

