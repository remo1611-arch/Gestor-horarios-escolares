import {
  clonar,
  nuevaColocacion,
  ordenarPorOrden,
  claveHueco,
  tramosCubiertos,
  docentesDeActividad,
  docentesDeSesion,
  requiereGrupoActividad,
  normalizarTramo,
  esActividadLectiva,
  esServicioCentro
} from '../dominio/modelo.js';
import { validarDatosProyecto, validarHorario } from './validador_horario.js';
import { calcularCalidadHorario } from '../dominio/calidad_horario.js';

function ahora() {
  return Date.now();
}

function crearControlTiempo(inicio, limiteMs) {
  return {
    agotado: false,
    comprobar() {
      if (limiteMs > 0 && ahora() - inicio >= limiteMs) this.agotado = true;
      return this.agotado;
    }
  };
}

function diasYaUsadosPorActividad(horario, actividadId) {
  return new Set(horario.filter((sesion) => sesion.actividad_id === actividadId).map((sesion) => sesion.dia_id));
}

function crearIndices(proyecto, horarioInicial = []) {
  const indices = {
    ocupacionGrupo: new Map(),
    ocupacionPersona: new Map(),
    ocupacionEspacio: new Map(),
    conteoActividad: new Map(),
    conteoActividadDia: new Map()
  };
  for (const sesion of horarioInicial) registrarSesionEnIndices(proyecto, indices, sesion);
  return indices;
}

function registrarSesionEnIndices(proyecto, indices, sesion) {
  const actividades = new Map((proyecto.actividades || []).map((actividad) => [actividad.id, actividad]));
  const actividad = actividades.get(sesion.actividad_id) || {};
  const grupoId = sesion.grupo_id || actividad.grupo_id || '';
  const espacioId = sesion.espacio_id || actividad.espacio_id || '';
  const docentes = docentesDeActividad({ ...actividad, persona_id: sesion.persona_id || actividad.persona_id, docentes_acompanantes_ids: sesion.docentes_acompanantes_ids || actividad.docentes_acompanantes_ids || [] });
  for (const tramoId of tramosCubiertos(proyecto, sesion)) {
    const hueco = claveHueco(sesion.dia_id, tramoId);
    if (grupoId) indices.ocupacionGrupo.set(`${grupoId}__${hueco}`, sesion.id);
    for (const docenteId of docentes) indices.ocupacionPersona.set(`${docenteId}__${hueco}`, sesion.id);
    if (espacioId) indices.ocupacionEspacio.set(`${espacioId}__${hueco}`, sesion.id);
  }
  indices.conteoActividad.set(sesion.actividad_id, (indices.conteoActividad.get(sesion.actividad_id) || 0) + 1);
  indices.conteoActividadDia.set(`${sesion.actividad_id}__${sesion.dia_id}`, (indices.conteoActividadDia.get(`${sesion.actividad_id}__${sesion.dia_id}`) || 0) + 1);
}

function clonarIndices(indices) {
  return {
    ocupacionGrupo: new Map(indices.ocupacionGrupo),
    ocupacionPersona: new Map(indices.ocupacionPersona),
    ocupacionEspacio: new Map(indices.ocupacionEspacio),
    conteoActividad: new Map(indices.conteoActividad),
    conteoActividadDia: new Map(indices.conteoActividadDia)
  };
}

function crearBolsaSesiones(proyecto, horarioInicial) {
  const fijasPorActividad = new Map();
  for (const sesion of horarioInicial.filter((s) => s.fija)) {
    fijasPorActividad.set(sesion.actividad_id, (fijasPorActividad.get(sesion.actividad_id) || 0) + 1);
  }
  const bolsa = [];
  for (const actividad of proyecto.actividades || []) {
    const previstas = Number(actividad.sesiones_semanales || 0);
    const yaFijas = fijasPorActividad.get(actividad.id) || 0;
    for (let i = yaFijas; i < previstas; i += 1) {
      bolsa.push({ actividad_id: actividad.id, numero: i + 1 });
    }
  }
  return bolsa;
}

