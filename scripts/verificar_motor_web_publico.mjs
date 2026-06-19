import fs from 'node:fs';
import { loadExampleProject } from '../assets/js/example_library.mjs';
import { analyzeP12WebSolverSupport, runP12WebSolver } from '../assets/js/p12_web_solver.mjs';
import { validateScheduleIndependently } from '../assets/js/product_independent_validator.mjs';

const fetchJson = async (url) => JSON.parse(fs.readFileSync(url, 'utf8'));
const examples = ['ADVANCED_WEB_502','P11_SYNTHETIC_REALISTIC','P12_WEB_MEDIUM','P12_ORG41_LIGHT','P12_WEB_MINI'];
const issues = [];
const results = [];
for (const id of examples) {
  const project = await loadExampleProject(id, { fetchJson });
  const support = analyzeP12WebSolverSupport(project);
  if (!support.supported) issues.push(`${id}: no soportado (${support.reasons.join(', ')})`);
  const result = await runP12WebSolver(project, { requestId: `qa_${id}`, mode: 'COMPLETE', maxDurationMs: 30000, seed: 0 }, {});
  const status = result.response?.status || 'UNKNOWN';
  const proposal = result.proposal;
  if (status !== 'COMPLETED') issues.push(`${id}: estado ${status}`);
  if (!proposal) issues.push(`${id}: sin propuesta`);
  if (proposal) {
    const draft = { ...project, assignments: proposal.assignments || [] };
    const validation = validateScheduleIndependently(draft, { mode: 'CANDIDATE', source: 'WEB_SOLVER_PUBLIC_QA' });
    if (!validation.valid) issues.push(`${id}: validación independiente con ${validation.blockers?.length || 0} bloqueo(s)`);
    results.push({ id, status, placed: proposal.summary?.placed ?? proposal.assignments?.length ?? 0, required: proposal.summary?.required ?? 0, valid: validation.valid });
  }
}
console.log(JSON.stringify({ ok: issues.length === 0, results, issues }, null, 2));
process.exit(issues.length ? 1 : 0);
