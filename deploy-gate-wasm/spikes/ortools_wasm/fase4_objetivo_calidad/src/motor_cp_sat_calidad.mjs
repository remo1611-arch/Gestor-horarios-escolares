import { CpModel, CpSolver, CpSolverStatus, LinearExpr } from '../../vendor/cpsat-js/dist/index.js';
import {
  claveHueco,
  docentesDeActividad,
  esActividadLectiva,
  esServicioCentro,
  normalizarProyecto,
  normalizarTramo,
  ordenarPorOrden,
  requiereGrupoActividad,
  tramosCubiertos,
} from '../../../../assets/js/dominio/modelo.js';
import { validarHorario } from '../../../../assets/js/motor/validador_horario.js';
import { calcularCalidadHorario } from '../../../../assets/js/dominio/calidad_horario.js';

export const ESTADO_SOLVER_TEXTO_FASE4 = {
  [CpSolverStatus.UNKNOWN]: 'UNKNOWN',
  [CpSolverStatus.MODEL_INVALID]: 'MODEL_INVALID',
  [CpSolverStatus.FEASIBLE]: 'FEASIBLE',
  [CpSolverStatus.INFEASIBLE]: 'INFEASIBLE',
  [CpSolverStatus.OPTIMAL]: 'OPTIMAL',
};

function sumaVariables(variables) {
  let expr = LinearExpr.fromConstant(0);
  for (const variable of variables) expr = expr.plus(variable.toLinearExpr());
  return expr;
}

function sumarExpresiones(expresiones) {
  let expr = LinearExpr.fromConstant(0);
  for (const parte of expresiones) expr = expr.plus(parte);
  return expr;
}

function conjuntoIds(lista = []) {
  return new Set((lista || []).map((elemento) => elemento.id).filter(Boolean));
}

function claveRecurso(tipo, id, diaId, tramoId) {
  return `${tipo}:${id}:${claveHueco(diaId, tramoId)}`;
}

function clavesRecursosDeColocacion(proyecto, colocacion) {
  const actividad = (proyecto.actividades || []).find((a) => a.id === colocacion.actividad_id) || {};
  const grupoId = colocacion.grupo_id || actividad.grupo_id || '';
  const espacioId = colocacion.espacio_id || actividad.espacio_id || '';
  const docentes = docentesDeActividad({
    ...actividad,
    persona_id: colocacion.persona_id || actividad.persona_id,
    docentes_acompanantes_ids: colocacion.docentes_acompanantes_ids || actividad.docentes_acompanantes_ids || [],
  });
  const huecos = tramosCubiertos(proyecto, colocacion).map((tramoId) => claveHueco(colocacion.dia_id, tramoId));
  const claves = [];
  for (const hueco of huecos) {
    if (grupoId) claves.push(`grupo:${grupoId}:${hueco}`);
    for (const docenteId of docentes) claves.push(`persona:${docenteId}:${hueco}`);
    if (espacioId) claves.push(`espacio:${espacioId}:${hueco}`);
  }
  return claves;
}

function colocacionDesdeCandidato(candidato) {
  return {
    id: `ort_fase4_${candidato.actividad.id}_${candidato.numeroSesion}_${candidato.dia_id}_${candidato.tramo_id}`,
    actividad_id: candidato.actividad.id,
    dia_id: candidato.dia_id,
    tramo_id: candidato.tramo_id,
    grupo_id: candidato.actividad.grupo_id || '',
    persona_id: candidato.actividad.persona_id || '',
    docentes_acompanantes_ids: candidato.actividad.docentes_acompanantes_ids || [],
    espacio_id: candidato.actividad.espacio_id || '',
    duracion_tramos: Number(candidato.actividad.duracion_tramos || 1),
    fija: false,
    generado_por: 'OR_TOOLS_WASM_FASE4_OBJETIVO_CALIDAD_EXPERIMENTAL',
  };
}