function crearContextoMotor(proyecto) {
  const dias = ordenarPorOrden(proyecto.dias || []);
  const tramos = ordenarPorOrden(proyecto.tramos || []).map((tramo) => normalizarTramo(tramo));
  return {
    dias,
    tramos,
    ultimoTramoId: tramos[tramos.length - 1]?.id || '',
    personas: new Map((proyecto.personas || []).map((persona) => [persona.id, persona])),
    grupos: new Map((proyecto.grupos || []).map((grupo) => [grupo.id, grupo])),
    espacios: new Map((proyecto.espacios || []).map((espacio) => [espacio.id, espacio])),
    tramosPorId: new Map(tramos.map((tramo) => [tramo.id, tramo]))
  };
}

function crearColocacionActividad(actividad, diaId, tramoId) {
  return nuevaColocacion({
    actividad_id: actividad.id,
    dia_id: diaId,
    tramo_id: tramoId,
    grupo_id: actividad.grupo_id,
    persona_id: actividad.persona_id,
    docentes_acompanantes_ids: actividad.docentes_acompanantes_ids || [],
    espacio_id: actividad.espacio_id,
    duracion_tramos: actividad.duracion_tramos
  });
}

function evaluarHuecoIncremental(proyecto, contexto, indices, actividad, diaId, tramoId) {
  const colocacion = crearColocacionActividad(actividad, diaId, tramoId);
  const duracion = Number(actividad.duracion_tramos || 1);
  const tramos = tramosCubiertos(proyecto, colocacion);
  if (tramos.length !== duracion) return { ok: false, causa: 'La duración no cabe completa en el día.' };

  const grupoId = actividad.grupo_id || '';
  const espacioId = actividad.espacio_id || '';
  const docentes = docentesDeActividad(actividad);
  const condiciones = actividad.condiciones || {};

  if (requiereGrupoActividad(actividad) && !contexto.grupos.has(grupoId)) return { ok: false, causa: 'La actividad requiere grupo o subgrupo válido.' };
  if (!contexto.personas.has(actividad.persona_id)) return { ok: false, causa: 'La actividad no tiene docente responsable válido.' };
  if (Number(actividad.docentes_necesarios || 1) > docentes.length) return { ok: false, causa: 'No se alcanza la cobertura mínima de docentes.' };
  if (actividad.requiere_espacio && !contexto.espacios.has(espacioId)) return { ok: false, causa: 'La actividad requiere un espacio válido.' };
  if ((condiciones.dias_prohibidos || []).includes(diaId)) return { ok: false, causa: 'Día prohibido para la actividad.' };
  if (condiciones.prohibir_ultima_hora && tramos.includes(contexto.ultimoTramoId)) return { ok: false, causa: 'La actividad tiene prohibida la última hora.' };
  if (condiciones.una_sesion_por_dia && (indices.conteoActividadDia.get(`${actividad.id}__${diaId}`) || 0) > 0) return { ok: false, causa: 'La actividad solo admite una sesión por día.' };

  for (const tramoCubierto of tramos) {
    const tramo = contexto.tramosPorId.get(tramoCubierto);
    if (!tramo) return { ok: false, causa: 'Tramo horario no válido.' };
    if (esActividadLectiva(actividad) && tramo.admite_clase === false) return { ok: false, causa: `El tramo ${tramo.nombre} no admite clase.` };
    if (esServicioCentro(actividad) && tramo.admite_servicios === false) return { ok: false, causa: `El tramo ${tramo.nombre} no admite servicios.` };
    if ((condiciones.tramos_prohibidos || []).includes(tramoCubierto)) return { ok: false, causa: 'Tramo prohibido para la actividad.' };

    const hueco = claveHueco(diaId, tramoCubierto);
    if ((condiciones.huecos_prohibidos || []).includes(hueco)) return { ok: false, causa: 'Hueco prohibido para la actividad.' };
    if (grupoId && indices.ocupacionGrupo.has(`${grupoId}__${hueco}`)) return { ok: false, causa: 'El grupo o subgrupo ya está ocupado.' };

    for (const docenteId of docentes) {
      const docente = contexto.personas.get(docenteId);
      if (!docente) return { ok: false, causa: 'Hay un docente no válido.' };
      if (indices.ocupacionPersona.has(`${docenteId}__${hueco}`)) return { ok: false, causa: 'La persona docente ya está ocupada.' };
      if (docente.disponibilidad && docente.disponibilidad[hueco] === false) return { ok: false, causa: 'La persona docente no está disponible.' };
    }

    if (espacioId) {
      const espacio = contexto.espacios.get(espacioId);
      if (!espacio) return { ok: false, causa: 'Espacio no válido.' };
      if (indices.ocupacionEspacio.has(`${espacioId}__${hueco}`)) return { ok: false, causa: 'El espacio ya está ocupado.' };
      if (espacio.disponibilidad && espacio.disponibilidad[hueco] === false) return { ok: false, causa: 'El espacio no está disponible.' };
    }
  }
  return { ok: true, colocacion };
}

