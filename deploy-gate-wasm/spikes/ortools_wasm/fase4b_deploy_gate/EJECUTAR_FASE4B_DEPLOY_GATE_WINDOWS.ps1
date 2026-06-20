$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $ScriptDir "..\..\.."))
node .\spikes\ortools_wasm\fase4b_deploy_gate\tests\fase4b_deploy_gate_static_node.mjs
node .\spikes\ortools_wasm\fase4b_deploy_gate\tests\fase4b_deploy_gate_http_probe.mjs
npm test