function puntuacionPreferencias(proyecto, actividad, diaId, tramoId, tramosCubiertosIds, indiceTramoInicio) {
  const condiciones = actividad.condiciones || {};
  let puntos = 0;
  if ((condiciones.dias_preferidos || []).includes(diaId)) puntos += 30;
  if ((condiciones.tramos_preferidos || []).includes(tramoId)) puntos += 30;
  if (proyecto.preferencias?.evitar_ultima_hora && tramosCubiertosIds.includes(ordenarPorOrden(proyecto.tramos || []).at(-1)?.id)) puntos -= 300;
  if (proyecto.preferencias?.priorizar_tramos_preferidos) puntos += Math.max(0, 12 - indiceTramoInicio);
  if (esServicioCentro(actividad) || actividad.clasificacion_horaria === 'Docencia complementaria') puntos += 3;
  return puntos;
}

function candidatoValido({ proyecto, actividad, dia, tramo, indiceTramo, ocupacionFija, recursos }) {
  const duracion = Number(actividad.duracion_tramos || 1);
  const tramosOrdenados = recursos.tramosOrdenados;
  const tramoIds = tramosOrdenados.slice(indiceTramo, indiceTramo + duracion).map((t) => t.id);
  if (tramoIds.length !== duracion) return { ok: false, motivo: 'DURACION_NO_CABE' };

  const condiciones = actividad.condiciones || {};
  if ((condiciones.dias_prohibidos || []).includes(dia.id)) return { ok: false, motivo: 'DIA_PROHIBIDO' };
  if (condiciones.prohibir_ultima_hora && tramoIds.includes(recursos.ultimoTramoId)) return { ok: false, motivo: 'ULTIMA_HORA_PROHIBIDA' };

  if (requiereGrupoActividad(actividad) && !recursos.grupos.has(actividad.grupo_id)) return { ok: false, motivo: 'GRUPO_INVALIDO' };
  if (!recursos.personas.has(actividad.persona_id)) return { ok: false, motivo: 'DOCENTE_RESPONSABLE_INVALIDO' };
  if (Number(actividad.docentes_necesarios || 1) > docentesDeActividad(actividad).length) return { ok: false, motivo: 'COBERTURA_DOCENTE_INSUFICIENTE' };
  if (actividad.requiere_espacio && !recursos.espacios.has(actividad.espacio_id)) return { ok: false, motivo: 'ESPACIO_OBLIGATORIO_INVALIDO' };
  if (actividad.espacio_id && !recursos.espacios.has(actividad.espacio_id)) return { ok: false, motivo: 'ESPACIO_INVALIDO' };

  const docentes = docentesDeActividad(actividad);
  const colocacionBase = {
    actividad_id: actividad.id,
    dia_id: dia.id,
    tramo_id: tramo.id,
    grupo_id: actividad.grupo_id || '',
    persona_id: actividad.persona_id || '',
    docentes_acompanantes_ids: actividad.docentes_acompanantes_ids || [],
    espacio_id: actividad.espacio_id || '',
    duracion_tramos: duracion,
  };

  for (const tramoId of tramoIds) {
    const tramoNormalizado = normalizarTramo(recursos.tramosPorId.get(tramoId));
    const hueco = claveHueco(dia.id, tramoId);
    if (esActividadLectiva(actividad) && tramoNormalizado.admite_clase === false) return { ok: false, motivo: 'TRAMO_NO_ADMITE_CLASE' };
    if (esServicioCentro(actividad) && tramoNormalizado.admite_servicios === false) return { ok: false, motivo: 'TRAMO_NO_ADMITE_SERVICIO' };
    if ((condiciones.tramos_prohibidos || []).includes(tramoId)) return { ok: false, motivo: 'TRAMO_PROHIBIDO' };
    if ((condiciones.huecos_prohibidos || []).includes(hueco)) return { ok: false, motivo: 'HUECO_PROHIBIDO' };

    for (const docenteId of docentes) {
      const docente = recursos.personasMap.get(docenteId);
      if (!docente) return { ok: false, motivo: 'DOCENTE_INVALIDO' };
      if (docente.disponibilidad && docente.disponibilidad[hueco] === false) return { ok: false, motivo: 'DOCENTE_NO_DISPONIBLE' };
    }

    if (actividad.espacio_id) {
      const espacio = recursos.espaciosMap.get(actividad.espacio_id);
      if (espacio?.disponibilidad && espacio.disponibilidad[hueco] === false) return { ok: false, motivo: 'ESPACIO_NO_DISPONIBLE' };
    }
  }

  for (const clave of clavesRecursosDeColocacion(proyecto, colocacionBase)) {
    if (ocupacionFija.has(clave)) return { ok: false, motivo: 'CONFLICTO_CON_FIJA' };
  }

  return { ok: true, tramoIds };
}