function puntuacionCandidato(proyecto, contexto, indices, actividad, candidato, horario) {
  let puntos = 0;
  const indice = contexto.tramos.findIndex((tramo) => tramo.id === candidato.tramo_id);
  const condiciones = actividad.condiciones || {};
  if (proyecto.preferencias?.evitar_ultima_hora && indice === contexto.tramos.length - 1) puntos -= 20;
  if (proyecto.preferencias?.repartir_actividad_en_dias) {
    const usados = diasYaUsadosPorActividad(horario, actividad.id);
    if (!usados.has(candidato.dia_id)) puntos += 12;
    else puntos -= 4;
  }
  if (proyecto.preferencias?.priorizar_tramos_preferidos) {
    if ((condiciones.dias_preferidos || []).includes(candidato.dia_id)) puntos += 7;
    if ((condiciones.tramos_preferidos || []).includes(candidato.tramo_id)) puntos += 7;
  }
  const cargaDiaGrupo = actividad.grupo_id ? horario.filter((sesion) => sesion.grupo_id === actividad.grupo_id && sesion.dia_id === candidato.dia_id).length : 0;
  puntos -= cargaDiaGrupo;
  if (actividad.clasificacion_horaria === 'Servicio de centro' || actividad.clasificacion_horaria === 'Docencia complementaria') puntos += 2;
  puntos += Math.max(0, 10 - indice);
  if (indices.conteoActividadDia.get(`${actividad.id}__${candidato.dia_id}`)) puntos -= 3;
  return puntos;
}

function huecosCandidatosIncrementales(proyecto, contexto, indices, actividad, horario, controlTiempo) {
  const duracion = Number(actividad.duracion_tramos || 1);
  const candidatos = [];
  for (const dia of contexto.dias) {
    if (controlTiempo.comprobar()) break;
    for (let indice = 0; indice <= contexto.tramos.length - duracion; indice += 1) {
      if (controlTiempo.comprobar()) break;
      const tramo = contexto.tramos[indice];
      const evaluacion = evaluarHuecoIncremental(proyecto, contexto, indices, actividad, dia.id, tramo.id);
      if (!evaluacion.ok) continue;
      candidatos.push({ dia_id: dia.id, tramo_id: tramo.id, colocacion: evaluacion.colocacion, puntos: puntuacionCandidato(proyecto, contexto, indices, actividad, { dia_id: dia.id, tramo_id: tramo.id }, horario) + Math.random() * 2 });
    }
  }
  return candidatos.sort((a, b) => b.puntos - a.puntos);
}

function totalSesionesPrevistas(proyecto) {
  return (proyecto.actividades || []).reduce((suma, actividad) => suma + Number(actividad.sesiones_semanales || 0), 0);
}

function contarPendientes(proyecto, horario) {
  const conteo = new Map();
  for (const sesion of horario) conteo.set(sesion.actividad_id, (conteo.get(sesion.actividad_id) || 0) + 1);
  return (proyecto.actividades || []).reduce((suma, actividad) => suma + Math.max(0, Number(actividad.sesiones_semanales || 0) - (conteo.get(actividad.id) || 0)), 0);
}

