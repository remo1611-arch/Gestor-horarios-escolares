# Comandos Fase 4

## PowerShell

```powershell
Set-Location "D:\Generador_Horarios_Escolares_v1_4_1_FASE_4_OBJETIVO_CALIDAD_CP_SAT"
node .\spikes\ortools_wasm\fase4_objetivo_calidad\tests\fase4_objetivo_calidad_node.mjs
node .\spikes\ortools_wasm\fase4_objetivo_calidad\tests\fase4_validacion_cruzada_ejemplos.mjs
# Validación completa opcional, más lenta:
# node .\spikes\ortools_wasm\fase4_objetivo_calidad\tests\fase4_validacion_cruzada_ejemplos_completa.mjs
npm test
python -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase4_objetivo_calidad/browser/panel_cp_sat_fase4.html?v=fase4
```

## Termux / Linux

```bash
cd ~/storage/downloads/Generador_Horarios_Escolares_v1_4_1_FASE_4_OBJETIVO_CALIDAD_CP_SAT
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_objetivo_calidad_node.mjs
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos.mjs
# Validación completa opcional, más lenta y no apta como gate automático:
# node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos_completa.mjs
npm test
python -m http.server 8008
```
