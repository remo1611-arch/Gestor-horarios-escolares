#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node spikes/ortools_wasm/tests/spike_minimo_node.mjs
