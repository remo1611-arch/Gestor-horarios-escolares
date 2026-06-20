# Comandos Fase 3

## Windows PowerShell

```powershell
Set-Location "D:\Generador_Horarios_Escolares_v1_4_1_FASE_3_IMPLEMENTACION_AISLADA_CP_SAT"
node .\spikes\ortools_wasm\fase3_motor_aislado\tests\fase3_motor_aislado_node.mjs
node .\spikes\ortools_wasm\fase3_motor_aislado\tests\fase3_validacion_cruzada_ejemplos.mjs
npm test
python -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase3_motor_aislado/browser/panel_cp_sat_aislado.html?v=fase3
```

## Termux / Linux

```bash
cd ~/storage/downloads/Generador_Horarios_Escolares_v1_4_1_FASE_3_IMPLEMENTACION_AISLADA_CP_SAT
node spikes/ortools_wasm/fase3_motor_aislado/tests/fase3_motor_aislado_node.mjs
node spikes/ortools_wasm/fase3_motor_aislado/tests/fase3_validacion_cruzada_ejemplos.mjs
npm test
python -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase3_motor_aislado/browser/panel_cp_sat_aislado.html?v=fase3
```
