import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { VERSION_APLICACION, VERSION_FORMATO } from '../assets/js/dominio/modelo.js';

const raiz = new URL('..', import.meta.url).pathname;
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');
const version = JSON.parse(leer('VERSION.json'));
const paquete = JSON.parse(leer('package.json'));

assert.equal(VERSION_APLICACION, '1.4.1');
assert.equal(VERSION_FORMATO, '1.7');
assert.equal(version.version, '1.4.1');
assert.equal(paquete.version, '1.4.1');
assert.ok(version.estado.includes('AUDITORIA_CARGA_CATEGORIAS'));
assert.ok(existsSync(join(raiz, 'MATRIZ_COHERENCIA_CARGA_v1_4_1.md')));
assert.ok(existsSync(join(raiz, 'QA_v1_4_1.md')));
assert.ok(existsSync(join(raiz, 'AUDITORIA_v1_4_1.md')));
assert.ok(leer('README.md').includes('coherencia de carga'));
assert.ok(leer('assets/js/dominio/coherencia_carga.js').includes('auditarCoherenciaCarga'));
assert.ok(leer('assets/js/aplicacion.js').includes('renderDiagnosticoCoherenciaCarga'));
assert.ok(leer('assets/js/aplicacion.js').includes('Informe de coherencia de carga'));

console.log('v141_producto.test.mjs PASS');
