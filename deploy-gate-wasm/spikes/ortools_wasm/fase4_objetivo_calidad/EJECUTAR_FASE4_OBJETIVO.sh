#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_objetivo_calidad_node.mjs
node spikes/ortools_wasm/fase4_objetivo_calidad/tests/fase4_validacion_cruzada_ejemplos.mjs
npm test
