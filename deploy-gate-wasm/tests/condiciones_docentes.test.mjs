import assert from 'node:assert/strict';
import { crearProyectoVacio, nuevaPersona, nuevoGrupo, nuevoEspacio, nuevaActividad, nuevaColocacion, asegurarDisponibilidad, normalizarProyecto, claveHueco } from '../assets/js/dominio/modelo.js';
import { validarHorario, tieneGraves } from '../assets/js/motor/validador_horario.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { evaluarMovimientoSesion } from '../assets/js/motor/editor_manual.js';

function proyectoBase() {
  const p = crearProyectoVacio();
  p.personas = [asegurarDisponibilidad(nuevaPersona('Docente'), p)];
  p.grupos = [nuevoGrupo('Grupo')];
  p.espacios = [asegurarDisponibilidad(nuevoEspacio('Aula'), p)];
  p.actividades = [{
    ...nuevaActividad('Materia condicionada'),
    grupo_id: p.grupos[0].id,
    persona_id: p.personas[0].id,
    espacio_id: p.espacios[0].id,
    requiere_espacio: true,
    sesiones_semanales: 2,
    duracion_tramos: 1,
    condiciones: {
      ...nuevaActividad().condiciones,
      dias_prohibidos: ['dia_1'],
      tramos_prohibidos: ['tramo_6'],
      huecos_prohibidos: [claveHueco('dia_2', 'tramo_2')],
      una_sesion_por_dia: true,
      prohibir_ultima_hora: true
    }
  }];
  return normalizarProyecto(p);
}

{
  const p = proyectoBase();
  p.horario = [nuevaColocacion({
    actividad_id: p.actividades[0].id,
    grupo_id: p.grupos[0].id,
    persona_id: p.personas[0].id,
    espacio_id: p.espacios[0].id,
    dia_id: 'dia_1',
    tramo_id: 'tramo_1'
  })];
  const incidencias = validarHorario(p);
  assert.ok(incidencias.some((i) => i.codigo === 'ACTIVIDAD_DIA_PROHIBIDO'));
  assert.ok(tieneGraves(incidencias));
}

{
  const p = proyectoBase();
  const resultado = generarHorario(p, { limite_ms: 1800, intentos: 90 });
  assert.notEqual(resultado.estado, 'DATOS_INCOMPLETOS');
  assert.equal(validarHorario({ ...p, horario: resultado.horario }).filter((i) => i.nivel === 'grave').length, 0);
  for (const sesion of resultado.horario) {
    assert.notEqual(sesion.dia_id, 'dia_1');
    assert.notEqual(sesion.tramo_id, 'tramo_6');
    assert.notEqual(claveHueco(sesion.dia_id, sesion.tramo_id), claveHueco('dia_2', 'tramo_2'));
  }
}

{
  const p = proyectoBase();
  p.horario = [nuevaColocacion({
    actividad_id: p.actividades[0].id,
    grupo_id: p.grupos[0].id,
    persona_id: p.personas[0].id,
    espacio_id: p.espacios[0].id,
    dia_id: 'dia_3',
    tramo_id: 'tramo_1'
  })];
  const evaluacion = evaluarMovimientoSesion(p, p.horario[0].id, { dia_id: 'dia_1', tramo_id: 'tramo_1' });
  assert.equal(evaluacion.permitido, false);
  assert.match(evaluacion.mensaje, /día prohibido/i);
}

console.log('condiciones_docentes.test.mjs PASS');
