import {
  generarId,
  claveHueco,
  tramosCubiertos,
  docentesDeSesion,
  obtenerNombrePorId,
  descripcionColocacion,
  ordenarPorOrden
} from './modelo.js';

export const ESTADOS_AUSENCIA = ['Borrador', 'Confirmada', 'Cerrada'];
export const ESTADOS_COBERTURA = ['Propuesta', 'Confirmada', 'Sin cubrir', 'Realizada'];
export const TIPOS_INCIDENCIA_DIARIA = ['Ausencia', 'Cobertura', 'Servicio sin cubrir', 'Cambio puntual', 'Incidencia de aula', 'Observación'];

export function normalizarGestionDiaria(proyecto = {}) {
  const entrada = proyecto.gestion_diaria || {};
  return {
    ausencias: Array.isArray(entrada.ausencias) ? entrada.ausencias.map((a) => ({
      id: a.id || generarId('ausencia'),
      persona_id: a.persona_id || '',
      dia_id: a.dia_id || '',
      tramo_ids: Array.isArray(a.tramo_ids) ? [...new Set(a.tramo_ids.filter(Boolean))] : [],
      motivo: a.motivo || '',
      estado: ESTADOS_AUSENCIA.includes(a.estado) ? a.estado : 'Borrador',
      observaciones: a.observaciones || '',
      creado: a.creado || new Date().toISOString()
    })) : [],
    coberturas: Array.isArray(entrada.coberturas) ? entrada.coberturas.map((c) => ({
      id: c.id || generarId('cobertura'),
      ausencia_id: c.ausencia_id || '',
      sesion_id: c.sesion_id || '',
      docente_id: c.docente_id || '',
      estado: ESTADOS_COBERTURA.includes(c.estado) ? c.estado : 'Propuesta',
      observaciones: c.observaciones || '',
      creado: c.creado || new Date().toISOString()
    })) : [],
    incidencias: Array.isArray(entrada.incidencias) ? entrada.incidencias.map((i) => ({
      id: i.id || generarId('incidencia'),
      dia_id: i.dia_id || '',
      tipo: TIPOS_INCIDENCIA_DIARIA.includes(i.tipo) ? i.tipo : 'Observación',
      descripcion: i.descripcion || '',
      estado: i.estado || 'Abierta',
      creado: i.creado || new Date().toISOString()
    })) : []
  };
}

export function nuevaAusenciaDiaria({ persona_id = '', dia_id = '', tramo_ids = [], motivo = '', estado = 'Confirmada', observaciones = '' } = {}) {
  return {
    id: generarId('ausencia'),
    persona_id,
    dia_id,
    tramo_ids: Array.isArray(tramo_ids) ? [...new Set(tramo_ids.filter(Boolean))] : [],
    motivo,
    estado: ESTADOS_AUSENCIA.includes(estado) ? estado : 'Confirmada',
    observaciones,
    creado: new Date().toISOString()
  };
}

export function nuevaIncidenciaDiaria({ dia_id = '', tipo = 'Observación', descripcion = '', estado = 'Abierta' } = {}) {
  return {
    id: generarId('incidencia'),
    dia_id,
    tipo: TIPOS_INCIDENCIA_DIARIA.includes(tipo) ? tipo : 'Observación',
    descripcion,
    estado,
    creado: new Date().toISOString()
  };
}

function ausenciaCubreSesion(proyecto, ausencia, sesion) {
  if (!ausencia?.persona_id || !ausencia?.dia_id || sesion.dia_id !== ausencia.dia_id) return false;
  if (!docentesDeSesion(proyecto, sesion).includes(ausencia.persona_id)) return false;
  const tramosAusencia = new Set(ausencia.tramo_ids || []);
  if (!tramosAusencia.size) return true;
  return tramosCubiertos(proyecto, sesion).some((tramoId) => tramosAusencia.has(tramoId));
}

export function sesionesAfectadasPorAusencia(proyecto, ausencia) {
  return (proyecto.horario || []).filter((sesion) => ausenciaCubreSesion(proyecto, ausencia, sesion));
}

function docenteDisponibleEnSesion(proyecto, docenteId, sesion, ausencia) {
  if (!docenteId || docenteId === ausencia.persona_id) return false;
  const persona = (proyecto.personas || []).find((p) => p.id === docenteId);
  if (!persona) return false;
  const tramosSesion = tramosCubiertos(proyecto, sesion);
  for (const tramoId of tramosSesion) {
    const clave = claveHueco(sesion.dia_id, tramoId);
    if (persona.disponibilidad && persona.disponibilidad[clave] === false) return false;
    const ocupado = (proyecto.horario || []).some((otra) => {
      if (otra.id === sesion.id || otra.dia_id !== sesion.dia_id) return false;
      if (!docentesDeSesion(proyecto, otra).includes(docenteId)) return false;
      return tramosCubiertos(proyecto, otra).includes(tramoId);
    });
    if (ocupado) return false;
  }
  return true;
}

