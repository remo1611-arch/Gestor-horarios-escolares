import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSION_APLICACION, VERSION_FORMATO } from '../assets/js/dominio/modelo.js';

const raiz = new URL('..', import.meta.url).pathname;
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');
const version = JSON.parse(leer('VERSION.json'));
const pkg = JSON.parse(leer('package.json'));

assert.equal(version.version, '1.4.1');
assert.equal(pkg.version, '1.4.1');
assert.equal(VERSION_APLICACION, '1.4.1');
assert.equal(VERSION_FORMATO, '1.7');
assert.equal(version.formato_proyecto, 'horario-escolar-json-1.7');
assert.ok(leer('README.md').includes('v1.4.1'));

for (const ruta of [
  'ejemplos/ejemplo_ies_sencillo.json',
  'ejemplos/ejemplo_ceip_sencillo.json',
  'ejemplos/ejemplo_cifp_talleres.json',
  'ejemplos/ejemplo_cpi_sencillo.json',
  'ejemplos/ejemplo_cee_sencillo.json',
  'ejemplos/ejemplo_centro_complejo_sintetico.json',
  'ejemplos/ejemplo_centro_exigente_sintetico.json',
]) {
  const ejemplo = JSON.parse(leer(ruta));
  assert.equal(ejemplo.aplicacion.version, '1.4.1', ruta);
  assert.equal(ejemplo.version_formato, '1.7', ruta);
}

console.log('coherencia_version.test.mjs PASS');
