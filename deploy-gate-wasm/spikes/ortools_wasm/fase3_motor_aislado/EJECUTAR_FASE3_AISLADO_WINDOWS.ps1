$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $Root
node .\spikes\ortools_wasm\fase3_motor_aislado\tests\fase3_motor_aislado_node.mjs
node .\spikes\ortools_wasm\fase3_motor_aislado\tests\fase3_validacion_cruzada_ejemplos.mjs
