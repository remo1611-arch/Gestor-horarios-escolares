import { CpModel, CpSolver, CpSolverStatus } from '../vendor/cpsat-js/dist/index.js';

self.onmessage = async (event) => {
  if (event.data?.type !== 'RUN_SPIKE') return;
  const started = performance.now();
  try {
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

    const pass = result.status === CpSolverStatus.OPTIMAL && result.objectiveValue === 20 && result.value(x) === 10 && result.value(y) === 0;
    self.postMessage({
      type: 'SPIKE_RESULT',
      status: pass ? 'PASS' : 'FAIL',
      solverStatus: result.status,
      objectiveValue: result.objectiveValue,
      values: { x: result.value(x), y: result.value(y) },
      timingsMs: {
        load: Math.round(loadedMs),
        solve: Math.round(solvedMs),
        solverWallTimeReportedMs: Math.round((result.wallTime ?? 0) * 1000),
      },
      environment: {
        userAgent: navigator.userAgent,
        crossOriginIsolated: self.crossOriginIsolated === true,
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        hasWebAssembly: typeof WebAssembly !== 'undefined',
      },
    });
  } catch (error) {
    self.postMessage({
      type: 'SPIKE_RESULT',
      status: 'ERROR',
      error: String(error?.stack || error?.message || error),
      environment: {
        userAgent: navigator.userAgent,
        crossOriginIsolated: self.crossOriginIsolated === true,
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        hasWebAssembly: typeof WebAssembly !== 'undefined',
      },
    });
  }
};
