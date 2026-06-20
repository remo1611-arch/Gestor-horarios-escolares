import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const raizDocs = new Set(readdirSync(raiz).filter((n) => n.endsWith('.md')));
const activos = new Set(['README.md', 'LEEME_v1_4.md', 'LEEME_v1_4_1.md', 'GUIA_USO.md', 'MATRIZ_FUNCIONES.md', 'QA_ACTUAL.md', 'QA_FISICO.md', 'GITHUB_PAGES.md', 'AUDITORIA_v1_4.md', 'AUDITORIA_v1_4_1.md', 'MATRIZ_MOTOR_v1_4.md', 'MATRIZ_COHERENCIA_CARGA_v1_4_1.md', 'QA_v1_4.md', 'QA_v1_4_1.md']);

for (const nombre of raizDocs) {
  assert.ok(activos.has(nombre), `Documento histórico no debe permanecer activo en raíz: ${nombre}`);
}

for (const nombre of activos) {
  assert.ok(existsSync(join(raiz, nombre)), `Falta documento activo: ${nombre}`);
}

for (const nombre of ['LEEME_v1_3.md', 'QA_v1_3.md', 'MATRIZ_GESTION_DIARIA_v1_3.md', 'LEEME_v1_0_RC0.md']) {
  assert.ok(existsSync(join(raiz, 'docs/historico', nombre)), `Falta histórico trazable: ${nombre}`);
}

const readme = readFileSync(join(raiz, 'README.md'), 'utf8');
assert.ok(readme.startsWith('# Generador de Horarios Escolares · v1.4.1'));
assert.ok(readme.toLowerCase().includes('motor web avanzado'));
assert.ok(readme.toLowerCase().includes('coherencia de carga'));
assert.ok(readme.includes('docs/historico/'));
assert.ok(readme.includes('No promete motor óptimo matemático'));

const matriz = readFileSync(join(raiz, 'MATRIZ_FUNCIONES.md'), 'utf8');
assert.ok(matriz.includes('Soportado'));
assert.ok(matriz.includes('Parcialmente soportado'));
assert.ok(matriz.includes('No soportado'));
assert.ok(matriz.includes('Pendiente de verificación real'));

console.log('auditoria_consolidacion.test.mjs PASS');
