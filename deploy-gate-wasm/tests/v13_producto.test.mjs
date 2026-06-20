import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearProyectoVacio, normalizarProyecto, VERSION_APLICACION, VERSION_FORMATO } from '../assets/js/dominio/modelo.js';
import { normalizarGestionDiaria } from '../assets/js/dominio/gestion_diaria.js';
import { generarCsvGestionDiaria, generarInformeGestionDiaria } from '../assets/js/documentos/exportar.js';

assert.equal(VERSION_APLICACION, '1.4.1');
assert.equal(VERSION_FORMATO, '1.7');
const proyecto = normalizarProyecto(crearProyectoVacio());
assert.deepEqual(normalizarGestionDiaria(proyecto), { ausencias: [], coberturas: [], incidencias: [] });
assert.ok(fs.readFileSync('README.md','utf8').includes('v1.4.1'));
assert.ok(generarCsvGestionDiaria(proyecto).startsWith('Tipo;Estado;Día'));
assert.ok(generarInformeGestionDiaria(proyecto).includes('Informe de gestión diaria'));
console.log('v13_producto.test.mjs PASS');
