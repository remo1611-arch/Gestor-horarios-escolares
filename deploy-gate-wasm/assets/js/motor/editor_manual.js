import { clonar, nuevaColocacion, ordenarPorOrden } from '../dominio/modelo.js';
import { validarHorario, tieneGraves } from './validador_horario.js';

function primerGrave(incidencias) {
  return incidencias.find((incidencia) => incidencia.nivel === 'grave') || null;
}

function actividadDeSesion(proyecto, sesion) {
  return proyecto.actividades.find((actividad) => actividad.id === sesion?.actividad_id) || null;
}

function normalizarCambios(proyecto, sesion, cambios = {}) {
  const actividad = actividadDeSesion(proyecto, sesion);
  return {
    dia_id: cambios.dia_id || sesion.dia_id,
    tramo_id: cambios.tramo_id || sesion.tramo_id,
    espacio_id: Object.prototype.hasOwnProperty.call(cambios, 'espacio_id') ? cambios.espacio_id : (sesion.espacio_id || actividad?.espacio_id || ''),
    docentes_acompanantes_ids: Object.prototype.hasOwnProperty.call(cambios, 'docentes_acompanantes_ids') ? cambios.docentes_acompanantes_ids : (sesion.docentes_acompanantes_ids || actividad?.docentes_acompanantes_ids || [])
  };
}

export function evaluarMovimientoSesion(proyectoEntrada, sesionId, cambios = {}) {
  const proyecto = clonar(proyectoEntrada);
  const sesion = proyecto.horario.find((item) => item.id === sesionId);
  if (!sesion) {
    return { permitido: false, mensaje: 'No se ha encontrado la sesión seleccionada.', incidencias: [] };
  }
  const nuevosDatos = normalizarCambios(proyecto, sesion, cambios);
  sesion.dia_id = nuevosDatos.dia_id;
  sesion.tramo_id = nuevosDatos.tramo_id;
  sesion.espacio_id = nuevosDatos.espacio_id;
  sesion.docentes_acompanantes_ids = nuevosDatos.docentes_acompanantes_ids || [];
  const incidencias = validarHorario(proyecto);
  const grave = primerGrave(incidencias);
  if (grave) {
    return { permitido: false, mensaje: grave.mensaje, incidencias };
  }
  return { permitido: true, mensaje: 'Movimiento permitido.', incidencias };
}

export function aplicarMovimientoSesion(proyectoEntrada, sesionId, cambios = {}) {
  const evaluacion = evaluarMovimientoSesion(proyectoEntrada, sesionId, cambios);
  if (!evaluacion.permitido) {
    return { correcto: false, mensaje: evaluacion.mensaje, proyecto: proyectoEntrada, incidencias: evaluacion.incidencias };
  }
  const proyecto = clonar(proyectoEntrada);
  const sesion = proyecto.horario.find((item) => item.id === sesionId);
  const nuevosDatos = normalizarCambios(proyecto, sesion, cambios);
  sesion.dia_id = nuevosDatos.dia_id;
  sesion.tramo_id = nuevosDatos.tramo_id;
  sesion.espacio_id = nuevosDatos.espacio_id;
  sesion.docentes_acompanantes_ids = nuevosDatos.docentes_acompanantes_ids || [];
  return { correcto: true, mensaje: 'Sesión movida correctamente.', proyecto, incidencias: evaluacion.incidencias };
}

export function huecosValidosParaSesion(proyecto, sesionId) {
  const sesion = proyecto.horario.find((item) => item.id === sesionId);
  if (!sesion) return [];
  const actividad = actividadDeSesion(proyecto, sesion);
  const resultado = [];
  for (const dia of ordenarPorOrden(proyecto.dias || [])) {
    for (const tramo of ordenarPorOrden(proyecto.tramos || [])) {
      const evaluacion = evaluarMovimientoSesion(proyecto, sesionId, {
        dia_id: dia.id,
        tramo_id: tramo.id,
        espacio_id: sesion.espacio_id || actividad?.espacio_id || ''
      });
      resultado.push({
        dia_id: dia.id,
        tramo_id: tramo.id,
        permitido: evaluacion.permitido,
        mensaje: evaluacion.mensaje
      });
    }
  }
  return resultado;
}

export function buscarHuecoParaActividad(proyectoEntrada, actividadId) {
  const proyecto = clonar(proyectoEntrada);
  const actividad = proyecto.actividades.find((item) => item.id === actividadId);
  if (!actividad) {
    return { encontrado: false, mensaje: 'No se ha encontrado la actividad.' };
  }
  for (const dia of ordenarPorOrden(proyecto.dias || [])) {
    for (const tramo of ordenarPorOrden(proyecto.tramos || [])) {
      const sesion = nuevaColocacion({
        actividad_id: actividad.id,
        dia_id: dia.id,
        tramo_id: tramo.id,
        grupo_id: actividad.grupo_id,
        persona_id: actividad.persona_id,
        docentes_acompanantes_ids: actividad.docentes_acompanantes_ids || [],
        espacio_id: actividad.espacio_id || '',
        duracion_tramos: actividad.duracion_tramos,
        fija: false
      });
      const incidencias = validarHorario({ ...proyecto, horario: [...(proyecto.horario || []), sesion] });
      if (!tieneGraves(incidencias)) {
        return { encontrado: true, dia_id: dia.id, tramo_id: tramo.id, espacio_id: actividad.espacio_id || '', mensaje: 'Se ha encontrado un hueco válido.' };
      }
    }
  }
  return { encontrado: false, mensaje: 'No hay hueco válido para esta actividad con las condiciones actuales.' };
}

export function crearSesionPendiente(proyectoEntrada, actividadId) {
  const proyecto = clonar(proyectoEntrada);
  const actividad = proyecto.actividades.find((item) => item.id === actividadId);
  if (!actividad) {
    return { correcto: false, mensaje: 'No se ha encontrado la actividad.', proyecto: proyectoEntrada };
  }
  const colocadas = (proyecto.horario || []).filter((sesion) => sesion.actividad_id === actividadId).length;
  const previstas = Number(actividad.sesiones_semanales || 0);
  if (colocadas >= previstas) {
    return { correcto: false, mensaje: 'La actividad ya tiene todas sus sesiones colocadas.', proyecto: proyectoEntrada };
  }
  const hueco = buscarHuecoParaActividad(proyecto, actividadId);
  if (!hueco.encontrado) {
    return { correcto: false, mensaje: hueco.mensaje, proyecto: proyectoEntrada };
  }
  proyecto.horario.push(nuevaColocacion({
    actividad_id: actividad.id,
    dia_id: hueco.dia_id,
    tramo_id: hueco.tramo_id,
    grupo_id: actividad.grupo_id,
    persona_id: actividad.persona_id,
    docentes_acompanantes_ids: actividad.docentes_acompanantes_ids || [],
    espacio_id: hueco.espacio_id,
    duracion_tramos: actividad.duracion_tramos,
    fija: false
  }));
  return { correcto: true, mensaje: 'Sesión pendiente colocada en el primer hueco válido.', proyecto };
}

export function actividadesConSesionesPendientes(proyecto) {
  return (proyecto.actividades || [])
    .map((actividad) => {
      const colocadas = (proyecto.horario || []).filter((sesion) => sesion.actividad_id === actividad.id).length;
      const previstas = Number(actividad.sesiones_semanales || 0);
      return { actividad, colocadas, previstas, pendientes: Math.max(0, previstas - colocadas) };
    })
    .filter((item) => item.pendientes > 0);
}
