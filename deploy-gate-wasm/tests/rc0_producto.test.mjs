import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');

const version = JSON.parse(leer('VERSION.json'));
assert.equal(version.version, '1.4.1');
assert.equal(version.formato_proyecto, 'horario-escolar-json-1.7');
assert.ok(version.base_tecnica.includes('1.0-rc1'), 'La base técnica debe declarar RC1 como origen');

const paquete = JSON.parse(leer('package.json'));
assert.equal(paquete.version, '1.4.1');
assert.ok(paquete.scripts.test.includes('rc0_producto.test.mjs'));

const modelo = leer('assets/js/dominio/modelo.js');
assert.ok(modelo.includes("VERSION_APLICACION = '1.4.1'"));
assert.ok(modelo.includes("VERSION_FORMATO = '1.7'"));

for (const ruta of [
  '.nojekyll',
  'README.md',
  'docs/historico/GUIA_USO_RC0.md',
  'docs/historico/GITHUB_PAGES_RC0.md',
  'docs/historico/QA_FISICO_RC0.md',
  'docs/historico/MATRIZ_FUNCIONES_RC0.md',
  'docs/historico/LEEME_v1_0_RC0.md',
  'docs/historico/QA_v1_0_RC0.md',
]) {
  assert.ok(existsSync(join(raiz, ruta)), `Falta ${ruta}`);
}

const matriz = leer('docs/historico/MATRIZ_FUNCIONES_RC0.md');
assert.ok(matriz.includes('DC / Docencia complementaria'));
assert.ok(matriz.includes('Guardias de entrada/salida/recreo/patio'));
assert.ok(matriz.includes('Religión/Atención educativa simultáneas'));
assert.ok(matriz.includes('Motor óptimo matemático'));

const guia = leer('docs/historico/GUIA_USO_RC0.md');
assert.ok(guia.includes('Las guardias no se crean aquí'));
assert.ok(guia.includes('toque corto'));

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

console.log('rc0_producto.test.mjs PASS');
