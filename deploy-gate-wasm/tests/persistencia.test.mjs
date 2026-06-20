import assert from 'node:assert/strict';
import { crearProyectoVacio, normalizarProyecto, nuevaPersona, asegurarDisponibilidad } from '../assets/js/dominio/modelo.js';
import { prepararProyectoParaGuardar, validarProyectoSerializable, guardarCopiaEmergenciaLocal, recuperarCopiaEmergenciaLocal } from '../assets/js/persistencia/almacenamiento_local.js';
import { exportarProyectoJSON, importarProyectoJSON } from '../assets/js/persistencia/importar_exportar.js';

const proyecto = normalizarProyecto(crearProyectoVacio());
proyecto.centro.nombre = 'Centro con escritura segura';
proyecto.personas = [asegurarDisponibilidad({ ...nuevaPersona('Docente'), id: 'p1' }, proyecto)];

const preparado = prepararProyectoParaGuardar(proyecto);
assert.notEqual(preparado, proyecto, 'La preparación de escritura debe devolver una copia, no el objeto original');
assert.equal(preparado.centro.nombre, proyecto.centro.nombre, 'La copia debe conservar los datos del proyecto');
assert.ok(preparado.metadatos.guardado_local, 'La copia debe registrar fecha de guardado local');

const serializacion = validarProyectoSerializable(preparado);
assert.equal(serializacion.correcto, true, 'El proyecto preparado debe ser serializable');
assert.ok(serializacion.bytes > 0, 'Debe informar tamaño de escritura');


const memoriaLocal = new Map();
const localStorageFalso = {
  setItem(clave, valor) { memoriaLocal.set(clave, String(valor)); },
  getItem(clave) { return memoriaLocal.has(clave) ? memoriaLocal.get(clave) : null; },
  removeItem(clave) { memoriaLocal.delete(clave); }
};
globalThis.window = { localStorage: localStorageFalso };
globalThis.localStorage = localStorageFalso;

const emergencia = guardarCopiaEmergenciaLocal(preparado, 'prueba_editor');
assert.equal(emergencia.correcto, true, 'Debe poder guardar copia de emergencia en almacenamiento básico');
const recuperadaEmergencia = recuperarCopiaEmergenciaLocal();
assert.equal(recuperadaEmergencia.correcto, true, 'Debe poder recuperar la copia de emergencia');
assert.equal(recuperadaEmergencia.proyecto.centro.nombre, 'Centro con escritura segura', 'La copia de emergencia debe conservar el centro');
assert.match(recuperadaEmergencia.mensaje, /prueba_editor/, 'Debe registrar el motivo de la copia de emergencia');

delete globalThis.window;
delete globalThis.localStorage;

const texto = exportarProyectoJSON(preparado);
const importado = importarProyectoJSON(texto);
assert.equal(importado.proyecto.centro.nombre, 'Centro con escritura segura', 'La exportación/importación JSON debe conservar el centro');

const circular = {};
circular.self = circular;
const circularResultado = validarProyectoSerializable(circular);
assert.equal(circularResultado.correcto, false, 'Debe rechazar estructuras no serializables');

console.log('persistencia.test.mjs PASS');
