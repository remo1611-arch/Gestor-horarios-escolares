const APP_VERSION = '0.6.0-alpha.25';
const CONTRACT_VERSION = 'service-worker-update-contract-2.0-web-final';
const PRODUCT_VERSION = '1.0.0-web-final-candidate.1';
const CACHE_PREFIX = 'ghe-web-final-candidate-1-';
const CORE_CACHE = `${CACHE_PREFIX}${APP_VERSION}-${PRODUCT_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_PREFIX}${APP_VERSION}-${PRODUCT_VERSION}-runtime`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./.nojekyll",
  "./CONTENIDO_PAQUETE_USUARIO.md",
  "./LEEME_P12_6_WEB_PUBLIC_QA_GATE.md",
  "./LICENSE",
  "./PRIVACY.md",
  "./PRODUCT_VERSION.json",
  "./PUBLICACION_GITHUB.md",
  "./PUBLIC_RELEASE_INFO.json",
  "./README.md",
  "./README_GITHUB_PAGES.md",
  "./README_USUARIO.md",
  "./SECURITY.md",
  "./VERSION.json",
  "./assets/css/app.css",
  "./assets/js/app.mjs",
  "./assets/js/canonical_json.mjs",
  "./assets/js/core.mjs",
  "./assets/js/cp_sat_client.mjs",
  "./assets/js/daily.mjs",
  "./assets/js/documents.mjs",
  "./assets/js/educational_domain_4.mjs",
  "./assets/js/example_library.mjs",
  "./assets/js/generation_runner.mjs",
  "./assets/js/generation_worker.mjs",
  "./assets/js/generator.mjs",
  "./assets/js/import_export.mjs",
  "./assets/js/manual_editor.mjs",
  "./assets/js/organizational_domain_4_1.mjs",
  "./assets/js/p12_web_solver.mjs",
  "./assets/js/product_accessibility_usability.mjs",
  "./assets/js/product_daily.mjs",
  "./assets/js/product_documents.mjs",
  "./assets/js/product_generation.mjs",
  "./assets/js/product_independent_validator.mjs",
  "./assets/js/product_mode.mjs",
  "./assets/js/product_multidimensional_quality.mjs",
  "./assets/js/product_review.mjs",
  "./assets/js/product_schedule_view.mjs",
  "./assets/js/product_semantic_assistants.mjs",
  "./assets/js/project_file.mjs",
  "./assets/js/project_wizard.mjs",
  "./assets/js/project_wizard_ui.mjs",
  "./assets/js/public_labels.mjs",
  "./assets/js/resilience.mjs",
  "./assets/js/semantic_catalog.mjs",
  "./assets/js/semantic_context.mjs",
  "./assets/js/semantic_engine.mjs",
  "./assets/js/storage.mjs",
  "./assets/js/ui_actions.mjs",
  "./assets/js/xlsx.mjs",
  "./manifest.webmanifest",
  "./p12/P12_0_CONTRATO_MOTOR_WEB.md",
  "./p12/P12_0_GATE_MATRIX.csv",
  "./p12/P12_0_TEST_CORPUS.json",
  "./p12/P12_0_WEB_SOLVER_CONTRACT.json",
  "./p12/P12_1_GATE_RESULTS.json",
  "./p12/P12_1_WEB_SOLVER_MINIMO.md",
  "./p12/P12_1_WEB_SOLVER_RUNTIME_CONTRACT.json",
  "./p12/P12_2_WEB_SOLVER_DOMINIO_ORGANIZATIVO_LIGERO.md",
  "./p12/P12_2_WEB_SOLVER_ORG_LIGHT_CONTRACT.json",
  "./p12/P12_3_GATE_MATRIX.csv",
  "./p12/P12_3_PARIDAD_CP_SAT_ORACULO.md",
  "./p12/P12_3_PARIDAD_CP_SAT_ORACULO_CONTRACT.json",
  "./p12/P12_4_GATE_MATRIX.csv",
  "./p12/P12_4_PUBLICACION_WEB_GITHUB_PAGES.md",
  "./p12/P12_4_STATIC_WEB_PUBLICATION_CONTRACT.json",
  "./p12/P12_5_GATE_MATRIX.csv",
  "./p12/P12_5_WEB_SOLVER_CENTRO_MEDIO.md",
  "./p12/P12_5_WEB_SOLVER_MEDIUM_CONTRACT.json",
  "./p12/P12_6_GATE_MATRIX.csv",
  "./p12/P12_6_WEB_PUBLIC_QA_GATE.md",
  "./p12/P12_6_WEB_PUBLIC_QA_GATE_CONTRACT.json",
  "./p12/P12_ROADMAP.md",
  "./p12/corpus/P12_T00_MINI_SINGLE_WEEK_KNOWN.json",
  "./p12/corpus/P12_T01_MINI_SHARED_TEACHER_SPACE.json",
  "./data/fixture_centro_completo_a6.json",
  "./data/P11-S1_SYNTHETIC_REALISTIC.json",
  "./p12/corpus/P12_T02_MINI_INFEASIBLE_OVERLOAD.json",
  "./plantillas/01_materias.csv",
  "./plantillas/02_docentes.csv",
  "./plantillas/03_grupos.csv",
  "./plantillas/04_espacios.csv",
  "./plantillas/05_actividades.csv",
  "./plantillas/06_disponibilidad.csv",
  "./plantillas/LEEME_PLANTILLAS.md",
  "./sw.js"
];

