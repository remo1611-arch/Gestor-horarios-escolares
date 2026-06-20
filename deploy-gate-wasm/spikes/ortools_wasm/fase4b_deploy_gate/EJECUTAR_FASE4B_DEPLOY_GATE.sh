#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
node ./spikes/ortools_wasm/fase4b_deploy_gate/tests/fase4b_deploy_gate_static_node.mjs
node ./spikes/ortools_wasm/fase4b_deploy_gate/tests/fase4b_deploy_gate_http_probe.mjs
npm test
