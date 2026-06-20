import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarHorario } from '../../../../assets/js/motor/generador_horario.js';
import { calcularCalidadHorario } from '../../../../assets/js/dominio/calidad_horario.js';
import { generarHorarioCpSatAislado } from '../src/motor_cp_sat_aislado.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '../../../..');
const evidenciaDir = path.resolve(__dirname, '../evidencias');
fs.mkdirSync(evidenciaDir, { recursive: true });

const expectativasMinimas = {
  'ejemplo_ies_sencillo.json': 16,
  'ejemplo_ceip_sencillo.json': 16,
  'ejemplo_cifp_talleres.json': 11,
  'ejemplo_cpi_sencillo.json': 13,
  'ejemplo_cee_sencillo.json': 10,
  'ejemplo_centro_complejo_sintetico.json': 23,
  'ejemplo_centro_exigente_sintetico.json': 78,
};

const resultados = [];
for (const [archivo, minimoColocadas] of Object.entries(expectativasMinimas)) {
  const proyecto = JSON.parse(fs.readFileSync(path.join(raiz, 'ejemplos', archivo), 'utf8'));
  const actual = generarHorario(proyecto, { limite_ms: 6500, intentos: 180, reparacion: true });
  const cpSat = await generarHorarioCpSatAislado(proyecto, { maxTimeInSeconds: 5 });
  const calidadActual = calcularCalidadHorario({ ...proyecto, horario: actual.horario }).resumen;
  const calidadCpSat = calcularCalidadHorario(cpSat.proyecto).resumen;
  const gravesActual = actual.incidencias.filter((i) => i.nivel === 'grave').length;
  const gravesCpSat = cpSat.incidencias.filter((i) => i.nivel === 'grave').length;

  assert.equal(gravesCpSat, 0, `${archivo}: CP-SAT aislado no debe producir errores graves`);
  assert.ok(cpSat.metricas.colocadas >= minimoColocadas, `${archivo}: CP-SAT aislado debe cumplir el mínimo de sesiones acreditado`);
  assert.equal(cpSat.autorizadoParaInterfaz, false, `${archivo}: el motor aislado no debe autorizar conexión a interfaz`);

  resultados.push({
    ejemplo: archivo,
    motorActual: {
      estado: actual.estado,
      colocadas: actual.metricas.colocadas,
      previstas: actual.metricas.previstas,
      pendientes: actual.metricas.pendientes,
      graves: gravesActual,
      calidad: calidadActual.nivel,
      penalizacion: calidadActual.puntuacion_penalizacion,
      huecosDocentes: calidadActual.huecos_docentes,
      huecosGrupos: calidadActual.huecos_grupos,
    },
    cpSatAislado: {
      estado: cpSat.estado,
      solver: cpSat.metricas.estado_solver_texto,
      colocadas: cpSat.metricas.colocadas,
      previstas: cpSat.metricas.previstas,
      pendientes: cpSat.metricas.pendientes,
      graves: gravesCpSat,
      calidad: calidadCpSat.nivel,
      penalizacion: calidadCpSat.puntuacion_penalizacion,
      huecosDocentes: calidadCpSat.huecos_docentes,
      huecosGrupos: calidadCpSat.huecos_grupos,
      tiempoMs: cpSat.metricas.tiempo_ms,
      candidatos: cpSat.metricas.diagnostico_modelo.candidatos,
      restricciones: cpSat.metricas.diagnostico_modelo.restriccionesEstimadas,
    },
    comparacion: {
      mismasColocadasQueActual: cpSat.metricas.colocadas === actual.metricas.colocadas,
      noMenosColocadasQueActual: cpSat.metricas.colocadas >= actual.metricas.colocadas,
      penalizacionCpSatMenorOIgual: calidadCpSat.puntuacion_penalizacion <= calidadActual.puntuacion_penalizacion,
      deltaPenalizacion: calidadCpSat.puntuacion_penalizacion - calidadActual.puntuacion_penalizacion,
    },
  });
}

const bloqueos = [];
for (const r of resultados) {
  if (!r.comparacion.noMenosColocadasQueActual) bloqueos.push({ ejemplo: r.ejemplo, tipo: 'MENOS_SESIONES_QUE_MOTOR_ACTUAL' });
  if (!r.comparacion.penalizacionCpSatMenorOIgual) bloqueos.push({ ejemplo: r.ejemplo, tipo: 'CALIDAD_PEOR_QUE_MOTOR_ACTUAL', deltaPenalizacion: r.comparacion.deltaPenalizacion });
}

const evidencia = {
  fase: 'FASE_3_VALIDACION_CRUZADA_EJEMPLOS',
  status: 'PASS_CON_BLOQUEOS_DE_SUSTITUCION',
  dictamen: bloqueos.length ? 'NO_AUTORIZA_SUSTITUCION_DEL_MOTOR' : 'PODRIA_ABRIR_FASE_4_FORMAL',
  resumen: {
    ejemplos: resultados.length,
    ejemplosSinErroresGravesCpSat: resultados.filter((r) => r.cpSatAislado.graves === 0).length,
    ejemplosMismasSesiones: resultados.filter((r) => r.comparacion.mismasColocadasQueActual).length,
    bloqueosSustitucion: bloqueos.length,
  },
  bloqueosSustitucion: bloqueos,
  resultados,
  advertencias: [
    'La prueba acredita implementación aislada sobre ejemplos, no integración de producto.',
    'El motor CP-SAT aislado no se conecta al botón Calcular horario.',
    'Cualquier empeoramiento de calidad bloquea la Fase 5 aunque coloque las mismas sesiones.',
  ],
};

fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase3_validacion_cruzada_ejemplos.json'), JSON.stringify(evidencia, null, 2));
console.log(JSON.stringify(evidencia, null, 2));