function calidadBasica(proyecto, horario) {
  const porDocenteDia = new Map();
  const tramosOrdenados = ordenarPorOrden(proyecto.tramos || []);
  const indiceTramo = new Map(tramosOrdenados.map((tramo, indice) => [tramo.id, indice]));
  const actividades = new Map((proyecto.actividades || []).map((actividad) => [actividad.id, actividad]));
  let ultimasHoras = 0;
  let primerasHoras = 0;
  for (const sesion of horario) {
    const actividad = actividades.get(sesion.actividad_id) || {};
    const docentes = docentesDeActividad({ ...actividad, persona_id: sesion.persona_id || actividad.persona_id, docentes_acompanantes_ids: sesion.docentes_acompanantes_ids || actividad.docentes_acompanantes_ids || [] });
    const cubiertos = tramosCubiertos(proyecto, sesion);
    for (const tramoId of cubiertos) {
      const indice = indiceTramo.get(tramoId);
      if (indice === 0) primerasHoras += docentes.length;
      if (indice === tramosOrdenados.length - 1) ultimasHoras += docentes.length;
      for (const docenteId of docentes) {
        const clave = `${docenteId}__${sesion.dia_id}`;
        if (!porDocenteDia.has(clave)) porDocenteDia.set(clave, []);
        porDocenteDia.get(clave).push(indice);
      }
    }
  }
  let huecosDocentes = 0;
  for (const indices of porDocenteDia.values()) {
    const unicos = [...new Set(indices)].sort((a, b) => a - b);
    if (unicos.length < 2) continue;
    for (let i = unicos[0]; i <= unicos[unicos.length - 1]; i += 1) {
      if (!unicos.includes(i)) huecosDocentes += 1;
    }
  }
  return { huecos_docentes: huecosDocentes, primeras_horas_docente: primerasHoras, ultimas_horas_docente: ultimasHoras };
}


function dominioBaseActividad(proyecto, contexto, actividad, controlTiempo) {
  const indicesVacios = crearIndices(proyecto, []);
  const dominio = [];
  const duracion = Number(actividad.duracion_tramos || 1);
  for (const dia of contexto.dias) {
    if (controlTiempo?.comprobar?.()) break;
    for (let indice = 0; indice <= contexto.tramos.length - duracion; indice += 1) {
      const tramo = contexto.tramos[indice];
      const evaluacion = evaluarHuecoIncremental(proyecto, contexto, indicesVacios, actividad, dia.id, tramo.id);
      if (evaluacion.ok) dominio.push({ dia_id: dia.id, tramo_id: tramo.id });
    }
  }
  return dominio;
}

function calcularDominiosBase(proyecto, contexto, actividades, controlTiempo) {
  const dominios = new Map();
  for (const actividad of actividades.values()) {
    if (controlTiempo.comprobar()) break;
    dominios.set(actividad.id, dominioBaseActividad(proyecto, contexto, actividad, controlTiempo));
  }
  return dominios;
}

function dificultadActividad(actividad, dominio = []) {
  const restricciones = actividad.condiciones || {};
  const restriccionesContadas = ['dias_prohibidos', 'tramos_prohibidos', 'huecos_prohibidos'].reduce((suma, clave) => suma + (restricciones[clave] || []).length, 0);
  const dominioTamano = Math.max(1, dominio.length || 0);
  return (
    Number(actividad.sesiones_semanales || 0) * 5 +
    Number(actividad.duracion_tramos || 1) * 18 +
    Number(actividad.requiere_espacio ? 12 : 0) +
    Number(actividad.docentes_necesarios || 1) * 7 +
    docentesDeActividad(actividad).length * 4 +
    restriccionesContadas * 2 +
    (actividad.condiciones?.una_sesion_por_dia ? 10 : 0) +
    (actividad.condiciones?.prohibir_ultima_hora ? 4 : 0) +
    Math.round(120 / dominioTamano)
  );
}

