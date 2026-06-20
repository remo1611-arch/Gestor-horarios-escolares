import assert from 'node:assert/strict';
import { crearProyectoVacio, nuevaPersona, nuevoGrupo, nuevoEspacio, nuevaActividad, nuevaColocacion, asegurarDisponibilidad, normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { evaluarMovimientoSesion, aplicarMovimientoSesion, crearSesionPendiente, actividadesConSesionesPendientes } from '../assets/js/motor/editor_manual.js';
import { validarHorario, tieneGraves } from '../assets/js/motor/validador_horario.js';

const proyecto = crearProyectoVacio();
proyecto.personas = [asegurarDisponibilidad({ ...nuevaPersona('Docente 1'), id: 'p1' }, proyecto), asegurarDisponibilidad({ ...nuevaPersona('Docente 2'), id: 'p2' }, proyecto)];
proyecto.grupos = [{ ...nuevoGrupo('Grupo A'), id: 'g1' }];
proyecto.espacios = [asegurarDisponibilidad({ ...nuevoEspacio('Aula 1'), id: 'e1' }, proyecto), asegurarDisponibilidad({ ...nuevoEspacio('Aula 2'), id: 'e2' }, proyecto)];
proyecto.actividades = [
  { ...nuevaActividad('Lengua'), id: 'a1', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1', sesiones_semanales: 2, duracion_tramos: 1, requiere_espacio: true },
  { ...nuevaActividad('Matemáticas'), id: 'a2', grupo_id: 'g1', persona_id: 'p2', espacio_id: 'e2', sesiones_semanales: 1, duracion_tramos: 1, requiere_espacio: true }
];
const base = normalizarProyecto(proyecto);
base.horario = [
  nuevaColocacion({ id: 's1', actividad_id: 'a1', dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1', duracion_tramos: 1 }),
  nuevaColocacion({ id: 's2', actividad_id: 'a2', dia_id: 'dia_1', tramo_id: 'tramo_2', grupo_id: 'g1', persona_id: 'p2', espacio_id: 'e2', duracion_tramos: 1 })
];
base.horario[0].id = 's1';
base.horario[1].id = 's2';

const permitido = evaluarMovimientoSesion(base, 's1', { dia_id: 'dia_2', tramo_id: 'tramo_1', espacio_id: 'e1' });
assert.equal(permitido.permitido, true, 'Debe permitir mover a un hueco libre');
const aplicado = aplicarMovimientoSesion(base, 's1', { dia_id: 'dia_2', tramo_id: 'tramo_1', espacio_id: 'e1' });
assert.equal(aplicado.correcto, true, 'Debe aplicar el movimiento válido');
assert.equal(tieneGraves(validarHorario(aplicado.proyecto)), false, 'El movimiento válido no debe crear errores graves');

const noPermitido = evaluarMovimientoSesion(base, 's1', { dia_id: 'dia_1', tramo_id: 'tramo_2', espacio_id: 'e1' });
assert.equal(noPermitido.permitido, false, 'Debe bloquear un movimiento con solapamiento de grupo');

const pendientesAntes = actividadesConSesionesPendientes(base);
assert.equal(pendientesAntes.some((item) => item.actividad.id === 'a1' && item.pendientes === 1), true, 'Debe detectar una sesión pendiente');
const creada = crearSesionPendiente(base, 'a1');
assert.equal(creada.correcto, true, 'Debe crear una sesión pendiente en un hueco válido');
assert.equal(tieneGraves(validarHorario(creada.proyecto)), false, 'La sesión pendiente no debe crear errores graves');
console.log('editor_manual.test.mjs PASS');
