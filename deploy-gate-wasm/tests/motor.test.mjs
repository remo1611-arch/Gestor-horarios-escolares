import assert from 'node:assert/strict';
import { crearProyectoVacio, nuevaPersona, nuevoGrupo, nuevoEspacio, nuevaActividad, asegurarDisponibilidad, normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { validarHorario, tieneGraves } from '../assets/js/motor/validador_horario.js';

const proyecto = crearProyectoVacio();
proyecto.centro.nombre = 'Centro de prueba';
proyecto.personas = [asegurarDisponibilidad({ ...nuevaPersona('Docente 1'), id: 'p1' }, proyecto), asegurarDisponibilidad({ ...nuevaPersona('Docente 2'), id: 'p2' }, proyecto)];
proyecto.grupos = [{ ...nuevoGrupo('Grupo A'), id: 'g1' }];
proyecto.espacios = [asegurarDisponibilidad({ ...nuevoEspacio('Aula 1'), id: 'e1' }, proyecto)];
proyecto.actividades = [
  { ...nuevaActividad('Actividad A'), id: 'a1', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1', sesiones_semanales: 2, duracion_tramos: 1, requiere_espacio: true },
  { ...nuevaActividad('Actividad B'), id: 'a2', grupo_id: 'g1', persona_id: 'p2', espacio_id: 'e1', sesiones_semanales: 2, duracion_tramos: 1, requiere_espacio: true }
];
const normalizado = normalizarProyecto(proyecto);
const resultado = generarHorario(normalizado, { intentos: 30, limite_ms: 2000 });
assert.equal(resultado.estado, 'COMPLETO', 'El motor debe completar el caso simple');
assert.equal(resultado.horario.length, 4, 'Debe colocar cuatro sesiones');
assert.equal(tieneGraves(validarHorario({ ...normalizado, horario: resultado.horario })), false, 'El horario generado no debe tener errores graves');
console.log('motor.test.mjs PASS');
