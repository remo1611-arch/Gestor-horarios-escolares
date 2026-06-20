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
    id: `ort_fase2_${candidato.actividad.id}_${candidato.numeroSesion}_${candidato.dia_id}_${candidato.tramo_id}`,
    actividad_id: candidato.actividad.id,
    dia_id: candidato.dia_id,
    tramo_id: candidato.tramo_id,
    grupo_id: candidato.actividad.grupo_id || '',
    persona_id: candidato.actividad.persona_id || '',
    docentes_acompanantes_ids: candidato.actividad.docentes_acompanantes_ids || [],
    espacio_id: candidato.actividad.espacio_id || '',
    duracion_tramos: Number(candidato.actividad.duracion_tramos || 1),
    fija: false,
    generado_por: 'OR_TOOLS_WASM_FASE2_TRADUCCION_EXPERIMENTAL',
  };
}

function puntuacionPreferencias(proyecto, actividad, diaId, tramoId, tramosCubiertosIds, indiceTramoInicio) {
  const condiciones = actividad.condiciones || {};
  let puntos = 0;
  if ((condiciones.dias_preferidos || []).includes(diaId)) puntos += 20;
  if ((condiciones.tramos_preferidos || []).includes(tramoId)) puntos += 20;
  if (proyecto.preferencias?.evitar_ultima_hora && tramosCubiertosIds.includes(ordenarPorOrden(proyecto.tramos || []).at(-1)?.id)) puntos -= 30;
  if (proyecto.preferencias?.priorizar_tramos_preferidos) puntos += Math.max(0, 10 - indiceTramoInicio);
  if (esServicioCentro(actividad) || actividad.clasificacion_horaria === 'Docencia complementaria') puntos += 2;
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

export function construirModeloHorarioCpSatFase2(entrada, opciones = {}) {
  const proyecto = normalizarProyecto(entrada);
  const model = new CpModel('generador_horarios_fase2_traduccion_experimental');
  const diasOrdenados = ordenarPorOrden(proyecto.dias || []);
  const tramosOrdenados = ordenarPorOrden(proyecto.tramos || []).map((tramo) => normalizarTramo(tramo));
  const fijas = (proyecto.horario || []).filter((sesion) => sesion.fija === true);
  const fijasPorActividad = new Map();
  for (const sesion of fijas) fijasPorActividad.set(sesion.actividad_id, (fijasPorActividad.get(sesion.actividad_id) || 0) + 1);
  const ocupacionFija = new Set();
  for (const sesion of fijas) {
    for (const clave of clavesRecursosDeColocacion(proyecto, sesion)) ocupacionFija.add(clave);
  }

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

          for (const claveRecurso of clavesRecursosDeColocacion(proyecto, colocacionDesdeCandidato(candidato))) {
            if (!variablesPorRecursoHueco.has(claveRecurso)) variablesPorRecursoHueco.set(claveRecurso, []);
            variablesPorRecursoHueco.get(claveRecurso).push(variable);
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

  const terminosObjetivo = [];
  for (const candidato of candidatos) {
    const indice = tramosOrdenados.findIndex((tramo) => tramo.id === candidato.tramo_id);
    const base = Number(opciones.peso_colocacion || 100000);
    const preferencias = puntuacionPreferencias(proyecto, candidato.actividad, candidato.dia_id, candidato.tramo_id, candidato.tramoIds, indice);
    terminosObjetivo.push(candidato.variable.times(base + preferencias));
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
      aviso: 'Modelo experimental de Fase 2. No está conectado a la interfaz ni sustituye el motor actual.',
    },
  };
}

export async function resolverHorarioCpSatFase2(entrada, opciones = {}) {
  const construido = construirModeloHorarioCpSatFase2(entrada, opciones);
  const solver = await CpSolver.create();
  const inicio = performance.now?.() ?? Date.now();
  const resultado = solver.solve(construido.model, {
    maxTimeInSeconds: Number(opciones.maxTimeInSeconds || 5),
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

  return {
    fase: 'FASE_2_TRADUCCION_CP_SAT_EXPERIMENTAL',
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
    advertencias: [
      'Prototipo de traducción. No usa aún NoOverlap/IntervalVar ni objetivo completo de calidad.',
      'La carga objetivo se conserva como diagnóstico, no como restricción dura.',
      'El motor funcional de la interfaz sigue siendo el motor JavaScript v1.4.1.',
    ],
  };
}