function actividadPorId(proyecto) {
  return new Map((proyecto.actividades || []).map((a) => [a.id, a]));
}

function construirOcupacionFijaPorClave(proyecto, fijas) {
  const ocupacionFija = new Set();
  for (const sesion of fijas) {
    for (const clave of clavesRecursosDeColocacion(proyecto, sesion)) ocupacionFija.add(clave);
  }
  return ocupacionFija;
}

function idsRecursosCalidad(proyecto) {
  return [
    ...(proyecto.personas || []).map((p) => ({ tipo: 'persona', id: p.id })),
    ...(proyecto.grupos || []).map((g) => ({ tipo: 'grupo', id: g.id })),
  ].filter((r) => r.id);
}

function definirOcupacionYHuecos({ model, proyecto, diasOrdenados, tramosOrdenados, variablesPorRecursoHueco, ocupacionFija, pesos, diagnostico }) {
  const expresionesPenalizacion = [];
  const ocupacion = new Map();

  for (const recurso of idsRecursosCalidad(proyecto)) {
    for (const dia of diasOrdenados) {
      for (const tramo of tramosOrdenados) {
        const clave = claveRecurso(recurso.tipo, recurso.id, dia.id, tramo.id);
        const variables = variablesPorRecursoHueco.get(clave) || [];
        const fija = ocupacionFija.has(clave);
        const occ = model.newBoolVar(`occ__${recurso.tipo}__${recurso.id}__${dia.id}__${tramo.id}`.replace(/[^A-Za-z0-9_\-]/g, '_'));
        ocupacion.set(clave, occ);
        if (fija) {
          model.add(occ.equals(1));
        } else if (variables.length) {
          model.add(sumaVariables(variables).minus(occ.toLinearExpr()).equals(0));
        } else {
          model.add(occ.equals(0));
        }
      }
    }
  }

  const ultimoTramo = tramosOrdenados.at(-1);
  for (const recurso of idsRecursosCalidad(proyecto)) {
    const pesoHueco = recurso.tipo === 'persona' ? pesos.hueco_docente : pesos.hueco_grupo;
    const pesoUltima = recurso.tipo === 'persona' ? pesos.ultima_docente : pesos.ultima_grupo;
    for (const dia of diasOrdenados) {
      if (ultimoTramo) {
        const occUltima = ocupacion.get(claveRecurso(recurso.tipo, recurso.id, dia.id, ultimoTramo.id));
        if (occUltima) {
          expresionesPenalizacion.push(occUltima.times(pesoUltima));
          diagnostico.penalizadores.ultimas += 1;
        }
      }

      for (let indice = 1; indice < tramosOrdenados.length - 1; indice += 1) {
        const tramo = tramosOrdenados[indice];
        const occActual = ocupacion.get(claveRecurso(recurso.tipo, recurso.id, dia.id, tramo.id));
        if (!occActual) continue;
        const anteriores = tramosOrdenados.slice(0, indice)
          .map((t) => ocupacion.get(claveRecurso(recurso.tipo, recurso.id, dia.id, t.id)))
          .filter(Boolean);
        const posteriores = tramosOrdenados.slice(indice + 1)
          .map((t) => ocupacion.get(claveRecurso(recurso.tipo, recurso.id, dia.id, t.id)))
          .filter(Boolean);
        if (!anteriores.length || !posteriores.length) continue;

        const before = model.newBoolVar(`before__${recurso.tipo}__${recurso.id}__${dia.id}__${tramo.id}`.replace(/[^A-Za-z0-9_\-]/g, '_'));
        const after = model.newBoolVar(`after__${recurso.tipo}__${recurso.id}__${dia.id}__${tramo.id}`.replace(/[^A-Za-z0-9_\-]/g, '_'));
        const hole = model.newBoolVar(`hole__${recurso.tipo}__${recurso.id}__${dia.id}__${tramo.id}`.replace(/[^A-Za-z0-9_\-]/g, '_'));

        for (const variable of anteriores) model.add(before.ge(variable));
        model.add(before.le(sumaVariables(anteriores)));
        for (const variable of posteriores) model.add(after.ge(variable));
        model.add(after.le(sumaVariables(posteriores)));

        model.add(hole.le(before));
        model.add(hole.le(after));
        model.add(hole.plus(occActual.toLinearExpr()).le(1));
        model.add(hole.minus(before.toLinearExpr()).minus(after.toLinearExpr()).plus(occActual.toLinearExpr()).ge(-1));

        expresionesPenalizacion.push(hole.times(pesoHueco));
        diagnostico.penalizadores.huecos += 1;
      }
    }
  }

  return { expresionesPenalizacion, ocupacion };
}

