import { CpSolver, CpSolverStatus, LinearExpr } from '../../vendor/cpsat-js/dist/index.js';
import { validarHorario } from '../../../../assets/js/motor/validador_horario.js';
import { calcularCalidadHorario } from '../../../../assets/js/dominio/calidad_horario.js';
import { construirModeloHorarioCpSatFase4, ESTADO_SOLVER_TEXTO_FASE4 } from '../../fase4_objetivo_calidad/src/motor_cp_sat_calidad.mjs';

export const ESTADO_SOLVER_TEXTO_FASE4B = ESTADO_SOLVER_TEXTO_FASE4;

function colocacionDesdeCandidatoFase4B(candidato) {
  return {
    id: `ort_fase4b_${candidato.actividad.id}_${candidato.numeroSesion}_${candidato.dia_id}_${candidato.tramo_id}`,
    actividad_id: candidato.actividad.id,
    dia_id: candidato.dia_id,
    tramo_id: candidato.tramo_id,
    grupo_id: candidato.actividad.grupo_id || '',
    persona_id: candidato.actividad.persona_id || '',
    docentes_acompanantes_ids: candidato.actividad.docentes_acompanantes_ids || [],
    espacio_id: candidato.actividad.espacio_id || '',
    duracion_tramos: Number(candidato.actividad.duracion_tramos || 1),
    fija: false,
    generado_por: 'OR_TOOLS_WASM_FASE4B_OBJETIVO_LEXICOGRAFICO_EXPERIMENTAL',
  };
}

function sumaVariables(variables) {
  let expr = LinearExpr.fromConstant(0);
  for (const variable of variables) expr = expr.plus(variable.toLinearExpr());
  return expr;
}

function contarPrevistas(proyecto) {
  return (proyecto.actividades || []).reduce((suma, actividad) => suma + Number(actividad.sesiones_semanales || 0), 0);
}

function ordenarHorario(proyecto, horario) {
  return [...horario].sort((a, b) => {
    const diaA = proyecto.dias.find((d) => d.id === a.dia_id)?.orden || 0;
    const diaB = proyecto.dias.find((d) => d.id === b.dia_id)?.orden || 0;
    if (diaA !== diaB) return diaA - diaB;
    const tramoA = proyecto.tramos.find((t) => t.id === a.tramo_id)?.orden || 0;
    const tramoB = proyecto.tramos.find((t) => t.id === b.tramo_id)?.orden || 0;
    return tramoA - tramoB;
  });
}

async function resolverModeloConstruido(construido, opciones = {}) {
  const solver = await CpSolver.create();
  const inicio = performance.now?.() ?? Date.now();
  const resultado = solver.solve(construido.model, {
    maxTimeInSeconds: Number(opciones.maxTimeInSeconds || opciones.limite_segundos || 8),
    numWorkers: 1,
  });
  const fin = performance.now?.() ?? Date.now();
  const generadas = [];
  if ([CpSolverStatus.OPTIMAL, CpSolverStatus.FEASIBLE].includes(resultado.status)) {
    for (const candidato of construido.candidatos) {
      if (resultado.value(candidato.variable) === 1) generadas.push(colocacionDesdeCandidatoFase4B(candidato));
    }
  }
  return {
    solverStatus: resultado.status,
    solverStatusTexto: ESTADO_SOLVER_TEXTO_FASE4B[resultado.status] || String(resultado.status),
    objectiveValue: resultado.objectiveValue,
    wallTimeSolverMs: Math.round((resultado.wallTime ?? 0) * 1000),
    tiempoMs: Math.round(fin - inicio),
    generadas,
  };
}

function estadoProductoDesdeResultado({ erroresGraves, estadoSolver, pendientes }) {
  if (erroresGraves > 0) return 'REVISAR';
  if (estadoSolver === CpSolverStatus.INFEASIBLE) return 'INVIABLE';
  if (estadoSolver === CpSolverStatus.MODEL_INVALID) return 'MODELO_INVALIDO';
  if (estadoSolver === CpSolverStatus.UNKNOWN) return pendientes < Infinity ? 'PARCIAL_POR_TIEMPO' : 'SIN_SOLUCION_ACREDITADA';
  if (pendientes > 0) return 'PARCIAL';
  return 'COMPLETO';
}

function mensajeDesdeEstado(estado) {
  if (estado === 'COMPLETO') return 'Motor CP-SAT Fase 4B: horario completo validado, con objetivo lexicográfico experimental.';
  if (estado === 'PARCIAL') return 'Motor CP-SAT Fase 4B: horario parcial válido; quedan sesiones pendientes como aviso, no como error duro.';
  if (estado === 'PARCIAL_POR_TIEMPO') return 'Motor CP-SAT Fase 4B: tiempo agotado o estado UNKNOWN con propuesta parcial aprovechable.';
  if (estado === 'INVIABLE') return 'Motor CP-SAT Fase 4B: el modelo experimental acredita inviabilidad.';
  if (estado === 'MODELO_INVALIDO') return 'Motor CP-SAT Fase 4B: el modelo enviado al solver es inválido.';
  return 'Motor CP-SAT Fase 4B: revisar incidencias graves.';
}

