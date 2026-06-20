import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarHorario } from '../../../../assets/js/motor/validador_horario.js';
import { calcularCalidadHorario } from '../../../../assets/js/dominio/calidad_horario.js';
import { resolverHorarioCpSatFase4 } from '../src/motor_cp_sat_calidad.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '../../../..');
const evidenciaDir = path.resolve(__dirname, '../evidencias');
fs.mkdirSync(evidenciaDir, { recursive: true });

const proyecto = JSON.parse(fs.readFileSync(path.join(raiz, 'ejemplos', 'ejemplo_ies_sencillo.json'), 'utf8'));
const resultado = await resolverHorarioCpSatFase4(proyecto, { maxTimeInSeconds: 6 });
const calidad = calcularCalidadHorario(resultado.proyecto).resumen;
const graves = validarHorario(resultado.proyecto).filter((i) => i.nivel === 'grave');

assert.equal(resultado.autorizadoParaInterfaz, false, 'Fase 4 no puede autorizar la interfaz ordinaria');
assert.equal(graves.length, 0, 'El horario Fase 4 no debe producir errores graves');
assert.equal(resultado.metricas.colocadas, 16, 'El ejemplo IES sencillo debe completarse');
assert.ok(['OPTIMAL', 'FEASIBLE'].includes(resultado.metricas.estado_solver_texto), 'El solver debe acreditar solución');
assert.ok(calidad.puntuacion_penalizacion >= 0, 'La calidad debe estar calculada');

const evidencia = {
  fase: 'FASE_4_OBJETIVO_CALIDAD_NODE',
  status: 'PASS',
  ejemplo: 'ejemplo_ies_sencillo.json',
  solver: resultado.metricas.estado_solver_texto,
  colocadas: resultado.metricas.colocadas,
  previstas: resultado.metricas.previstas,
  pendientes: resultado.metricas.pendientes,
  errores_graves: graves.length,
  calidad,
  diagnostico_modelo: resultado.metricas.diagnostico_modelo,
  autorizado_para_interfaz: resultado.autorizadoParaInterfaz,
};
fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase4_objetivo_calidad_node.json'), JSON.stringify(evidencia, null, 2));
console.log(JSON.stringify(evidencia, null, 2));
process.exit(0);
