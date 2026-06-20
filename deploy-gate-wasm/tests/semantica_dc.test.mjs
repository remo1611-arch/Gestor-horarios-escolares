import assert from 'node:assert/strict';
import {
  crearProyectoVacio,
  nuevaActividad,
  normalizarProyecto,
  CLASIFICACIONES_HORARIAS
} from '../assets/js/dominio/modelo.js';

assert.ok(CLASIFICACIONES_HORARIAS.includes('Docencia complementaria'), 'la clasificación Docencia complementaria debe existir');

{
  const proyecto = crearProyectoVacio();
  const guardia = { ...nuevaActividad('Guardia de recreo'), tipo: 'Guardia de recreo', clasificacion_horaria: 'Servicio de centro' };
  const normalizado = normalizarProyecto({ ...proyecto, actividades: [guardia] });
  assert.equal(normalizado.actividades[0].clasificacion_horaria, 'Docencia complementaria', 'las guardias se migran a DC');
  assert.equal(normalizado.actividades[0].computa_lectivo, false);
  assert.equal(normalizado.actividades[0].computa_no_lectivo, true);
}

{
  const proyecto = crearProyectoVacio();
  const coordinacion = { ...nuevaActividad('Coordinación docente'), tipo: 'Coordinación', clasificacion_horaria: 'No lectiva' };
  const normalizado = normalizarProyecto({ ...proyecto, actividades: [coordinacion] });
  assert.equal(normalizado.actividades[0].clasificacion_horaria, 'Docencia complementaria', 'coordinación debe entenderse como DC');
}

{
  const proyecto = crearProyectoVacio();
  const compartida = { ...nuevaActividad('Matemáticas con apoyo'), tipo: 'Docencia compartida', clasificacion_horaria: 'Lectiva' };
  const normalizado = normalizarProyecto({ ...proyecto, actividades: [compartida] });
  assert.equal(normalizado.actividades[0].clasificacion_horaria, 'Lectiva', 'docencia compartida no es DC');
  assert.equal(normalizado.actividades[0].computa_lectivo, true);
}

console.log('semantica_dc.test.mjs PASS');
