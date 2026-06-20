import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../../');
const phase = path.join(root, 'spikes/ortools_wasm/fase4b_deploy_gate');
const port = 8765 + Math.floor(Math.random() * 1000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};
function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const full = path.normalize(path.join(root, decoded));
  if (!full.startsWith(root)) throw new Error('Ruta fuera de root');
  return full;
}
const server = http.createServer((req, res) => {
  try {
    const full = safePath(req.url === '/' ? '/index.html' : req.url);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(full)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(full).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
});
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${port}`;
const resources = [
  '/spikes/ortools_wasm/fase4b_deploy_gate/browser/panel_deploy_gate_wasm.html',
  '/spikes/ortools_wasm/fase4b_deploy_gate/browser/worker_deploy_gate_wasm.mjs',
  '/spikes/ortools_wasm/vendor/cpsat-js/build/cpsat.wasm',
  '/spikes/ortools_wasm/vendor/cpsat-js/build/cpsat.mjs',
  '/spikes/ortools_wasm/vendor/cpsat-js/dist/index.js',
];
const results = [];
try {
  for (const resource of resources) {
    const r = await fetch(base + resource, { cache: 'no-store' });
    const buf = await r.arrayBuffer();
    const result = { resource, ok: r.ok, status: r.status, contentType: r.headers.get('content-type'), bytes: buf.byteLength };
    if (resource.endsWith('.wasm')) {
      await WebAssembly.compile(buf);
      result.webAssemblyCompile = true;
    }
    results.push(result);
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
for (const r of results) {
  assert.equal(r.ok, true, `${r.resource} debe servirse por HTTP local`);
  assert.ok(r.bytes > 0, `${r.resource} debe tener contenido`);
}
assert.equal(results.find(r => r.resource.endsWith('.wasm')).contentType, 'application/wasm');

const evidence = {
  phase: 'FASE_4B_DEPLOY_GATE_HTTP_PROBE_NODE',
  status: 'PASS',
  baseUrl: base,
  resources: results,
  dictamen: 'PASS_HTTP_RECURSOS_NODE_NO_ACREDITA_NAVEGADOR_FISICO',
};
const out = path.join(phase, 'evidencias/evidencia_fase4b_deploy_gate_http_probe.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
