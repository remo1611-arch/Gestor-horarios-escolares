export const RESILIENCE_CONTRACT_VERSION = 'runtime-resilience-contract-1.0';
export const PERFORMANCE_CONTRACT_VERSION = 'performance-budget-contract-1.0';
export const ACCESSIBILITY_CONTRACT_VERSION = 'accessibility-ux-contract-1.0';
export const SERVICE_WORKER_CONTRACT_VERSION = 'service-worker-update-contract-1.0';

export const PERFORMANCE_BUDGETS_MS = Object.freeze({
  loadProject502: 1500,
  validateProject502: 2500,
  renderSchedule502: 1800,
  buildDocuments502: 8000,
  buildXlsx502: 8000,
  buildPackage502: 15000,
  saveProject502: 3000,
});

export const SIZE_BUDGETS_BYTES = Object.freeze({
  projectJson502: 8 * 1024 * 1024,
  xlsx502: 12 * 1024 * 1024,
  package502: 32 * 1024 * 1024,
});

const sessionMetrics = [];
const MAX_SESSION_METRICS = 100;

function clock() {
  return globalThis.performance?.now ? performance.now() : Date.now();
}

export function recordPerformance(name, durationMs, detail = {}) {
  const row = {
    name: String(name || 'unknown').slice(0, 80),
    durationMs: Math.max(0, Number(durationMs || 0)),
    at: new Date().toISOString(),
    detail: sanitizeDetail(detail),
  };
  sessionMetrics.push(row);
  if (sessionMetrics.length > MAX_SESSION_METRICS) sessionMetrics.splice(0, sessionMetrics.length - MAX_SESSION_METRICS);
  return { ...row, detail: { ...row.detail } };
}

export function measureSync(name, fn, detail = {}) {
  const start = clock();
  try { return fn(); }
  finally { recordPerformance(name, clock() - start, detail); }
}

export async function measureAsync(name, fn, detail = {}) {
  const start = clock();
  try { return await fn(); }
  finally { recordPerformance(name, clock() - start, detail); }
}

function sanitizeDetail(detail) {
  const out = {};
  for (const [key, value] of Object.entries(detail || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, 80);
  }
  return out;
}

export function getSessionPerformance() {
  return sessionMetrics.map(row => ({ ...row, detail: { ...row.detail } }));
}

export function clearSessionPerformance() { sessionMetrics.length = 0; }

export function evaluatePerformance(rows, budgets = PERFORMANCE_BUDGETS_MS) {
  const checks = [];
  for (const [name, budgetMs] of Object.entries(budgets)) {
    const matching = (rows || []).filter(row => row.name === name);
    if (!matching.length) {
      checks.push({ name, budgetMs, measuredMs: null, status: 'NOT_MEASURED' });
      continue;
    }
    const measuredMs = Math.max(...matching.map(row => Number(row.durationMs || 0)));
    checks.push({ name, budgetMs, measuredMs, status: measuredMs <= budgetMs ? 'PASS' : 'OVER_BUDGET' });
  }
  return {
    contractVersion: PERFORMANCE_CONTRACT_VERSION,
    checks,
    pass: checks.every(row => row.status === 'PASS' || row.status === 'NOT_MEASURED'),
    overBudget: checks.filter(row => row.status === 'OVER_BUDGET').map(row => row.name),
  };
}

export function evaluateSizes(values, budgets = SIZE_BUDGETS_BYTES) {
  const checks = Object.entries(budgets).map(([name, budgetBytes]) => {
    const measuredBytes = Number(values?.[name]);
    if (!Number.isFinite(measuredBytes)) return { name, budgetBytes, measuredBytes: null, status: 'NOT_MEASURED' };
    return { name, budgetBytes, measuredBytes, status: measuredBytes <= budgetBytes ? 'PASS' : 'OVER_BUDGET' };
  });
  return {
    contractVersion: PERFORMANCE_CONTRACT_VERSION,
    checks,
    pass: checks.every(row => row.status === 'PASS' || row.status === 'NOT_MEASURED'),
    overBudget: checks.filter(row => row.status === 'OVER_BUDGET').map(row => row.name),
  };
}

export function projectScale(project) {
  return {
    groups: project?.groups?.length || 0,
    teachers: project?.teachers?.length || 0,
    spaces: project?.spaces?.length || 0,
    activities: project?.activities?.length || 0,
    assignments: project?.assignments?.length || 0,
  };
}

export function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes || 0));
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  return `${(value / 1024 ** 3).toFixed(2)} GiB`;
}

export async function registerRobustServiceWorker({ onUpdate = () => {}, onStatus = () => {} } = {}) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {
    onStatus({ state: 'UNAVAILABLE', message: 'Service worker no disponible en este contexto.' });
    return null;
  }
  const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
  onStatus({ state: 'REGISTERED', message: 'Service worker registrado.' });
  if (registration.waiting) onUpdate(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) onUpdate(worker);
    });
  });
  return registration;
}

export async function activateWaitingWorker(registration) {
  const worker = registration?.waiting || registration?.installing;
  if (!worker) return false;
  worker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export async function requestServiceWorkerStatus(registration) {
  let worker = registration?.active || registration?.waiting || navigator.serviceWorker?.controller;
  if (!worker && 'serviceWorker' in navigator) {
    const ready = await Promise.race([
      navigator.serviceWorker.ready.catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 3000)),
    ]);
    worker = ready?.active || navigator.serviceWorker?.controller || null;
  }
  if (!worker || typeof MessageChannel === 'undefined') return null;
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      resolve(event.data || null);
    };
    worker.postMessage({ type: 'GET_STATUS' }, [channel.port2]);
  });
}

export async function clearRuntimeCaches(registration) {
  const worker = registration?.active || navigator.serviceWorker?.controller;
  if (!worker || typeof MessageChannel === 'undefined') return { ok: false, reason: 'NO_WORKER' };
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve({ ok: false, reason: 'TIMEOUT' }), 2500);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      resolve(event.data || { ok: false, reason: 'EMPTY_RESPONSE' });
    };
    worker.postMessage({ type: 'CLEAR_RUNTIME_CACHES' }, [channel.port2]);
  });
}

export function onlineState() {
  if (typeof navigator === 'undefined') return 'UNKNOWN';
  return navigator.onLine ? 'ONLINE' : 'OFFLINE';
}
