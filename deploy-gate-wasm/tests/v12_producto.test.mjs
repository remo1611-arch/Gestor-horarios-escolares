import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION_APLICACION, VERSION_FORMATO } from '../assets/js/dominio/modelo.js';
import { PLANTILLAS_CSV } from '../assets/js/persistencia/importacion_csv.js';

assert.equal(VERSION_APLICACION, '1.4.1');
assert.equal(VERSION_FORMATO, '1.7');
for (const clave of ['personas', 'grupos', 'espacios', 'tramos', 'actividades']) {
  assert.ok(PLANTILLAS_CSV[clave], `Falta plantilla ${clave}`);
  assert.ok(PLANTILLAS_CSV[clave].texto.includes('nombre'), `Plantilla ${clave} sin columna nombre`);
}
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(html.includes('assets/js/aplicacion.js'));
const app = readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf8');
assert.ok(app.includes('Importación CSV'));
assert.ok(app.includes('data-importar-csv'));
assert.ok(app.includes('data-plantilla-csv'));
console.log('v12_producto.test.mjs PASS');
