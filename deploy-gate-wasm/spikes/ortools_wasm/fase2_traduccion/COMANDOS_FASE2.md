# Comandos Fase 2

## PowerShell

```powershell
Set-Location "D:\Generador_Horarios_Escolares_v1_4_1_FASE_2_DISENO_TRADUCCION_CP_SAT"
node .\spikes\ortools_wasm\fase2_traduccion\tests\fase2_traduccion_node.mjs
npm test
```

## Termux / Linux / macOS

```bash
cd /ruta/Generador_Horarios_Escolares_v1_4_1_FASE_2_DISENO_TRADUCCION_CP_SAT
node spikes/ortools_wasm/fase2_traduccion/tests/fase2_traduccion_node.mjs
npm test
```

## Panel navegador de la Fase 1B

La Fase 2 no sustituye la necesidad de probar el panel navegador de Fase 1B:

```bash
python -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/browser/spike_ortools_wasm.html?v=fase2
```

