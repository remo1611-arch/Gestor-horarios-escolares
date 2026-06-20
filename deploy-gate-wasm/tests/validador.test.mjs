import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizarProyecto, nuevaColocacion } from '../assets/js/dominio/modelo.js';
import { validarDatosProyecto, validarHorario, tieneGraves } from '../assets/js/motor/validador_horario.js';

const ejemplo = JSON.parse(fs.readFileSync(new URL('../ejemplos/ejemplo_ies_sencillo.json', import.meta.url), 'utf8'));
const proyecto = normalizarProyecto(ejemplo);
const datos = validarDatosProyecto(proyecto);
assert.equal(datos.filter((i) => i.nivel === 'grave').length, 0, 'El ejemplo IES no debe tener errores graves de datos');

const a1 = proyecto.actividades[0];
const a2 = proyecto.actividades[1];
proyecto.horario = [
  nuevaColocacion({ actividad_id: a1.id, dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: a1.grupo_id, persona_id: a1.persona_id, espacio_id: a1.espacio_id, duracion_tramos: 1 }),
  nuevaColocacion({ actividad_id: a2.id, dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: a2.grupo_id, persona_id: a2.persona_id, espacio_id: a2.espacio_id, duracion_tramos: 1 })
];
const incidencias = validarHorario(proyecto);
assert.ok(tieneGraves(incidencias), 'Debe detectar solapamiento de grupo');
assert.ok(incidencias.some((i) => i.codigo === 'GRUPO_SOLAPADO'), 'Debe existir incidencia GRUPO_SOLAPADO');
console.log('validador.test.mjs PASS');
