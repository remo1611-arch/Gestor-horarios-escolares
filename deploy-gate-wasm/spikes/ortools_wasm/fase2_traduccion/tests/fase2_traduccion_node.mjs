import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverHorarioCpSatFase2 } from '../src/traductor_cp_sat_fase2.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenciaDir = path.resolve(__dirname, '../evidencias');
fs.mkdirSync(evidenciaDir, { recursive: true });

function baseProyecto({ dias = 2, tramos = 2 } = {}) {
  const diaList = Array.from({ length: dias }, (_, i) => ({ id: `dia_${i + 1}`, nombre: ['Lunes', 'Martes', 'Miércoles'][i] || `Día ${i + 1}`, orden: i + 1 }));
  const tramoList = Array.from({ length: tramos }, (_, i) => ({ id: `tramo_${i + 1}`, nombre: `${i + 1}.ª hora`, orden: i + 1, duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false, computa_permanencia: true }));
  const disponibilidad = {};
  for (const dia of diaList) for (const tramo of tramoList) disponibilidad[`${dia.id}__${tramo.id}`] = true;
  return {
    version_formato: '1.7',
    centro: { nombre: 'Centro mínimo Fase 2', tipo: 'IES', curso_academico: '2026-2027' },
    dias: diaList,
    tramos: tramoList,
    personas: [
      { id: 'p1', nombre: 'Docente 1', disponibilidad },
      { id: 'p2', nombre: 'Docente 2', disponibilidad },
    ],
    grupos: [{ id: 'g1', nombre: '1º A' }],
    espacios: [{ id: 'a1', nombre: 'Aula 1', disponibilidad }],
    actividades: [],
    horario: [],
    preferencias: { repartir_actividad_en_dias: true, evitar_ultima_hora: false, priorizar_tramos_preferidos: true },
  };
}

async function casoCompletoBasico() {
  const proyecto = baseProyecto({ dias: 2, tramos: 2 });
  proyecto.actividades = [
    { id: 'mat', nombre: 'Matemáticas', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 2, duracion_tramos: 1, condiciones: { una_sesion_por_dia: true } },
    { id: 'ing', nombre: 'Inglés', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p2', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: {} },
  ];
  const resultado = await resolverHorarioCpSatFase2(proyecto, { maxTimeInSeconds: 3 });
  assert.equal(resultado.erroresGraves, 0, 'El caso completo no debe generar errores graves');
  assert.equal(resultado.sesionesColocadas, 3, 'Debe colocar las tres sesiones previstas');
  assert.equal(resultado.sesionesPendientes, 0, 'No debe dejar pendientes');
  assert.equal(resultado.diagnosticoModelo.candidatos > 0, true, 'Debe crear candidatos CP-SAT');
  return { caso: 'completo_basico', resumen: resumen(resultado) };
}

async function casoParcialSeguro() {
  const proyecto = baseProyecto({ dias: 1, tramos: 1 });
  proyecto.personas = [{ id: 'p1', nombre: 'Docente 1', disponibilidad: { dia_1__tramo_1: true } }];
  proyecto.espacios = [{ id: 'a1', nombre: 'Aula 1', disponibilidad: { dia_1__tramo_1: true } }];
  proyecto.actividades = [
    { id: 'a', nombre: 'Actividad A', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: {} },
    { id: 'b', nombre: 'Actividad B', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: {} },
  ];
  const resultado = await resolverHorarioCpSatFase2(proyecto, { maxTimeInSeconds: 3 });
  assert.equal(resultado.erroresGraves, 0, 'El parcial utilizable no debe generar errores graves');
  assert.equal(resultado.sesionesColocadas, 1, 'Debe colocar solo una sesión por conflicto de recursos');
  assert.equal(resultado.sesionesPendientes, 1, 'Debe conservar la semántica de pendiente como aviso, no como error duro');
  assert.ok(resultado.incidencias.some((i) => i.codigo === 'SESIONES_PENDIENTES'), 'Debe aparecer el aviso de sesiones pendientes');
  return { caso: 'parcial_seguro', resumen: resumen(resultado) };
}

async function casoCondiciones() {
  const proyecto = baseProyecto({ dias: 2, tramos: 2 });
  proyecto.actividades = [
    { id: 'cond', nombre: 'Actividad condicionada', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: { dias_prohibidos: ['dia_1'], prohibir_ultima_hora: true } },
  ];
  const resultado = await resolverHorarioCpSatFase2(proyecto, { maxTimeInSeconds: 3 });
  assert.equal(resultado.erroresGraves, 0, 'La actividad condicionada no debe generar errores graves');
  assert.equal(resultado.sesionesColocadas, 1, 'Debe colocar la actividad');
  assert.equal(resultado.proyecto.horario[0].dia_id, 'dia_2', 'Debe respetar el día prohibido');
  assert.equal(resultado.proyecto.horario[0].tramo_id, 'tramo_1', 'Debe respetar la prohibición de última hora');
  return { caso: 'condiciones', resumen: resumen(resultado), horario: resultado.proyecto.horario };
}

async function casoFijas() {
  const proyecto = baseProyecto({ dias: 2, tramos: 2 });
  proyecto.actividades = [
    { id: 'fija', nombre: 'Fija', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: {} },
    { id: 'nueva', nombre: 'Nueva', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: {} },
  ];
  proyecto.horario = [{ id: 'sesion_fija_1', actividad_id: 'fija', dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'a1', duracion_tramos: 1, fija: true }];
  const resultado = await resolverHorarioCpSatFase2(proyecto, { maxTimeInSeconds: 3 });
  assert.equal(resultado.erroresGraves, 0, 'Las sesiones fijas no deben generar conflicto');
  assert.equal(resultado.sesionesColocadas, 2, 'Debe conservar la fija y colocar la nueva');
  assert.ok(resultado.proyecto.horario.some((s) => s.fija), 'Debe conservar la sesión fija');
  assert.ok(!resultado.proyecto.horario.some((s) => s.actividad_id === 'nueva' && s.dia_id === 'dia_1' && s.tramo_id === 'tramo_1'), 'No debe pisar la sesión fija');
  return { caso: 'sesiones_fijas', resumen: resumen(resultado), horario: resultado.proyecto.horario };
}

function resumen(resultado) {
  return {
    estadoSolver: resultado.estadoSolver,
    sesionesPrevistas: resultado.sesionesPrevistas,
    sesionesColocadas: resultado.sesionesColocadas,
    sesionesPendientes: resultado.sesionesPendientes,
    erroresGraves: resultado.erroresGraves,
    candidatos: resultado.diagnosticoModelo.candidatos,
    restricciones: resultado.diagnosticoModelo.restriccionesEstimadas,
    tiempoMs: resultado.tiempoMs,
    wallTimeSolverMs: resultado.wallTimeSolverMs,
  };
}

const evidencias = [];
evidencias.push(await casoCompletoBasico());
evidencias.push(await casoParcialSeguro());
evidencias.push(await casoCondiciones());
evidencias.push(await casoFijas());

const salida = {
  fase: 'FASE_2_TRADUCCION_CP_SAT',
  status: 'PASS',
  descripcion: 'Validación de diseño con casos pequeños. No sustituye el motor funcional.',
  casos: evidencias,
  advertencias: [
    'No acredita equivalencia con los siete ejemplos completos.',
    'No acredita navegador, Android, tableta, PC ni GitHub Pages.',
    'No convierte carga objetivo en restricción dura.'
  ]
};

fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase2_traduccion_node.json'), JSON.stringify(salida, null, 2));
console.log(JSON.stringify(salida, null, 2));
