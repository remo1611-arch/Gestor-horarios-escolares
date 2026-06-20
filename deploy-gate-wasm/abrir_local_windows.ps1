param(
  [int]$Puerto = 8969
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $raiz
$url = "http://127.0.0.1:$Puerto/"
Write-Host "Abriendo Generador de Horarios Escolares en $url"
Start-Process $url
python -m http.server $Puerto
