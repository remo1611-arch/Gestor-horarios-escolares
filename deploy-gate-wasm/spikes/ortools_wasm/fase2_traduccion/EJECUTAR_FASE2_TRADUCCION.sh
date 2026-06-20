#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
node spikes/ortools_wasm/fase2_traduccion/tests/fase2_traduccion_node.mjs
npm test