export function docentesDisponiblesParaCobertura(proyecto, sesion, ausencia) {
  return (proyecto.personas || [])
    .filter((persona) => docenteDisponibleEnSesion(proyecto, persona.id, sesion, ausencia))
    .map((persona) => persona.id);
}

export function proponerCoberturasParaAusencia(proyecto, ausencia) {
  return sesionesAfectadasPorAusencia(proyecto, ausencia).map((sesion) => {
    const candidatos = docentesDisponiblesParaCobertura(proyecto, sesion, ausencia);
    return {
      ausencia_id: ausencia.id,
      sesion_id: sesion.id,
      candidatos,
      candidato_recomendado_id: candidatos[0] || '',
      estado: candidatos.length ? 'Propuesta' : 'Sin cubrir',
      descripcion: descripcionColocacion(proyecto, sesion)
    };
  });
}

export function crearCoberturasPropuestas(proyecto, ausenciaId) {
  const gestion = normalizarGestionDiaria(proyecto);
  const ausencia = gestion.ausencias.find((a) => a.id === ausenciaId);
  if (!ausencia) return { gestion, creadas: 0, sin_cobertura: 0 };
  const existentes = new Set(gestion.coberturas.filter((c) => c.ausencia_id === ausenciaId).map((c) => c.sesion_id));
  let creadas = 0;
  let sinCobertura = 0;
  for (const propuesta of proponerCoberturasParaAusencia(proyecto, ausencia)) {
    if (existentes.has(propuesta.sesion_id)) continue;
    if (!propuesta.candidato_recomendado_id) sinCobertura += 1;
    gestion.coberturas.push({
      id: generarId('cobertura'),
      ausencia_id: ausenciaId,
      sesion_id: propuesta.sesion_id,
      docente_id: propuesta.candidato_recomendado_id,
      estado: propuesta.candidato_recomendado_id ? 'Propuesta' : 'Sin cubrir',
      observaciones: propuesta.candidato_recomendado_id ? 'Propuesta automática. Requiere confirmación de jefatura.' : 'Sin docente disponible detectado automáticamente.',
      creado: new Date().toISOString()
    });
    creadas += 1;
  }
  return { gestion, creadas, sin_cobertura: sinCobertura };
}

export function resumenGestionDiaria(proyecto) {
  const gestion = normalizarGestionDiaria(proyecto);
  const confirmadas = gestion.ausencias.filter((a) => a.estado === 'Confirmada').length;
  const sesionesAfectadas = gestion.ausencias.reduce((suma, ausencia) => suma + sesionesAfectadasPorAusencia(proyecto, ausencia).length, 0);
  const coberturasConfirmadas = gestion.coberturas.filter((c) => ['Confirmada', 'Realizada'].includes(c.estado)).length;
  const sinCubrir = gestion.coberturas.filter((c) => c.estado === 'Sin cubrir' || !c.docente_id).length;
  return {
    ausencias: gestion.ausencias.length,
    ausencias_confirmadas: confirmadas,
    sesiones_afectadas: sesionesAfectadas,
    coberturas: gestion.coberturas.length,
    coberturas_confirmadas: coberturasConfirmadas,
    sin_cubrir: sinCubrir,
    incidencias: gestion.incidencias.length
  };
}

export function informeGestionDiariaEstructurado(proyecto) {
  const gestion = normalizarGestionDiaria(proyecto);
  const dias = new Map((proyecto.dias || []).map((d) => [d.id, d.nombre]));
  const tramos = new Map((proyecto.tramos || []).map((t) => [t.id, t.nombre]));
  const salida = [];
  for (const ausencia of gestion.ausencias) {
    const persona = obtenerNombrePorId(proyecto.personas || [], ausencia.persona_id, 'Sin docente');
    const dia = dias.get(ausencia.dia_id) || 'Sin día';
    const tramosTexto = ausencia.tramo_ids?.length ? ausencia.tramo_ids.map((id) => tramos.get(id) || id).join(', ') : 'Jornada completa';
    const sesiones = sesionesAfectadasPorAusencia(proyecto, ausencia);
    salida.push({ ausencia, persona, dia, tramosTexto, sesiones });
  }
  return { gestion, ausencias: salida };
}
