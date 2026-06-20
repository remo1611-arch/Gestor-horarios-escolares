#!/usr/bin/env bash
set -euo pipefail
PUERTO="${1:-8969}"
cd "$(dirname "$0")"
echo "Abriendo Generador de Horarios Escolares en http://127.0.0.1:${PUERTO}/"
python3 -m http.server "$PUERTO"
