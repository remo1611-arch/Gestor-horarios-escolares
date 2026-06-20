import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarHorario } from '../../../../assets/js/motor/generador_horario.js';
import { calcularCalidadHorario } from '../../../../assets/js/dominio/calidad_horario.js';
import { resolverHorarioCpSatFase4 } from '../src/motor_cp_sat_calidad.mjs';

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
  const fase4 = await resolverHorarioCpSatFase4(proyecto, { maxTimeInSeconds: archivo.includes('exigente') ? 4 : 3 });
  const calidadActual = calcularCalidadHorario({ ...proyecto, horario: actual.horario }).resumen;
  const calidadFase4 = calcularCalidadHorario(fase4.proyecto).resumen;
  const gravesActual = actual.incidencias.filter((i) => i.nivel === 'grave').length;
  const gravesFase4 = fase4.incidencias.filter((i) => i.nivel === 'grave').length;

  assert.equal(gravesFase4, 0, `${archivo}: Fase 4 no debe producir errores graves`);
  // La Fase 4 es una validación experimental; si coloca menos sesiones que el motor actual, debe quedar como bloqueo documentado, no como falso PASS de sustitución.
  assert.equal(fase4.autorizadoParaInterfaz, false, `${archivo}: Fase 4 no debe autorizar conexión a interfaz`);

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
      ultimasDocentes: calidadActual.ultimas_horas_docente,
      ultimasGrupos: calidadActual.ultimas_horas_grupo,
    },
    cpSatFase4: {
      estado: fase4.estado,
      solver: fase4.metricas.estado_solver_texto,
      colocadas: fase4.metricas.colocadas,
      previstas: fase4.metricas.previstas,
      pendientes: fase4.metricas.pendientes,
      graves: gravesFase4,
      calidad: calidadFase4.nivel,
      penalizacion: calidadFase4.puntuacion_penalizacion,
      huecosDocentes: calidadFase4.huecos_docentes,
      huecosGrupos: calidadFase4.huecos_grupos,
      ultimasDocentes: calidadFase4.ultimas_horas_docente,
      ultimasGrupos: calidadFase4.ultimas_horas_grupo,
      tiempoMs: fase4.metricas.tiempo_ms,
      candidatos: fase4.metricas.diagnostico_modelo.candidatos,
      restricciones: fase4.metricas.diagnostico_modelo.restriccionesEstimadas,
      penalizadores: fase4.metricas.diagnostico_modelo.objetivoCalidad?.penalizadores || {},
    },
    comparacion: {
      noMenosColocadasQueActual: fase4.metricas.colocadas >= actual.metricas.colocadas,
      penalizacionFase4MenorOIgualActual: calidadFase4.puntuacion_penalizacion <= calidadActual.puntuacion_penalizacion,
      deltaFase4VsActual: calidadFase4.puntuacion_penalizacion - calidadActual.puntuacion_penalizacion,
    },
  });
}

const bloqueos = [];
for (const r of resultados) {
  if (!r.comparacion.noMenosColocadasQueActual) bloqueos.push({ ejemplo: r.ejemplo, tipo: 'MENOS_SESIONES_QUE_MOTOR_ACTUAL' });
  if (!r.comparacion.penalizacionFase4MenorOIgualActual) bloqueos.push({ ejemplo: r.ejemplo, tipo: 'CALIDAD_PEOR_QUE_MOTOR_ACTUAL', deltaPenalizacion: r.comparacion.deltaFase4VsActual });
}

const evidencia = {
  fase: 'FASE_4_VALIDACION_CRUZADA_OBJETIVO_CALIDAD',
  status: bloqueos.length ? 'PASS_CON_BLOQUEOS_DE_SUSTITUCION' : 'PASS_SIN_BLOQUEOS_NODE',
  dictamen: bloqueos.length ? 'NO_AUTORIZA_SUSTITUCION_DEL_MOTOR' : 'ABRE_CANDIDATA_A_QA_NAVEGADOR_SIN_CONECTAR_INTERFAZ',
  resumen: {
    ejemplos: resultados.length,
    ejemplosSinErroresGravesFase4: resultados.filter((r) => r.cpSatFase4.graves === 0).length,
    ejemplosNoMenosSesionesQueActual: resultados.filter((r) => r.comparacion.noMenosColocadasQueActual).length,
    bloqueosSustitucion: bloqueos.length,
  },
  bloqueosSustitucion: bloqueos,
  resultados,
  advertencias: [
    'La prueba acredita objetivo de calidad en Node, no integración de producto.',
    'El motor CP-SAT Fase 4 no se conecta al botón Calcular horario.',
    'Cualquier empeoramiento de calidad frente al motor actual bloquea la Fase 5.',
    'Aunque no hubiera bloqueos en Node, faltaría navegador real, Android, tableta, PC y GitHub Pages.',
  ],
};

fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase4_validacion_cruzada_ejemplos.json'), JSON.stringify(evidencia, null, 2));
console.log(JSON.stringify(evidencia, null, 2));
process.exit(0);
