import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { CpModel, CpSolver, CpSolverStatus } from '../../vendor/cpsat-js/dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../../');
const vendor = path.join(root, 'spikes/ortools_wasm/vendor/cpsat-js');
const phase = path.join(root, 'spikes/ortools_wasm/fase4b_deploy_gate');
const pkg = JSON.parse(fs.readFileSync(path.join(vendor, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'cpsat-js');
assert.equal(pkg.version, '1.0.0');
assert.equal(pkg.license, 'Apache-2.0');

const filesToScan = [
  path.join(vendor, 'build/cpsat.mjs'),
  path.join(vendor, 'dist/index.js'),
  path.join(vendor, 'dist/solver/cp-solver.js'),
  path.join(phase, 'browser/worker_deploy_gate_wasm.mjs'),
  path.join(phase, 'browser/panel_deploy_gate_wasm.html'),
];
const forbidden = ['SharedArrayBuffer', 'Atomics', 'pthread', 'PTHREAD', 'USE_PTHREADS', 'PROXY_TO_PTHREAD'];
const findings = [];
for (const file of filesToScan) {
  const txt = fs.readFileSync(file, 'utf8');
  for (const pat of forbidden) {
    if (txt.includes(pat)) findings.push({ file: path.relative(root, file), pattern: pat });
  }
}
// El panel menciona SharedArrayBuffer/Atomics para diagnóstico, no como dependencia.
const runtimeFindings = findings.filter(f => !f.file.endsWith('panel_deploy_gate_wasm.html'));
assert.deepEqual(runtimeFindings, [], 'No debe haber patrones de multihilo en runtime/worker vendorizado');

const wasmPath = path.join(vendor, 'build/cpsat.wasm');
const wasmBytes = fs.statSync(wasmPath).size;
assert.ok(wasmBytes > 1_000_000, 'El WASM debe existir y tener tamaño sustancial');
assert.ok(wasmBytes < 20_000_000, 'El WASM no debe exceder el límite documental de 20 MB');
const wasm = fs.readFileSync(wasmPath);
await WebAssembly.compile(wasm);

const started = performance.now();
const solver = await CpSolver.create();
const loadMs = performance.now() - started;
const model = new CpModel();
const x = model.newIntVar(0, 10, 'x');
const y = model.newIntVar(0, 10, 'y');
model.add(x.plus(y).le(10));
model.maximize(x.times(2).plus(y.times(1)));
const solveStarted = performance.now();
const result = solver.solve(model, { maxTimeInSeconds: 2, numWorkers: 1 });
const solveMs = performance.now() - solveStarted;
assert.equal(result.status, CpSolverStatus.OPTIMAL);
assert.equal(result.objectiveValue, 20);
assert.equal(result.value(x), 10);
assert.equal(result.value(y), 0);

const evidence = {
  phase: 'FASE_4B_DEPLOY_GATE_STATIC_NODE',
  status: 'PASS',
  package: { name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository?.url || null },
  wasm: { bytes: wasmBytes, webAssemblyCompile: true },
  staticScan: { forbiddenPatterns: forbidden, runtimeFindings, panelDiagnosticMentions: findings.filter(f => f.file.endsWith('panel_deploy_gate_wasm.html')) },
  solve: { solverStatus: result.status, objectiveValue: result.objectiveValue, values: { x: result.value(x), y: result.value(y) } },
  timingsMs: { load: Math.round(loadMs), solve: Math.round(solveMs), solverWallTimeReportedMs: Math.round((result.wallTime ?? 0) * 1000) },
  dictamen: 'PASS_NODE_ESTATICO_NO_ACREDITA_NAVEGADOR_FISICO',
};
const out = path.join(phase, 'evidencias/evidencia_fase4b_deploy_gate_static_node.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
