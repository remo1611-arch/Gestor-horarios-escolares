#!/usr/bin/env bash
set -euo pipefail
node spikes/ortools_wasm/fase4b_objetivo_lexicografico/tests/fase4b_lexicografico_node.mjs
node spikes/ortools_wasm/fase4b_objetivo_lexicografico/tests/fase4b_validacion_cruzada_ejemplos.mjs