function penalizarDesequilibrioBasico({ model, proyecto, diasOrdenados, tramosOrdenados, ocupacion, pesos, diagnostico }) {
  const penalizaciones = [];
  // Penalización aproximada, no sustitutiva de calcularCalidadHorario: evita concentrar toda la carga de un docente en un solo día.
  for (const persona of proyecto.personas || []) {
    const cargasDia = [];
    for (const dia of diasOrdenados) {
      const variablesDia = tramosOrdenados
        .map((t) => ocupacion.get(claveRecurso('persona', persona.id, dia.id, t.id)))
        .filter(Boolean);
      if (!variablesDia.length) continue;
      const carga = model.newIntVar(0, tramosOrdenados.length, `carga_dia__${persona.id}__${dia.id}`.replace(/[^A-Za-z0-9_\-]/g, '_'));
      model.add(sumaVariables(variablesDia).minus(carga.toLinearExpr()).equals(0));
      cargasDia.push(carga);
    }
    for (let i = 0; i < cargasDia.length; i += 1) {
      for (let j = i + 1; j < cargasDia.length; j += 1) {
        const difPos = model.newIntVar(0, tramosOrdenados.length, `difpos__${persona.id}__${i}_${j}`.replace(/[^A-Za-z0-9_\-]/g, '_'));
        const difNeg = model.newIntVar(0, tramosOrdenados.length, `difneg__${persona.id}__${i}_${j}`.replace(/[^A-Za-z0-9_\-]/g, '_'));
        model.add(cargasDia[i].minus(cargasDia[j].toLinearExpr()).minus(difPos.toLinearExpr()).plus(difNeg.toLinearExpr()).equals(0));
        penalizaciones.push(difPos.times(pesos.desequilibrio_docente));
        penalizaciones.push(difNeg.times(pesos.desequilibrio_docente));
        diagnostico.penalizadores.desequilibrio += 2;
      }
    }
  }
  return penalizaciones;
}

