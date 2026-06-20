import { CpModel, CpSolver, CpSolverStatus } from '../../vendor/cpsat-js/dist/index.js';

self.onmessage = async (event) => {
  const started = performance.now();
  try {
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

    const ok = result.status === CpSolverStatus.OPTIMAL && result.objectiveValue === 20 && result.value(x) === 10 && result.value(y) === 0;
    self.postMessage({
      ok,
      phase: 'FASE_4B_DEPLOY_GATE_WORKER',
      solverStatus: result.status,
      expected: { objectiveValue: 20, x: 10, y: 0 },
      actual: { objectiveValue: result.objectiveValue, x: result.value(x), y: result.value(y) },
      timingsMs: {
        load: Math.round(loadMs),
        solve: Math.round(solveMs),
        total: Math.round(performance.now() - started),
        solverWallTimeReportedMs: Math.round((result.wallTime ?? 0) * 1000),
      },
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      phase: 'FASE_4B_DEPLOY_GATE_WORKER',
      error: error?.message || String(error),
      stack: error?.stack || '',
      timingsMs: { total: Math.round(performance.now() - started) },
    });
  }
};
