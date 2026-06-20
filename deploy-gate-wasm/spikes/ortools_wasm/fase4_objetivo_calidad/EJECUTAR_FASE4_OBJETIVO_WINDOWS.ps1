$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $Root
node .\spikes\ortools_wasm\fase4_objetivo_calidad\tests\fase4_objetivo_calidad_node.mjs
node .\spikes\ortools_wasm\fase4_objetivo_calidad\tests\fase4_validacion_cruzada_ejemplos.mjs
npm test
