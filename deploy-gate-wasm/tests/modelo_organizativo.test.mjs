import assert from 'node:assert/strict';
import {
  crearProyectoVacio,
  normalizarProyecto,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  nuevaColocacion,
  asegurarDisponibilidad
} from '../assets/js/dominio/modelo.js';
import { validarHorario, tieneGraves } from '../assets/js/motor/validador_horario.js';

function proyectoBase() {
  const proyecto = crearProyectoVacio();
  proyecto.personas = ['Ana', 'Bea', 'Carlos'].map((nombre) => asegurarDisponibilidad(nuevaPersona(nombre), proyecto));
  const grupoMatriz = nuevoGrupo('5.º Primaria');
  const religion = { ...nuevoGrupo('5.º Primaria · Religión'), grupo_matriz_id: grupoMatriz.id, tipo_agrupamiento: 'Subgrupo', permite_paralelo_con_matriz: true };
  const atencion = { ...nuevoGrupo('5.º Primaria · Atención educativa'), grupo_matriz_id: grupoMatriz.id, tipo_agrupamiento: 'Subgrupo', permite_paralelo_con_matriz: true };
  proyecto.grupos = [grupoMatriz, religion, atencion];
  proyecto.espacios = ['Aula 1', 'Aula 2', 'Patio'].map((nombre) => asegurarDisponibilidad(nuevoEspacio(nombre), proyecto));
  return normalizarProyecto(proyecto);
}

{
  const proyecto = proyectoBase();
  const [matriz, religion, atencion] = proyecto.grupos;
  const actReligion = { ...nuevaActividad('Religión'), tipo: 'Religión', grupo_id: religion.id, persona_id: proyecto.personas[0].id, espacio_id: proyecto.espacios[0].id, requiere_espacio: true, sesiones_semanales: 1 };
  const actAtencion = { ...nuevaActividad('Atención educativa'), tipo: 'Atención educativa', grupo_id: atencion.id, persona_id: proyecto.personas[1].id, espacio_id: proyecto.espacios[1].id, requiere_espacio: true, sesiones_semanales: 1 };
  proyecto.actividades = normalizarProyecto({ ...proyecto, actividades: [actReligion, actAtencion] }).actividades;
  proyecto.horario = [
    nuevaColocacion({ actividad_id: proyecto.actividades[0].id, dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: religion.id, persona_id: proyecto.personas[0].id, espacio_id: proyecto.espacios[0].id }),
    nuevaColocacion({ actividad_id: proyecto.actividades[1].id, dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: atencion.id, persona_id: proyecto.personas[1].id, espacio_id: proyecto.espacios[1].id })
  ];
  const incidencias = validarHorario(proyecto);
  assert.equal(tieneGraves(incidencias), false, 'dos subgrupos distintos pueden colocarse en paralelo sin conflicto de grupo');
}

{
  const proyecto = proyectoBase();
  const actividad = { ...nuevaActividad('Matemáticas con apoyo'), tipo: 'Docencia compartida', persona_id: proyecto.personas[0].id, docentes_acompanantes_ids: [proyecto.personas[1].id], docentes_necesarios: 2, grupo_id: proyecto.grupos[0].id, espacio_id: proyecto.espacios[0].id, requiere_espacio: true, sesiones_semanales: 1 };
  proyecto.actividades = normalizarProyecto({ ...proyecto, actividades: [actividad] }).actividades;
  proyecto.horario = [nuevaColocacion({ actividad_id: proyecto.actividades[0].id, dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: proyecto.grupos[0].id, persona_id: proyecto.personas[0].id, docentes_acompanantes_ids: [proyecto.personas[1].id], espacio_id: proyecto.espacios[0].id })];
  assert.equal(tieneGraves(validarHorario(proyecto)), false, 'docencia compartida con dos docentes cubre el mínimo');

  proyecto.horario.push(nuevaColocacion({ actividad_id: proyecto.actividades[0].id, dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: proyecto.grupos[1].id, persona_id: proyecto.personas[1].id, espacio_id: proyecto.espacios[1].id }));
  const codigos = validarHorario(proyecto).map((i) => i.codigo);
  assert.ok(codigos.includes('PERSONA_SOLAPADA'), 'el docente acompañante también ocupa horario y no puede solaparse');
}

{
  const proyecto = proyectoBase();
  proyecto.tramos.find((tramo) => tramo.id === 'tramo_3').admite_servicios = true;
  proyecto.tramos.find((tramo) => tramo.id === 'tramo_3').tipo_tramo = 'Recreo';
  const servicio = { ...nuevaActividad('Guardia de patio'), tipo: 'Guardia de patio', clasificacion_horaria: 'Servicio de centro', requiere_grupo: false, computa_lectivo: false, computa_no_lectivo: true, persona_id: proyecto.personas[0].id, docentes_acompanantes_ids: [proyecto.personas[2].id], docentes_necesarios: 2, grupo_id: '', espacio_id: proyecto.espacios[2].id, requiere_espacio: true, sesiones_semanales: 1 };
  proyecto.actividades = normalizarProyecto({ ...proyecto, actividades: [servicio] }).actividades;
  proyecto.horario = [nuevaColocacion({ actividad_id: proyecto.actividades[0].id, dia_id: 'dia_2', tramo_id: 'tramo_3', persona_id: proyecto.personas[0].id, docentes_acompanantes_ids: [proyecto.personas[2].id], grupo_id: '', espacio_id: proyecto.espacios[2].id })];
  assert.equal(tieneGraves(validarHorario(proyecto)), false, 'servicio de centro sin grupo y con dos docentes es válido');

  proyecto.actividades[0].docentes_acompanantes_ids = [];
  proyecto.horario[0].docentes_acompanantes_ids = [];
  const codigos = validarHorario(proyecto).map((i) => i.codigo);
  assert.ok(codigos.includes('COBERTURA_DOCENTE_INSUFICIENTE') || codigos.includes('SERVICIO_SIN_COBERTURA_MINIMA'), 'la cobertura mínima se valida');
}

console.log('modelo_organizativo.test.mjs PASS');