function huecosDocenteEnDia(proyecto, horario, docenteId, diaId) {
  const tramosOrdenados = ordenarPorOrden(proyecto.tramos || []);
  const indiceTramo = new Map(tramosOrdenados.map((tramo, indice) => [tramo.id, indice]));
  const indices = [];
  for (const sesion of horario) {
    if (sesion.dia_id !== diaId) continue;
    if (!docentesDeSesion(proyecto, sesion).includes(docenteId)) continue;
    for (const tramoId of tramosCubiertos(proyecto, sesion)) {
      const indice = indiceTramo.get(tramoId);
      if (Number.isFinite(indice)) indices.push(indice);
    }
  }
  const unicos = [...new Set(indices)].sort((a, b) => a - b);
  if (unicos.length < 2) return 0;
  let huecos = 0;
  for (let i = unicos[0]; i <= unicos[unicos.length - 1]; i += 1) if (!unicos.includes(i)) huecos += 1;
  return huecos;
}

function penalizacionHuecosDocentes(proyecto, actividad, colocacion, horario) {
  const docentes = docentesDeActividad({ ...actividad, persona_id: colocacion.persona_id || actividad.persona_id, docentes_acompanantes_ids: colocacion.docentes_acompanantes_ids || actividad.docentes_acompanantes_ids || [] });
  let penalizacion = 0;
  const horarioNuevo = [...horario, colocacion];
  for (const docenteId of docentes) {
    const antes = huecosDocenteEnDia(proyecto, horario, docenteId, colocacion.dia_id);
    const despues = huecosDocenteEnDia(proyecto, horarioNuevo, docenteId, colocacion.dia_id);
    penalizacion += Math.max(0, despues - antes) * 9;
  }
  return penalizacion;
}

function cargaDocenteDia(proyecto, horario, docenteId, diaId) {
  let total = 0;
  for (const sesion of horario) {
    if (sesion.dia_id !== diaId) continue;
    if (docentesDeSesion(proyecto, sesion).includes(docenteId)) total += tramosCubiertos(proyecto, sesion).length;
  }
  return total;
}

function puntuacionCandidatoAvanzada(proyecto, contexto, indices, actividad, candidato, horario) {
  const base = puntuacionCandidato(proyecto, contexto, indices, actividad, candidato, horario);
  const evaluacion = evaluarHuecoIncremental(proyecto, contexto, indices, actividad, candidato.dia_id, candidato.tramo_id);
  const colocacion = evaluacion.colocacion || crearColocacionActividad(actividad, candidato.dia_id, candidato.tramo_id);
  let puntos = base;
  puntos -= penalizacionHuecosDocentes(proyecto, actividad, colocacion, horario);
  const docentes = docentesDeActividad(actividad);
  for (const docenteId of docentes) puntos -= cargaDocenteDia(proyecto, horario, docenteId, candidato.dia_id) * 1.5;
  const dominioTamano = candidato.dominio_tamano || 0;
  if (dominioTamano <= 3) puntos += 8;
  return puntos;
}

function huecosCandidatosAvanzados(proyecto, contexto, indices, actividad, horario, controlTiempo, dominioBase = []) {
  const origen = dominioBase.length ? dominioBase : null;
  const candidatos = [];
  if (origen) {
    for (const hueco of origen) {
      if (controlTiempo.comprobar()) break;
      const evaluacion = evaluarHuecoIncremental(proyecto, contexto, indices, actividad, hueco.dia_id, hueco.tramo_id);
      if (!evaluacion.ok) continue;
      candidatos.push({
        dia_id: hueco.dia_id,
        tramo_id: hueco.tramo_id,
        colocacion: evaluacion.colocacion,
        dominio_tamano: origen.length,
        puntos: puntuacionCandidatoAvanzada(proyecto, contexto, indices, actividad, { dia_id: hueco.dia_id, tramo_id: hueco.tramo_id, dominio_tamano: origen.length }, horario) + Math.random() * 3
      });
    }
  } else {
    return huecosCandidatosIncrementales(proyecto, contexto, indices, actividad, horario, controlTiempo);
  }
  return candidatos.sort((a, b) => b.puntos - a.puntos);
}

function quitarSesionDeHorario(horario, sesionId) {
  return horario.filter((sesion) => sesion.id !== sesionId);
}

