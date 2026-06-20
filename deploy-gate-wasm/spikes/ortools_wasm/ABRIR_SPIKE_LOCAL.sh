#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 -m http.server 8008 >/tmp/ghe_ortools_spike_http.log 2>&1 &
echo $! > /tmp/ghe_ortools_spike_http.pid
echo "Abrir: http://127.0.0.1:8008/spikes/ortools_wasm/browser/spike_ortools_wasm.html?v=fase1b"
