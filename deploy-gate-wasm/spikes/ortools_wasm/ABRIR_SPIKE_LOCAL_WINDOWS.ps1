$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
Write-Host "Arrancando servidor local en http://127.0.0.1:8008 ..."
Start-Process powershell -ArgumentList '-NoExit','-Command','python -m http.server 8008'
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8008/spikes/ortools_wasm/browser/spike_ortools_wasm.html?v=fase1b"