function conflictosParaHueco(proyecto, contexto, indices, actividad, diaId, tramoId, horario) {
  const colocacion = crearColocacionActividad(actividad, diaId, tramoId);
  const conflictoIds = new Set();
  for (const tramoCubierto of tramosCubiertos(proyecto, colocacion)) {
    const hueco = claveHueco(diaId, tramoCubierto);
    const grupoId = actividad.grupo_id || '';
    const espacioId = actividad.espacio_id || '';
    if (grupoId && indices.ocupacionGrupo.has(`${grupoId}__${hueco}`)) conflictoIds.add(indices.ocupacionGrupo.get(`${grupoId}__${hueco}`));
    for (const docenteId of docentesDeActividad(actividad)) {
      if (indices.ocupacionPersona.has(`${docenteId}__${hueco}`)) conflictoIds.add(indices.ocupacionPersona.get(`${docenteId}__${hueco}`));
    }
    if (espacioId && indices.ocupacionEspacio.has(`${espacioId}__${hueco}`)) conflictoIds.add(indices.ocupacionEspacio.get(`${espacioId}__${hueco}`));
  }
  return [...conflictoIds].map((id) => horario.find((sesion) => sesion.id === id)).filter(Boolean);
}

function intentarReparacionBasica(proyecto, contexto, horario, indices, actividad, dominioBase, controlTiempo) {
  const dominio = dominioBase || [];
  for (const hueco of dominio.slice(0, 12)) {
    if (controlTiempo.comprobar()) break;
    const conflictos = conflictosParaHueco(proyecto, contexto, indices, actividad, hueco.dia_id, hueco.tramo_id, horario);
    if (conflictos.length !== 1 || conflictos[0].fija) continue;
    const conflicto = conflictos[0];
    const horarioSinConflicto = quitarSesionDeHorario(horario, conflicto.id);
    const indicesSinConflicto = crearIndices(proyecto, horarioSinConflicto);
    const evaluacionObjetivo = evaluarHuecoIncremental(proyecto, contexto, indicesSinConflicto, actividad, hueco.dia_id, hueco.tramo_id);
    if (!evaluacionObjetivo.ok) continue;
    const horarioConObjetivo = [...horarioSinConflicto, evaluacionObjetivo.colocacion];
    const indicesConObjetivo = crearIndices(proyecto, horarioConObjetivo);
    const actividadConflicto = (proyecto.actividades || []).find((a) => a.id === conflicto.actividad_id);
    if (!actividadConflicto) continue;
    const candidatosConflicto = huecosCandidatosAvanzados(proyecto, contexto, indicesConObjetivo, actividadConflicto, horarioConObjetivo, controlTiempo, dominioBaseActividad(proyecto, contexto, actividadConflicto, controlTiempo));
    if (!candidatosConflicto.length) continue;
    const candidato = candidatosConflicto[0];
    const recolocada = { ...candidato.colocacion, fija: false };
    const horarioReparado = [...horarioConObjetivo, recolocada];
    const incidencias = validarHorario({ ...proyecto, horario: horarioReparado });
    if (incidencias.some((i) => i.nivel === 'grave')) continue;
    return { correcto: true, horario: horarioReparado, mensaje: 'reparacion_basica' };
  }
  return { correcto: false };
}

function puntuarHorarioGlobal(proyecto, horario) {
  const final = { ...proyecto, horario };
  const previstas = totalSesionesPrevistas(proyecto);
  const pendientes = contarPendientes(proyecto, horario);
  const calidad = calcularCalidadHorario(final).resumen;
  return (
    (previstas - pendientes) * 1000 -
    pendientes * 5000 -
    Number(calidad.huecos_docentes || 0) * 40 -
    Number(calidad.huecos_grupos || 0) * 30 -
    Number(calidad.primeras_horas || 0) * 3 -
    Number(calidad.ultimas_horas || 0) * 5 -
    Number(calidad.desequilibrio_diario || 0) * 10
  );
}

function insertarAlternativa(alternativas, proyecto, horario, intento, motivo = '') {
  const previstas = totalSesionesPrevistas(proyecto);
  const pendientes = contarPendientes(proyecto, horario);
  const puntuacion = puntuarHorarioGlobal(proyecto, horario);
  alternativas.push({ intento, motivo, colocadas: horario.length, previstas, pendientes, puntuacion });
  alternativas.sort((a, b) => b.puntuacion - a.puntuacion);
  alternativas.splice(5);
}

