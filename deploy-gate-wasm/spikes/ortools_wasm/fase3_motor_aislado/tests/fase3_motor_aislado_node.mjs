import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarHorarioCpSatAislado } from '../src/motor_cp_sat_aislado.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenciaDir = path.resolve(__dirname, '../evidencias');
fs.mkdirSync(evidenciaDir, { recursive: true });

const proyecto = {
  version_formato: '1.7',
  centro: { nombre: 'Centro mínimo Fase 3', tipo: 'IES', curso_academico: '2026-2027' },
  dias: [{ id: 'lu', nombre: 'Lunes', orden: 1 }, { id: 'ma', nombre: 'Martes', orden: 2 }],
  tramos: [
    { id: 'h1', nombre: '1ª', orden: 1, duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false, computa_permanencia: true },
    { id: 'h2', nombre: '2ª', orden: 2, duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false, computa_permanencia: true },
  ],
  personas: [
    { id: 'd1', nombre: 'Docente 1', disponibilidad: { lu__h1: true, lu__h2: true, ma__h1: true, ma__h2: true } },
    { id: 'd2', nombre: 'Docente 2', disponibilidad: { lu__h1: true, lu__h2: true, ma__h1: true, ma__h2: true } },
  ],
  grupos: [{ id: 'g1', nombre: '1º A' }],
  espacios: [{ id: 'a1', nombre: 'Aula 1', disponibilidad: { lu__h1: true, lu__h2: true, ma__h1: true, ma__h2: true } }],
  actividades: [
    { id: 'act1', nombre: 'Materia A', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'd1', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 2, duracion_tramos: 1, condiciones: { una_sesion_por_dia: true } },
    { id: 'act2', nombre: 'Materia B', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'd2', espacio_id: 'a1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1, condiciones: {} },
  ],
  horario: [],
  preferencias: { repartir_actividad_en_dias: true, evitar_ultima_hora: false, priorizar_tramos_preferidos: true },
};

const resultado = await generarHorarioCpSatAislado(proyecto, { maxTimeInSeconds: 3 });
assert.equal(resultado.experimental, true, 'Debe declararse experimental');
assert.equal(resultado.autorizadoParaInterfaz, false, 'No debe estar autorizado para interfaz');
assert.equal(resultado.estado, 'COMPLETO', 'Debe resolver el caso mínimo como completo');
assert.equal(resultado.metricas.colocadas, 3, 'Debe colocar las tres sesiones');
assert.equal(resultado.metricas.pendientes, 0, 'No debe dejar pendientes');
assert.equal(resultado.incidencias.filter((i) => i.nivel === 'grave').length, 0, 'No debe crear errores graves');
assert.equal(resultado.metricas.modo_motor, 'cp_sat_wasm_aislado_experimental');

const evidencia = {
  fase: 'FASE_3_MOTOR_CP_SAT_AISLADO',
  status: 'PASS',
  caso: 'minimo_node',
  resumen: {
    estado: resultado.estado,
    estadoSolver: resultado.metricas.estado_solver_texto,
    colocadas: resultado.metricas.colocadas,
    previstas: resultado.metricas.previstas,
    pendientes: resultado.metricas.pendientes,
    erroresGraves: resultado.incidencias.filter((i) => i.nivel === 'grave').length,
    calidad: resultado.metricas.calidad,
    tiempoMs: resultado.metricas.tiempo_ms,
  },
  advertencia: 'Prueba aislada. No conecta el motor con la interfaz ordinaria.',
};
fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase3_motor_aislado_node.json'), JSON.stringify(evidencia, null, 2));
console.log(JSON.stringify(evidencia, null, 2));
