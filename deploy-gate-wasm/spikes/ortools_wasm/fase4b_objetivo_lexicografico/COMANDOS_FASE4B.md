# Comandos Fase 4B

## PowerShell

```powershell
Set-Location "D:\Generador_Horarios_Escolares_v1_4_1_FASE_4B_OBJETIVO_LEXICOGRAFICO_CP_SAT"
node .\spikes\ortools_wasmase4b_objetivo_lexicografico	estsase4b_lexicografico_node.mjs
node .\spikes\ortools_wasmase4b_objetivo_lexicografico	estsase4b_validacion_cruzada_ejemplos.mjs
npm test
python -m http.server 8008
```

Panel:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase4b_objetivo_lexicografico/browser/panel_cp_sat_fase4b.html?v=fase4b
```

## Termux / Linux

```bash
cd ~/Generador_Horarios_Escolares_v1_4_1_FASE_4B_OBJETIVO_LEXICOGRAFICO_CP_SAT
node spikes/ortools_wasm/fase4b_objetivo_lexicografico/tests/fase4b_lexicografico_node.mjs
node spikes/ortools_wasm/fase4b_objetivo_lexicografico/tests/fase4b_validacion_cruzada_ejemplos.mjs
npm test
python -m http.server 8008
```