function notificarProgreso(opciones, progreso) {
  if (typeof opciones.onProgress !== 'function') return;
  const ahoraMs = ahora();
  if (opciones.__ultimoProgreso && ahoraMs - opciones.__ultimoProgreso < 250 && progreso.fase !== 'fin') return;
  opciones.__ultimoProgreso = ahoraMs;
  try { opciones.onProgress(progreso); } catch (_) { /* progreso no crítico */ }
}

export function generarHorario(proyectoEntrada, opciones = {}) {
  const proyecto = clonar(proyectoEntrada);
  const inicio = ahora();
  const limiteMs = Number(opciones.limite_ms || 6500);
  const intentos = Number(opciones.intentos || 180);
  const controlTiempo = crearControlTiempo(inicio, limiteMs);
  const incidenciasDatos = validarDatosProyecto(proyecto).filter((i) => i.nivel === 'grave');
  if (incidenciasDatos.length) {
    return {
      estado: 'DATOS_INCOMPLETOS',
      mensaje: 'Hay datos obligatorios pendientes. Revise el centro antes de calcular.',
      horario: proyecto.horario || [],
      incidencias: validarHorario(proyecto),
      metricas: { colocadas: 0, previstas: 0, intentos: 0, tiempo_ms: ahora() - inicio, modo_motor: 'web_avanzado', corte_por_tiempo: false, alternativas: [] }
    };
  }

  const horarioFijo = (proyecto.horario || []).filter((sesion) => sesion.fija);
  const contexto = crearContextoMotor(proyecto);
  const actividades = new Map((proyecto.actividades || []).map((actividad) => [actividad.id, actividad]));
  const previstas = totalSesionesPrevistas(proyecto);
  let mejorHorario = [...horarioFijo];
  let mejorPendientes = contarPendientes(proyecto, mejorHorario);
  let mejorPuntuacion = puntuarHorarioGlobal(proyecto, mejorHorario);
  let intentosRealizados = 0;
  let sesionesEvaluadas = 0;
  let candidatosEvaluados = 0;
  let reparacionesAplicadas = 0;
  const alternativas = [];

  notificarProgreso(opciones, { fase: 'dominios', mensaje: 'Analizando huecos posibles por actividad', colocadas: mejorHorario.length, previstas });
  const dominiosBase = calcularDominiosBase(proyecto, contexto, actividades, controlTiempo);

  for (let intento = 0; intento < intentos; intento += 1) {
    if (controlTiempo.comprobar()) break;
    intentosRealizados += 1;
    let horario = [...horarioFijo];
    let indices = crearIndices(proyecto, horario);
    const bolsa = crearBolsaSesiones(proyecto, horario);
    const bolsaOrdenada = bolsa.sort((a, b) => {
      const actividadA = actividades.get(a.actividad_id) || {};
      const actividadB = actividades.get(b.actividad_id) || {};
      const dominioA = dominiosBase.get(a.actividad_id) || [];
      const dominioB = dominiosBase.get(b.actividad_id) || [];
      return dificultadActividad(actividadB, dominioB) - dificultadActividad(actividadA, dominioA) || Math.random() - 0.5;
    });

    for (const item of bolsaOrdenada) {
      if (controlTiempo.comprobar()) break;
      sesionesEvaluadas += 1;
      const actividad = actividades.get(item.actividad_id);
      if (!actividad) continue;
      const dominio = dominiosBase.get(actividad.id) || [];
      const candidatos = huecosCandidatosAvanzados(proyecto, contexto, indices, actividad, horario, controlTiempo, dominio);
      candidatosEvaluados += candidatos.length;
      if (candidatos.length) {
        const elegido = candidatos[0];
        horario.push(elegido.colocacion);
        registrarSesionEnIndices(proyecto, indices, elegido.colocacion);
      } else if (opciones.reparacion !== false && !controlTiempo.agotado) {
        const reparacion = intentarReparacionBasica(proyecto, contexto, horario, indices, actividad, dominio, controlTiempo);
        if (reparacion.correcto) {
          horario = reparacion.horario;
          indices = crearIndices(proyecto, horario);
          reparacionesAplicadas += 1;
        }
      }

      const pendientesActuales = contarPendientes(proyecto, horario);
      const puntuacionActual = puntuarHorarioGlobal(proyecto, horario);
      if (pendientesActuales < mejorPendientes || (pendientesActuales === mejorPendientes && puntuacionActual > mejorPuntuacion)) {
        mejorHorario = [...horario];
        mejorPendientes = pendientesActuales;
        mejorPuntuacion = puntuacionActual;
      }
      if (sesionesEvaluadas % 8 === 0) notificarProgreso(opciones, { fase: 'generacion', intento: intento + 1, colocadas: horario.length, previstas, pendientes: pendientesActuales, mensaje: `Intento ${intento + 1}: ${horario.length}/${previstas} sesiones colocadas` });
      if (pendientesActuales === 0) break;
    }

    const pendientes = contarPendientes(proyecto, horario);
    insertarAlternativa(alternativas, proyecto, horario, intento + 1, pendientes === 0 ? 'completa' : 'parcial');
    const puntuacion = puntuarHorarioGlobal(proyecto, horario);
    if (pendientes < mejorPendientes || (pendientes === mejorPendientes && puntuacion > mejorPuntuacion)) {
      mejorHorario = [...horario];
      mejorPendientes = pendientes;
      mejorPuntuacion = puntuacion;
    }
    if (pendientes === 0 && intento >= Math.min(4, intentos - 1)) break;
  }

  const proyectoFinal = { ...proyecto, horario: mejorHorario };
  const incidenciasFinales = validarHorario(proyectoFinal);
  const pendientesFinales = contarPendientes(proyecto, mejorHorario);
  const gravesFinales = incidenciasFinales.filter((i) => i.nivel === 'grave').length;
  let estado = 'COMPLETO';
  let mensaje = 'Se ha encontrado un horario completo y válido.';
  if (gravesFinales > 0) {
    estado = 'REVISAR';
    mensaje = 'No se pudo obtener un horario válido. Revise las incidencias.';
  } else if (pendientesFinales > 0) {
    estado = controlTiempo.agotado ? 'PARCIAL_POR_TIEMPO' : 'PARCIAL';
    mensaje = controlTiempo.agotado ? 'Se ha alcanzado el límite de cálculo. Se conserva la mejor alternativa parcial válida encontrada.' : 'Se ha obtenido un horario parcial válido. Quedan sesiones pendientes.';
  } else if (controlTiempo.agotado) {
    mensaje = 'Se encontró un horario completo antes de agotar el cálculo.';
  }

  notificarProgreso(opciones, { fase: 'fin', estado, colocadas: mejorHorario.length, previstas, pendientes: pendientesFinales, mensaje });

  return {
    estado,
    mensaje,
    horario: mejorHorario,
    incidencias: incidenciasFinales,
    metricas: {
      colocadas: mejorHorario.length,
      previstas,
      pendientes: pendientesFinales,
      intentos: intentosRealizados,
      tiempo_ms: ahora() - inicio,
      corte_por_tiempo: controlTiempo.agotado,
      modo_motor: 'web_avanzado',
      motor_detalle: 'dominios_precalculados_reparacion_alternativas',
      sesiones_evaluadas: sesionesEvaluadas,
      candidatos_viables_evaluados: candidatosEvaluados,
      reparaciones_aplicadas: reparacionesAplicadas,
      dominios_precalculados: dominiosBase.size,
      alternativas: alternativas.map((a) => ({ ...a })),
      mejor_puntuacion: mejorPuntuacion,
      calidad: calcularCalidadHorario(proyectoFinal).resumen
    }
  };
}

export const __motorIncrementalInterno = {
  crearIndices,
  evaluarHuecoIncremental,
  calidadBasica,
  contarPendientes,
  dominioBaseActividad,
  calcularDominiosBase,
  dificultadActividad,
  puntuarHorarioGlobal,
  intentarReparacionBasica
};
