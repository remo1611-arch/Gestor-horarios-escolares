# Comandos de prueba · Fase 1B

## PowerShell desde una carpeta descomprimida

```powershell
Set-Location "D:\Generador_Horarios_Escolares_v1_4_1_FASE_1B_SPIKE_OR_TOOLS_WASM"
node .\spikes\ortools_wasm\tests\spike_minimo_node.mjs
npm test
python -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/browser/spike_ortools_wasm.html?v=fase1b
```

## Termux desde carpeta descomprimida

```bash
cd ~/storage/downloads/Generador_Horarios_Escolares_v1_4_1_FASE_1B_SPIKE_OR_TOOLS_WASM
node spikes/ortools_wasm/tests/spike_minimo_node.mjs
npm test
python3 -m http.server 8008
```

Abrir en Chrome:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/browser/spike_ortools_wasm.html?v=fase1b
```