function normalizedRequest(request) {
  const url = new URL(request.url);
  url.search = '';
  return new Request(url.toString(), { method: 'GET', headers: request.headers, credentials: 'same-origin' });
}
async function precache() {
  const cache = await caches.open(CORE_CACHE);
  for (const asset of CORE_ASSETS) {
    const response = await fetch(asset, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo precachear ${asset}: HTTP ${response.status}`);
    await cache.put(asset, response);
  }
}
self.addEventListener('install', event => { event.waitUntil(precache()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && ![CORE_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
function shouldBypass(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return true;
  if (/\.(?:ghfproject|xlsx|zip)$/i.test(url.pathname)) return true;
  if (url.pathname.includes('/api/') || url.pathname.includes('/solver/')) return true;
  return false;
}
async function navigationResponse(request) {
  try { const response = await fetch(request, { cache: 'no-store' }); if (response.ok) return response; } catch {}
  const cache = await caches.open(CORE_CACHE);
  return (await cache.match(normalizedRequest(request))) || (await cache.match('./index.html')) || new Response('Aplicación no disponible sin conexión.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
async function staticResponse(request) {
  const normalized = normalizedRequest(request);
  const core = await caches.open(CORE_CACHE);
  const cachedCore = await core.match(normalized) || await core.match(request);
  if (cachedCore) return cachedCore;
  const runtime = await caches.open(RUNTIME_CACHE);
  const cachedRuntime = await runtime.match(normalized);
  const networkPromise = fetch(request).then(async response => {
    if (response.ok && response.type === 'basic' && !/no-store/i.test(response.headers.get('Cache-Control') || '')) await runtime.put(normalized, response.clone());
    return response;
  });
  if (cachedRuntime) { networkPromise.catch(() => {}); return cachedRuntime; }
  try { return await networkPromise; } catch { return new Response('Recurso no disponible sin conexión.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (shouldBypass(event.request, url)) return;
  if (event.request.mode === 'navigate') event.respondWith(navigationResponse(event.request));
  else event.respondWith(staticResponse(event.request));
});
self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (type === 'GET_STATUS') {
    event.ports?.[0]?.postMessage({ ok: true, appVersion: APP_VERSION, productVersion: PRODUCT_VERSION, contractVersion: CONTRACT_VERSION, coreCache: CORE_CACHE, runtimeCache: RUNTIME_CACHE, coreAssets: CORE_ASSETS.length });
    return;
  }
  if (type === 'CLEAR_RUNTIME_CACHES') {
    event.waitUntil((async () => { const deleted = await caches.delete(RUNTIME_CACHE); event.ports?.[0]?.postMessage({ ok: true, deleted, preservedCore: CORE_CACHE }); })());
  }
});
