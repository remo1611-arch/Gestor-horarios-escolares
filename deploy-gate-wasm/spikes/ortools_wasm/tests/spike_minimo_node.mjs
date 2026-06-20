import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { CpModel, CpSolver, CpSolverStatus } from '../vendor/cpsat-js/dist/index.js';

const started = performance.now();
const solver = await CpSolver.create();
const loadedMs = performance.now() - started;

const model = new CpModel();
const x = model.newIntVar(0, 10, 'x');
const y = model.newIntVar(0, 10, 'y');
model.add(x.plus(y).le(10));
model.maximize(x.times(2).plus(y.times(1)));

const solvedStarted = performance.now();
const result = solver.solve(model, { maxTimeInSeconds: 2, numWorkers: 1 });
const solvedMs = performance.now() - solvedStarted;

assert.equal(result.status, CpSolverStatus.OPTIMAL, 'El modelo mínimo debe resolverse como OPTIMAL');
assert.equal(result.objectiveValue, 20, 'El objetivo esperado es 20');
assert.equal(result.value(x), 10, 'x debe valer 10 en el óptimo esperado');
assert.equal(result.value(y), 0, 'y debe valer 0 en el óptimo esperado');

const evidence = {
  spike: 'OR_TOOLS_WASM_FASE_1B_NODE_MINIMO',
  status: 'PASS',
  solverStatus: result.status,
  objectiveValue: result.objectiveValue,
  values: { x: result.value(x), y: result.value(y) },
  timingsMs: {
    load: Math.round(loadedMs),
    solve: Math.round(solvedMs),
    solverWallTimeReportedMs: Math.round((result.wallTime ?? 0) * 1000),
  },
  notes: [
    'Prueba mínima aislada. No usa el motor de horarios ni modifica la interfaz.',
    'Acredita carga WASM y llamada CP-SAT en Node; no acredita navegador, GitHub Pages ni dispositivos físicos.',
  ],
};

console.log(JSON.stringify(evidence, null, 2));