export async function resolverHorarioCpSatFase4B(entrada, opciones = {}) {
  // Etapa 1: maximizar sesiones colocadas. Se anulan penalizaciones para no sacrificar cobertura por calidad.
  const construidoCobertura = construirModeloHorarioCpSatFase4(entrada, {
    ...opciones,
    peso_colocacion: Number(opciones.peso_colocacion_etapa1 || 1000000),
    peso_hueco_docente: 0,
    peso_hueco_grupo: 0,
    peso_ultima_docente: 0,
    peso_ultima_grupo: 0,
    peso_desequilibrio_docente: 0,
  });
  const maxCandidatosGlobal = Number(opciones.maxCandidatosGlobal || 1200);
  if (construidoCobertura.candidatos.length > maxCandidatosGlobal) {
    const horario = ordenarHorario(construidoCobertura.proyecto, construidoCobertura.fijas);
    const proyectoResultado = { ...construidoCobertura.proyecto, horario };
    const incidencias = validarHorario(proyectoResultado);
    const graves = incidencias.filter((i) => i.nivel === 'grave');
    const previstas = contarPrevistas(construidoCobertura.proyecto);
    const pendientes = Math.max(0, previstas - horario.length);
    const calidad = calcularCalidadHorario(proyectoResultado).resumen;
    return {
      fase: 'FASE_4B_OBJETIVO_LEXICOGRAFICO_CP_SAT',
      experimental: true,
      autorizadoParaInterfaz: false,
      estado: graves.length ? 'REVISAR' : 'NO_EJECUTADO_MODELO_GRANDE',
      mensaje: 'Motor CP-SAT Fase 4B: modelo grande no ejecutado en Node para evitar bloqueo del wrapper WASM; sustitución bloqueada.',
      horario,
      incidencias,
      proyecto: proyectoResultado,
      metricas: {
        colocadas: horario.length,
        previstas,
        pendientes,
        etapa_elegida: 'SKIPPED_MODEL_TOO_LARGE',
        cobertura_objetivo_generadas: 0,
        cobertura_minima_solicitada: Number(opciones.minColocacionesGeneradas || 0),
        etapa1: { solver: 'SKIPPED_MODEL_TOO_LARGE', solver_codigo: 'SKIPPED_MODEL_TOO_LARGE', generadas: 0, tiempo_ms: 0, objetivo: null },
        etapa2: { solver: 'SKIPPED_MODEL_TOO_LARGE', solver_codigo: 'SKIPPED_MODEL_TOO_LARGE', generadas: 0, tiempo_ms: 0, objetivo: null, usada: false },
        tiempo_ms: 0,
        estado_solver: 'SKIPPED_MODEL_TOO_LARGE',
        estado_solver_texto: 'SKIPPED_MODEL_TOO_LARGE',
        modo_motor: 'cp_sat_wasm_fase4b_objetivo_lexicografico_experimental',
        motor_detalle: 'or_tools_cp_sat_wasm_spike_fase4b_no_conectado_a_interfaz_modelo_grande_no_ejecutado',
        calidad,
        diagnostico_modelo: construidoCobertura.diagnostico,
      },
      advertencias: [
        'Fase 4B experimental. No se conecta a la interfaz ordinaria.',
        'Modelo grande omitido para evitar bloqueo operativo del wrapper WASM en Node.',
        'Este resultado bloquea la sustitución del motor.',
      ],
    };
  }
  const etapa1 = await resolverModeloConstruido(construidoCobertura, {
    maxTimeInSeconds: Number(opciones.maxTimeEtapa1Seconds || opciones.maxTimeInSeconds || 6),
  });

  const minimoSolicitado = Number(opciones.minColocacionesGeneradas || 0);
  const objetivoGeneradas = Math.max(etapa1.generadas.length, minimoSolicitado);

  // Etapa 2: con la cobertura fijada como umbral, optimizar calidad aproximada.
  // Gate de seguridad: en modelos grandes el wrapper WASM puede ignorar de facto el límite temporal al añadir
  // la restricción dura de cobertura. En esos casos se conserva la etapa 1 y se documenta el bloqueo.
  const maxCandidatosEtapa2 = Number(opciones.maxCandidatosEtapa2 || 600);
  let construidoCalidad = null;
  let etapa2 = {
    solverStatus: 'SKIPPED_MODEL_TOO_LARGE',
    solverStatusTexto: 'SKIPPED_MODEL_TOO_LARGE',
    objectiveValue: null,
    wallTimeSolverMs: 0,
    tiempoMs: 0,
    generadas: [],
  };
  if (construidoCobertura.candidatos.length <= maxCandidatosEtapa2) {
    construidoCalidad = construirModeloHorarioCpSatFase4(entrada, {
      ...opciones,
      peso_colocacion: Number(opciones.peso_colocacion_etapa2 || 1000000),
      peso_hueco_docente: Number(opciones.peso_hueco_docente || 6000),
      peso_hueco_grupo: Number(opciones.peso_hueco_grupo || 4000),
      peso_ultima_docente: Number(opciones.peso_ultima_docente || 2000),
      peso_ultima_grupo: Number(opciones.peso_ultima_grupo || 2000),
      peso_desequilibrio_docente: Number(opciones.peso_desequilibrio_docente || 1000),
    });
    if (objetivoGeneradas > 0 && construidoCalidad.candidatos.length) {
      construidoCalidad.model.add(sumaVariables(construidoCalidad.candidatos.map((c) => c.variable)).ge(objetivoGeneradas));
    }
    etapa2 = await resolverModeloConstruido(construidoCalidad, {
      maxTimeInSeconds: Number(opciones.maxTimeEtapa2Seconds || opciones.maxTimeInSeconds || 10),
    });
  }

  const usarEtapa2 = construidoCalidad && [CpSolverStatus.OPTIMAL, CpSolverStatus.FEASIBLE].includes(etapa2.solverStatus) && etapa2.generadas.length >= objetivoGeneradas;
  const etapaElegida = usarEtapa2 ? etapa2 : etapa1;
  const construidoElegido = usarEtapa2 ? construidoCalidad : construidoCobertura;
  const horario = ordenarHorario(construidoElegido.proyecto, [...construidoElegido.fijas, ...etapaElegida.generadas]);
  const proyectoResultado = { ...construidoElegido.proyecto, horario };
  const incidencias = validarHorario(proyectoResultado);
  const graves = incidencias.filter((i) => i.nivel === 'grave');
  const previstas = contarPrevistas(construidoElegido.proyecto);
  const pendientes = Math.max(0, previstas - horario.length);
  const calidad = calcularCalidadHorario(proyectoResultado).resumen;
  const estado = estadoProductoDesdeResultado({ erroresGraves: graves.length, estadoSolver: etapaElegida.solverStatus, pendientes });

  return {
    fase: 'FASE_4B_OBJETIVO_LEXICOGRAFICO_CP_SAT',
    experimental: true,
    autorizadoParaInterfaz: false,
    estado,
    mensaje: mensajeDesdeEstado(estado),
    horario,
    incidencias,
    proyecto: proyectoResultado,
    metricas: {
      colocadas: horario.length,
      previstas,
      pendientes,
      etapa_elegida: usarEtapa2 ? 'CALIDAD_CON_COBERTURA_FIJADA' : 'COBERTURA_MAXIMA',
      cobertura_objetivo_generadas: objetivoGeneradas,
      cobertura_minima_solicitada: minimoSolicitado,
      etapa1: {
        solver: etapa1.solverStatusTexto,
        solver_codigo: etapa1.solverStatus,
        generadas: etapa1.generadas.length,
        tiempo_ms: etapa1.tiempoMs,
        objetivo: etapa1.objectiveValue,
      },
      etapa2: {
        solver: etapa2.solverStatusTexto,
        solver_codigo: etapa2.solverStatus,
        generadas: etapa2.generadas.length,
        tiempo_ms: etapa2.tiempoMs,
        objetivo: etapa2.objectiveValue,
        usada: usarEtapa2,
      },
      tiempo_ms: etapa1.tiempoMs + etapa2.tiempoMs,
      estado_solver: etapaElegida.solverStatus,
      estado_solver_texto: etapaElegida.solverStatusTexto,
      modo_motor: 'cp_sat_wasm_fase4b_objetivo_lexicografico_experimental',
      motor_detalle: 'or_tools_cp_sat_wasm_spike_fase4b_no_conectado_a_interfaz',
      calidad,
      diagnostico_modelo: construidoElegido.diagnostico,
    },
    advertencias: [
      'Fase 4B experimental. No se conecta a la interfaz ordinaria.',
      'La Etapa 1 maximiza cobertura; la Etapa 2 intenta calidad con cobertura mínima fijada.',
      'La carga objetivo sigue siendo diagnóstico, no restricción dura.',
      'La sustitución queda bloqueada si pierde sesiones, genera graves, empeora calidad o no supera QA físico/navegador.',
    ],
  };
}
