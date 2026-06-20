import { CpSolverStatus } from '../../vendor/cpsat-js/dist/index.js';
import { resolverHorarioCpSatFase2 } from '../../fase2_traduccion/src/traductor_cp_sat_fase2.mjs';
import { calcularCalidadHorario } from '../../../../assets/js/dominio/calidad_horario.js';

const ESTADO_SOLVER_TEXTO = {
  [CpSolverStatus.UNKNOWN]: 'UNKNOWN',
  [CpSolverStatus.MODEL_INVALID]: 'MODEL_INVALID',
  [CpSolverStatus.FEASIBLE]: 'FEASIBLE',
  [CpSolverStatus.INFEASIBLE]: 'INFEASIBLE',
  [CpSolverStatus.OPTIMAL]: 'OPTIMAL',
};

function estadoProductoDesdeCpSat(resultado) {
  if (resultado.erroresGraves > 0) return 'REVISAR';
  if (resultado.estadoSolver === CpSolverStatus.INFEASIBLE) return 'INVIABLE';
  if (resultado.estadoSolver === CpSolverStatus.MODEL_INVALID) return 'MODELO_INVALIDO';
  if (resultado.estadoSolver === CpSolverStatus.UNKNOWN) return resultado.sesionesColocadas > 0 ? 'PARCIAL_POR_TIEMPO' : 'SIN_SOLUCION_ACREDITADA';
  if (resultado.sesionesPendientes > 0) return 'PARCIAL';
  return 'COMPLETO';
}

function mensajeDesdeEstado(estado) {
  if (estado === 'COMPLETO') return 'Motor CP-SAT aislado: horario completo y validado por el validador del producto.';
  if (estado === 'PARCIAL') return 'Motor CP-SAT aislado: horario parcial válido; quedan sesiones pendientes como aviso, no como error duro.';
  if (estado === 'PARCIAL_POR_TIEMPO') return 'Motor CP-SAT aislado: tiempo agotado o estado UNKNOWN con propuesta parcial aprovechable.';
  if (estado === 'INVIABLE') return 'Motor CP-SAT aislado: el solver acredita inviabilidad bajo el modelo experimental actual.';
  if (estado === 'MODELO_INVALIDO') return 'Motor CP-SAT aislado: el modelo enviado al solver es inválido.';
  if (estado === 'SIN_SOLUCION_ACREDITADA') return 'Motor CP-SAT aislado: no hay solución acreditada en el tiempo disponible.';
  return 'Motor CP-SAT aislado: revisar incidencias graves.';
}

export async function generarHorarioCpSatAislado(proyectoEntrada, opciones = {}) {
  const inicio = performance.now?.() ?? Date.now();
  const resultado = await resolverHorarioCpSatFase2(proyectoEntrada, {
    maxTimeInSeconds: Number(opciones.maxTimeInSeconds || opciones.limite_segundos || 5),
    peso_colocacion: Number(opciones.peso_colocacion || 100000),
  });
  const fin = performance.now?.() ?? Date.now();
  const estado = estadoProductoDesdeCpSat(resultado);
  const calidad = calcularCalidadHorario(resultado.proyecto).resumen;
  return {
    fase: 'FASE_3_MOTOR_CP_SAT_AISLADO',
    experimental: true,
    autorizadoParaInterfaz: false,
    estado,
    mensaje: mensajeDesdeEstado(estado),
    horario: resultado.proyecto.horario,
    incidencias: resultado.incidencias,
    proyecto: resultado.proyecto,
    metricas: {
      colocadas: resultado.sesionesColocadas,
      previstas: resultado.sesionesPrevistas,
      pendientes: resultado.sesionesPendientes,
      tiempo_ms: Math.round(fin - inicio),
      tiempo_solver_ms: resultado.wallTimeSolverMs,
      estado_solver: resultado.estadoSolver,
      estado_solver_texto: ESTADO_SOLVER_TEXTO[resultado.estadoSolver] || String(resultado.estadoSolver),
      objetivo: resultado.objetivo,
      modo_motor: 'cp_sat_wasm_aislado_experimental',
      motor_detalle: 'or_tools_cp_sat_wasm_spike_fase3_no_conectado_a_interfaz',
      calidad,
      diagnostico_modelo: resultado.diagnosticoModelo,
    },
    advertencias: [
      'Motor aislado experimental. No sustituye al motor JavaScript actual.',
      'No está conectado al botón Calcular horario ni a trabajador_generacion.js.',
      'La calidad CP-SAT aún no iguala al motor actual en todos los ejemplos.',
      'La carga objetivo sigue siendo diagnóstico, no restricción dura.',
      'Falta QA navegador físico, Android, tableta, PC y GitHub Pages real.',
    ],
  };
}

export { ESTADO_SOLVER_TEXTO };
