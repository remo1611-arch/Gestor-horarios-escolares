import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const version = JSON.parse(readFileSync(new URL('../VERSION.json', import.meta.url), 'utf8'));
assert.equal(version.version, '1.4.1', 'VERSION.json debe declarar 1.4.1');
assert.equal(version.formato_proyecto, 'horario-escolar-json-1.7', 'No debe cambiar el formato de proyecto');

const app = readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf8');
assert.ok(app.includes('Calidad del horario'), 'La interfaz debe mostrar calidad del horario');
assert.ok(app.includes('informe-calidad-horario'), 'Debe existir acción de informe de calidad');
assert.ok(app.includes('csv-calidad-horario'), 'Debe existir acción de CSV de calidad');

assert.ok(existsSync(new URL('../assets/js/dominio/calidad_horario.js', import.meta.url)), 'Debe existir módulo de calidad');
assert.ok(existsSync(new URL('../docs/historico/LEEME_v1_1.md', import.meta.url)), 'Debe existir LEEME v1.1');
assert.ok(existsSync(new URL('../docs/historico/QA_v1_1.md', import.meta.url)), 'Debe existir QA v1.1');
assert.ok(existsSync(new URL('../docs/historico/MATRIZ_CALIDAD_v1_1.md', import.meta.url)), 'Debe existir matriz de calidad v1.1');
console.log('v11_producto.test.mjs PASS');
