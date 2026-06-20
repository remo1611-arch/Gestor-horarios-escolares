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
assert.ok(version.estado.includes('MOTOR_WEB_AVANZADO'));
assert.ok(existsSync(join(raiz, 'MATRIZ_MOTOR_v1_4.md')));
assert.ok(existsSync(join(raiz, 'QA_v1_4.md')));
assert.ok(leer('README.md').includes('Web Worker'));
assert.ok(leer('assets/js/aplicacion.js').includes('renderProgresoCalculo'));
assert.ok(leer('assets/js/motor/trabajador_generacion.js').includes("tipo: 'progreso'"));
assert.ok(leer('assets/js/motor/generador_horario.js').includes('dominioBaseActividad'));
assert.ok(leer('assets/js/motor/generador_horario.js').includes('intentarReparacionBasica'));

console.log('v14_producto.test.mjs PASS');
