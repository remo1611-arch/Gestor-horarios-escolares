$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $Root
node .\spikes\ortools_wasm\fase2_traduccion\tests\fase2_traduccion_node.mjs
npm test