export function construirModeloHorarioCpSatFase4(entrada, opciones = {}) {
  const proyecto = normalizarProyecto(entrada);
  const model = new CpModel('generador_horarios_fase4_objetivo_calidad_experimental');
  const diasOrdenados = ordenarPorOrden(proyecto.dias || []);
  const tramosOrdenados = ordenarPorOrden(proyecto.tramos || []).map((tramo) => normalizarTramo(tramo));
  const fijas = (proyecto.horario || []).filter((sesion) => sesion.fija === true);
  const fijasPorActividad = new Map();
  for (const sesion of fijas) fijasPorActividad.set(sesion.actividad_id, (fijasPorActividad.get(sesion.actividad_id) || 0) + 1);
  const ocupacionFija = construirOcupacionFijaPorClave(proyecto, fijas);

  const recursos = {
    personas: conjuntoIds(proyecto.personas),
    grupos: conjuntoIds(proyecto.grupos),
    espacios: conjuntoIds(proyecto.espacios),
    personasMap: new Map((proyecto.personas || []).map((p) => [p.id, p])),
    espaciosMap: new Map((proyecto.espacios || []).map((e) => [e.id, e])),
    tramosPorId: new Map(tramosOrdenados.map((t) => [t.id, t])),
    tramosOrdenados,
    ultimoTramoId: tramosOrdenados.at(-1)?.id || '',
  };

  const candidatos = [];
  const variablesPorSesion = new Map();
  const variablesPorRecursoHueco = new Map();
  const variablesPorActividadDia = new Map();
  const motivosDescartados = new Map();

  for (const actividad of proyecto.actividades || []) {
    const previstas = Math.max(0, Number(actividad.sesiones_semanales || 0));
    const pendientes = Math.max(0, previstas - (fijasPorActividad.get(actividad.id) || 0));
    for (let numeroSesion = 1; numeroSesion <= pendientes; numeroSesion += 1) {
      const claveSesion = `${actividad.id}#${numeroSesion}`;
      variablesPorSesion.set(claveSesion, []);
      for (const dia of diasOrdenados) {
        for (let indiceTramo = 0; indiceTramo <= tramosOrdenados.length - Number(actividad.duracion_tramos || 1); indiceTramo += 1) {
          const tramo = tramosOrdenados[indiceTramo];
          const evaluacion = candidatoValido({ proyecto, actividad, dia, tramo, indiceTramo, ocupacionFija, recursos });
          if (!evaluacion.ok) {
            motivosDescartados.set(evaluacion.motivo, (motivosDescartados.get(evaluacion.motivo) || 0) + 1);
            continue;
          }
          const nombre = `x__${actividad.id}__s${numeroSesion}__${dia.id}__${tramo.id}`.replace(/[^A-Za-z0-9_\-]/g, '_');
          const variable = model.newBoolVar(nombre);
          const candidato = { variable, actividad, numeroSesion, dia_id: dia.id, tramo_id: tramo.id, tramoIds: evaluacion.tramoIds };
          candidatos.push(candidato);
          variablesPorSesion.get(claveSesion).push(variable);

          for (const clave of clavesRecursosDeColocacion(proyecto, colocacionDesdeCandidato(candidato))) {
            if (!variablesPorRecursoHueco.has(clave)) variablesPorRecursoHueco.set(clave, []);
            variablesPorRecursoHueco.get(clave).push(variable);
          }

          const claveActividadDia = `${actividad.id}__${dia.id}`;
          if (!variablesPorActividadDia.has(claveActividadDia)) variablesPorActividadDia.set(claveActividadDia, []);
          variablesPorActividadDia.get(claveActividadDia).push(variable);
        }
      }
    }
  }

  for (const variables of variablesPorSesion.values()) {
    if (variables.length > 0) model.add(sumaVariables(variables).le(1));
  }
  for (const variables of variablesPorRecursoHueco.values()) {
    if (variables.length > 1) model.add(sumaVariables(variables).le(1));
  }
  for (const actividad of proyecto.actividades || []) {
    if (!actividad.condiciones?.una_sesion_por_dia) continue;
    for (const dia of diasOrdenados) {
      const variables = variablesPorActividadDia.get(`${actividad.id}__${dia.id}`) || [];
      if (variables.length > 1) model.add(sumaVariables(variables).le(1));
    }
  }

  const pesos = {
    colocacion: Number(opciones.peso_colocacion || 100000),
    hueco_docente: Number(opciones.peso_hueco_docente || 700),
    hueco_grupo: Number(opciones.peso_hueco_grupo || 450),
    ultima_docente: Number(opciones.peso_ultima_docente || 140),
    ultima_grupo: Number(opciones.peso_ultima_grupo || 120),
    desequilibrio_docente: Number(opciones.peso_desequilibrio_docente || 8),
  };

  const diagnostico = {
    penalizadores: { huecos: 0, ultimas: 0, desequilibrio: 0 },
    pesos,
  };

  const terminosObjetivo = [];
  for (const candidato of candidatos) {
    const indice = tramosOrdenados.findIndex((tramo) => tramo.id === candidato.tramo_id);
    const preferencias = puntuacionPreferencias(proyecto, candidato.actividad, candidato.dia_id, candidato.tramo_id, candidato.tramoIds, indice);
    terminosObjetivo.push(candidato.variable.times(pesos.colocacion + preferencias));
  }

  const { expresionesPenalizacion, ocupacion } = definirOcupacionYHuecos({ model, proyecto, diasOrdenados, tramosOrdenados, variablesPorRecursoHueco, ocupacionFija, pesos, diagnostico });
  const penalizacionesDesequilibrio = penalizarDesequilibrioBasico({ model, proyecto, diasOrdenados, tramosOrdenados, ocupacion, pesos, diagnostico });
  for (const penalizacion of [...expresionesPenalizacion, ...penalizacionesDesequilibrio]) {
    terminosObjetivo.push(penalizacion.times(-1));
  }

  model.maximize(terminosObjetivo.length ? sumarExpresiones(terminosObjetivo) : LinearExpr.fromConstant(0));

  return {
    proyecto,
    model,
    candidatos,
    fijas,
    diagnostico: {
      actividades: proyecto.actividades.length,
      fijas: fijas.length,
      candidatos: candidatos.length,
      variablesPorSesion: variablesPorSesion.size,
      restriccionesEstimadas: model.toProto().constraints.length,
      descartes: Object.fromEntries([...motivosDescartados.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      objetivoCalidad: diagnostico,
      aviso: 'Modelo experimental de Fase 4. Añade penalización CP-SAT de huecos, últimas horas y desequilibrio básico, pero no sustituye el motor actual.',
    },
  };
}

function estadoProductoDesdeCpSat(resultado) {
  if (resultado.erroresGraves > 0) return 'REVISAR';
  if (resultado.estadoSolver === CpSolverStatus.INFEASIBLE) return 'INVIABLE';
  if (resultado.estadoSolver === CpSolverStatus.MODEL_INVALID) return 'MODELO_INVALIDO';
  if (resultado.estadoSolver === CpSolverStatus.UNKNOWN) return resultado.sesionesColocadas > 0 ? 'PARCIAL_POR_TIEMPO' : 'SIN_SOLUCION_ACREDITADA';
  if (resultado.sesionesPendientes > 0) return 'PARCIAL';
  return 'COMPLETO';
}

function mensajeDesdeEstado(estado) {
  if (estado === 'COMPLETO') return 'Motor CP-SAT Fase 4: horario completo y validado por el validador del producto.';
  if (estado === 'PARCIAL') return 'Motor CP-SAT Fase 4: horario parcial válido; quedan sesiones pendientes como aviso, no como error duro.';
  if (estado === 'PARCIAL_POR_TIEMPO') return 'Motor CP-SAT Fase 4: tiempo agotado o estado UNKNOWN con propuesta parcial aprovechable.';
  if (estado === 'INVIABLE') return 'Motor CP-SAT Fase 4: el solver acredita inviabilidad bajo el modelo experimental actual.';
  if (estado === 'MODELO_INVALIDO') return 'Motor CP-SAT Fase 4: el modelo enviado al solver es inválido.';
  if (estado === 'SIN_SOLUCION_ACREDITADA') return 'Motor CP-SAT Fase 4: no hay solución acreditada en el tiempo disponible.';
  return 'Motor CP-SAT Fase 4: revisar incidencias graves.';
}

export async function resolverHorarioCpSatFase4(entrada, opciones = {}) {
  const construido = construirModeloHorarioCpSatFase4(entrada, opciones);
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
      if (resultado.value(candidato.variable) === 1) generadas.push(colocacionDesdeCandidato(candidato));
    }
  }

  const horario = [...construido.fijas, ...generadas].sort((a, b) => {
    const diaA = construido.proyecto.dias.find((d) => d.id === a.dia_id)?.orden || 0;
    const diaB = construido.proyecto.dias.find((d) => d.id === b.dia_id)?.orden || 0;
    if (diaA !== diaB) return diaA - diaB;
    const tramoA = construido.proyecto.tramos.find((t) => t.id === a.tramo_id)?.orden || 0;
    const tramoB = construido.proyecto.tramos.find((t) => t.id === b.tramo_id)?.orden || 0;
    return tramoA - tramoB;
  });

  const proyectoResultado = { ...construido.proyecto, horario };
  const incidencias = validarHorario(proyectoResultado);
  const graves = incidencias.filter((i) => i.nivel === 'grave');
  const previstas = (construido.proyecto.actividades || []).reduce((suma, actividad) => suma + Number(actividad.sesiones_semanales || 0), 0);
  const calidad = calcularCalidadHorario(proyectoResultado).resumen;
  const resultadoProducto = {
    fase: 'FASE_4_OBJETIVO_CALIDAD_CP_SAT_EXPERIMENTAL',
    estadoSolver: resultado.status,
    esSolucionSolver: [CpSolverStatus.OPTIMAL, CpSolverStatus.FEASIBLE].includes(resultado.status),
    objetivo: resultado.objectiveValue,
    tiempoMs: Math.round(fin - inicio),
    wallTimeSolverMs: Math.round((resultado.wallTime ?? 0) * 1000),
    sesionesPrevistas: previstas,
    sesionesFijas: construido.fijas.length,
    sesionesGeneradas: generadas.length,
    sesionesColocadas: horario.length,
    sesionesPendientes: Math.max(0, previstas - horario.length),
    erroresGraves: graves.length,
    incidencias,
    proyecto: proyectoResultado,
    diagnosticoModelo: construido.diagnostico,
    calidad,
    advertencias: [
      'Fase 4 experimental. No se conecta a la interfaz ordinaria.',
      'El objetivo de calidad aproxima la fórmula de calidad_horario.js mediante penalizaciones lineales.',
      'La carga objetivo se conserva como diagnóstico, no como restricción dura.',
      'La sustitución del motor sigue bloqueada hasta QA navegador físico y comparación completa satisfactoria.',
    ],
  };
  const estado = estadoProductoDesdeCpSat(resultadoProducto);
  return {
    fase: 'FASE_4_OBJETIVO_CALIDAD_CP_SAT',
    experimental: true,
    autorizadoParaInterfaz: false,
    estado,
    mensaje: mensajeDesdeEstado(estado),
    horario,
    incidencias,
    proyecto: proyectoResultado,
    metricas: {
      colocadas: resultadoProducto.sesionesColocadas,
      previstas: resultadoProducto.sesionesPrevistas,
      pendientes: resultadoProducto.sesionesPendientes,
      tiempo_ms: resultadoProducto.tiempoMs,
      tiempo_solver_ms: resultadoProducto.wallTimeSolverMs,
      estado_solver: resultadoProducto.estadoSolver,
      estado_solver_texto: ESTADO_SOLVER_TEXTO_FASE4[resultadoProducto.estadoSolver] || String(resultadoProducto.estadoSolver),
      objetivo: resultadoProducto.objetivo,
      modo_motor: 'cp_sat_wasm_fase4_objetivo_calidad_experimental',
      motor_detalle: 'or_tools_cp_sat_wasm_spike_fase4_no_conectado_a_interfaz',
      calidad,
      diagnostico_modelo: resultadoProducto.diagnosticoModelo,
    },
    advertencias: resultadoProducto.advertencias,
  };
}
