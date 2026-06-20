import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const codigo = readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf8');

assert.match(codigo, /function limpiarSeleccionTemporal/, 'Debe existir una función única para cancelar la selección temporal.');
assert.match(codigo, /data-accion="cancelar-seleccion"/, 'El editor debe mostrar botón Cancelar selección.');
assert.match(codigo, /if \(accion === 'cancelar-seleccion'\)/, 'La acción Cancelar selección debe estar conectada.');
assert.match(codigo, /function cambiarSeccion\(id\)[\s\S]*limpiarSeleccionTemporal/, 'Cambiar de sección debe limpiar la selección activa.');
assert.match(codigo, /revision_modo[\s\S]*limpiarSeleccionTemporal/, 'Cambiar la vista de revisión debe limpiar la selección.');
assert.match(codigo, /revision_entidad[\s\S]*limpiarSeleccionTemporal/, 'Cambiar el elemento de revisión debe limpiar la selección.');
assert.match(codigo, /app\.addEventListener\('click'[\s\S]*seccionActual !== 'revisar'[\s\S]*limpiarSeleccionTemporal/, 'Tocar una zona no interactiva del editor debe cancelar la selección.');
assert.match(codigo, /window\.addEventListener\('beforeunload'/, 'Debe pedir confirmación al cerrar o recargar si hay cambios pendientes.');
assert.match(codigo, /evento\.returnValue = ''/, 'beforeunload debe activar el aviso nativo del navegador.');
assert.match(codigo, /visibilitychange[\s\S]*guardarEmergencia\('pagina_oculta'\)/, 'Debe guardar copia de emergencia al ocultarse la página.');
assert.match(codigo, /pagehide[\s\S]*guardarEmergencia\('pagina_oculta'\)/, 'Debe guardar copia de emergencia en pagehide.');
assert.match(codigo, /function confirmarSustitucionHorario/, 'Debe confirmar antes de sustituir un horario existente.');
assert.match(codigo, /if \(!confirmarSustitucionHorario\(\)\)/, 'El cálculo debe usar la confirmación de sustitución de horario.');
assert.match(codigo, /function confirmarRecuperacion/, 'Las recuperaciones deben tener confirmación explícita.');
assert.match(codigo, /Va a recuperar la copia anterior/, 'La recuperación de copia anterior debe confirmarse aunque no haya cambios pendientes.');
assert.match(codigo, /Va a recuperar la copia de emergencia/, 'La recuperación de emergencia debe confirmarse aunque no haya cambios pendientes.');

console.log('seguridad_navegacion.test.mjs PASS');
