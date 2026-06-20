import {
  claveHueco,
  nuevaColocacion,
  ordenarPorOrden,
  docentesDeActividad,
  requiereGrupoActividad,
  obtenerNombrePorId
} from './modelo.js';
import { validarHorario, validarDatosProyecto } from '../motor/validador_horario.js';
import { revisarPreparacionProyecto } from './revision_previa.js';

const TEXTOS_CAUSA = {
  BLOQUE_FUERA_DE_DIA: {
    causa: 'La duración de la actividad no cabe desde ese tramo hasta el final del día.',
    revisar: 'Revise la duración en tramos o use un tramo de inicio más temprano.'
  },
  ACTIVIDAD_DIA_PROHIBIDO: {
    causa: 'La actividad tiene días prohibidos que reducen los huecos disponibles.',
    revisar: 'Revise los días prohibidos en Condiciones.'
  },
  ACTIVIDAD_TRAMO_PROHIBIDO: {
    causa: 'La actividad tiene tramos prohibidos.',
    revisar: 'Revise los tramos prohibidos en Condiciones.'
  },
  ACTIVIDAD_HUECO_PROHIBIDO: {
    causa: 'La actividad tiene huecos concretos prohibidos.',
    revisar: 'Revise los huecos prohibidos concretos.'
  },
  ACTIVIDAD_ULTIMA_HORA_PROHIBIDA: {
    causa: 'La actividad no puede colocarse en la última hora.',
    revisar: 'Permita la última hora o reduzca otras restricciones.'
  },
  ACTIVIDAD_REPETIDA_MISMO_DIA: {
    causa: 'La actividad solo permite una sesión por día y ya ocupa algunos días.',
    revisar: 'Permita más de una sesión diaria o aumente los días disponibles.'
  },
  GRUPO_SOLAPADO: {
    causa: 'El grupo o subgrupo ya está ocupado en los huecos candidatos.',
    revisar: 'Revise el horario del grupo, subgrupos y sesiones fijadas.'
  },
  PERSONA_SOLAPADA: {
    causa: 'La persona docente ya tiene otra actividad en los huecos candidatos.',
    revisar: 'Revise el horario de esa persona o cambie docente responsable/acompañante.'
  },
  DOCENTE_SESION_INVALIDO: {
    causa: 'Hay un docente acompañante no válido.',
    revisar: 'Revise responsable y docentes acompañantes.'
  },
  PERSONA_NO_DISPONIBLE: {
    causa: 'La persona docente no está disponible en los huecos candidatos.',
    revisar: 'Revise la disponibilidad del profesorado.'
  },
  ESPACIO_SOLAPADO: {
    causa: 'El espacio ya está ocupado en los huecos candidatos.',
    revisar: 'Cambie el espacio, libere huecos o añada espacios alternativos.'
  },
  ESPACIO_NO_DISPONIBLE: {
    causa: 'El espacio no está disponible en los huecos candidatos.',
    revisar: 'Revise disponibilidad del espacio o use otro espacio.'
  },
  ESPACIO_INVALIDO: {
    causa: 'La actividad requiere un espacio válido y no lo tiene.',
    revisar: 'Asigne un espacio o desactive “espacio obligatorio”.'
  },
  PERSONA_INVALIDA: {
    causa: 'La actividad no tiene docente responsable válido.',
    revisar: 'Asigne una persona docente responsable.'
  },
  GRUPO_INVALIDO: {
    causa: 'La actividad requiere grupo/subgrupo válido y no lo tiene.',
    revisar: 'Asigne grupo, unidad o subgrupo; si es DC/servicio sin grupo, marque que no requiere grupo.'
  },
  SERVICIO_SIN_COBERTURA_MINIMA: {
    causa: 'No se alcanza la cobertura mínima de docentes necesaria.',
    revisar: 'Añada docentes acompañantes o reduzca el número de docentes necesarios.'
  },
  DIA_INVALIDO: {
    causa: 'Hay una sesión en un día no válido.',
    revisar: 'Revise días del centro y sesiones colocadas.'
  },
  TRAMO_INVALIDO: {
    causa: 'Hay una sesión en un tramo no válido.',
    revisar: 'Revise tramos del centro y sesiones colocadas.'
  }
};

function contador() { return new Map(); }
function sumar(mapa, codigo) { mapa.set(codigo, (mapa.get(codigo) || 0) + 1); }
function nombreActividad(actividad) { return actividad?.nombre || 'Actividad sin nombre'; }
function descripcionDocentes(proyecto, actividad) {
  return docentesDeActividad(actividad).map((id) => obtenerNombrePorId(proyecto.personas || [], id, '')).filter(Boolean).join(' + ') || 'Sin docente';
}
function descripcionGrupo(proyecto, actividad) {
  return actividad.grupo_id ? obtenerNombrePorId(proyecto.grupos || [], actividad.grupo_id, 'Grupo no encontrado') : 'Sin grupo';
}
function descripcionEspacio(proyecto, actividad) {
  return actividad.espacio_id ? obtenerNombrePorId(proyecto.espacios || [], activitySafeId(actividad), 'Espacio no encontrado') : 'Sin espacio';
}
function activitySafeId(actividad) { return actividad.espacio_id || ''; }

function normalizarTextoCodigo(codigo) {
  return TEXTOS_CAUSA[codigo] || {
    causa: `La validación bloquea el hueco por ${codigo}.`,
    revisar: 'Revise la incidencia detallada en Validación.'
  };
}

function crearSesionPrueba(actividad, dia_id, tramo_id) {
  return nuevaColocacion({
    actividad_id: actividad.id,
    dia_id,
    tramo_id,
    grupo_id: actividad.grupo_id || '',
    persona_id: activityPersonaId(actividad),
    docentes_acompanantes_ids: actividad.docentes_acompanantes_ids || [],
    espacio_id: actividad.espacio_id || '',
    duracion_tramos: actividad.duracion_tramos || 1,
    fija: false
  });
}
function activityPersonaId(actividad) { return actividad.persona_id || ''; }

function contarColocadas(proyecto, actividadId) {
  return (proyecto.horario || []).filter((sesion) => sesion.actividad_id === actividadId).length;
}

function explicarDatosActividad(proyecto, actividad) {
  const causas = [];
  if (!actividad.persona_id) causas.push({ codigo: 'PERSONA_INVALIDA', ...normalizarTextoCodigo('PERSONA_INVALIDA'), ocurrencias: 1 });
  if (requiereGrupoActividad(actividad) && !actividad.grupo_id) causas.push({ codigo: 'GRUPO_INVALIDO', ...normalizarTextoCodigo('GRUPO_INVALIDO'), ocurrencias: 1 });
  if (actividad.requiere_espacio && !actividad.espacio_id) causas.push({ codigo: 'ESPACIO_INVALIDO', ...normalizarTextoCodigo('ESPACIO_INVALIDO'), ocurrencias: 1 });
  if (Number(actividad.docentes_necesarios || 1) > docentesDeActividad(actividad).length) causas.push({ codigo: 'SERVICIO_SIN_COBERTURA_MINIMA', ...normalizarTextoCodigo('SERVICIO_SIN_COBERTURA_MINIMA'), ocurrencias: 1 });
  return causas;
}

function explicarActividadPendiente(proyecto, actividad) {
  const previstas = Number(actividad.sesiones_semanales || 0);
  const colocadas = contarColocadas(proyecto, actividad.id);
  const pendientes = Math.max(0, previstas - colocadas);
  const datos = explicarDatosActividad(proyecto, actividad);
  if (pendientes <= 0) return null;

  const dias = ordenarPorOrden(proyecto.dias || []);
  const tramos = ordenarPorOrden(proyecto.tramos || []);
  const duracion = Math.max(1, Number(actividad.duracion_tramos || 1));
  const candidatos = [];
  for (const dia of dias) {
    for (let indice = 0; indice <= tramos.length - duracion; indice += 1) {
      candidatos.push({ dia_id: dia.id, tramo_id: tramos[indice].id });
    }
  }

  if (datos.length) {
    return {
      nivel: 'bloqueo',
      actividad_id: actividad.id,
      actividad_nombre: nombreActividad(actividad),
      pendientes,
      candidatos: candidatos.length,
      candidatos_posibles: 0,
      diagnostico: 'Faltan datos obligatorios antes de poder colocar esta actividad.',
      contexto: contextoActividad(proyecto, actividad),
      causas: datos
    };
  }

  const codigos = contador();
  let posibles = 0;
  const ejemplos = [];
  for (const candidato of candidatos) {
    const prueba = crearSesionPrueba(actividad, candidato.dia_id, candidato.tramo_id);
    const proyectoPrueba = { ...proyecto, horario: [...(proyecto.horario || []), prueba] };
    const graves = validarHorario(proyectoPrueba).filter((incidencia) => incidencia.nivel === 'grave');
    if (!graves.length) {
      posibles += 1;
      if (ejemplos.length < 3) ejemplos.push({ dia_id: candidato.dia_id, tramo_id: candidato.tramo_id });
      continue;
    }
    for (const grave of graves) sumar(codigos, grave.codigo || 'VALIDACION');
  }

  const causas = [...codigos.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([codigo, ocurrencias]) => ({ codigo, ocurrencias, ...normalizarTextoCodigo(codigo) }));

  if (posibles > 0) {
    return {
      nivel: 'aviso',
      actividad_id: actividad.id,
      actividad_nombre: nombreActividad(actividad),
      pendientes,
      candidatos: candidatos.length,
      candidatos_posibles: posibles,
      diagnostico: `Hay ${posibles} hueco/s técnicamente posible/s, pero el motor no ha colocado todas las sesiones. Pruebe a recalcular o coloque manualmente desde “Revisar y ajustar”.`,
      contexto: contextoActividad(proyecto, actividad),
      causas: causas.length ? causas : [{ codigo: 'HUECOS_POSIBLES', ocurrencias: posibles, causa: 'Existen huecos válidos.', revisar: 'Use la colocación manual o recalcule.' }],
      ejemplos
    };
  }

  return {
    nivel: 'bloqueo',
    actividad_id: actividad.id,
    actividad_nombre: nombreActividad(actividad),
    pendientes,
    candidatos: candidatos.length,
    candidatos_posibles: 0,
    diagnostico: 'No se ha encontrado ningún hueco válido para las sesiones pendientes con las condiciones actuales.',
    contexto: contextoActividad(proyecto, actividad),
    causas: causas.length ? causas : [{ codigo: 'SIN_HUECOS', ocurrencias: 0, causa: 'No hay huecos candidatos válidos.', revisar: 'Revise días, tramos, duración, disponibilidad y sesiones fijadas.' }]
  };
}

function contextoActividad(proyecto, actividad) {
  return {
    tipo: actividad.tipo || 'Actividad',
    clasificacion: actividad.clasificacion_horaria || 'Lectiva',
    grupo: descripcionGrupo(proyecto, actividad),
    docentes: descripcionDocentes(proyecto, actividad),
    espacio: descripcionEspacio(proyecto, actividad),
    duracion_tramos: Number(actividad.duracion_tramos || 1),
    sesiones_semanales: Number(actividad.sesiones_semanales || 0)
  };
}

function explicarBloqueosPreparacion(proyecto) {
  const revision = revisarPreparacionProyecto(proyecto);
  return revision.items
    .filter((item) => item.estado === 'bloqueo')
    .map((item) => ({
      nivel: 'bloqueo',
      codigo: item.codigo,
      actividad_id: item.actividad_id || '',
      actividad_nombre: item.titulo,
      pendientes: 0,
      candidatos: 0,
      candidatos_posibles: 0,
      diagnostico: item.detalle,
      contexto: {},
      causas: [{ codigo: item.codigo, ocurrencias: 1, causa: item.titulo, revisar: item.destino ? `Revise la sección ${item.destino}.` : 'Revise el asistente de creación.' }]
    }));
}

export function explicarBloqueosProyecto(proyecto) {
  const items = [];
  const datosGraves = validarDatosProyecto(proyecto).filter((incidencia) => incidencia.nivel === 'grave');
  if (datosGraves.length) {
    for (const incidencia of datosGraves) {
      items.push({
        nivel: 'bloqueo',
        codigo: incidencia.codigo,
        actividad_id: '',
        actividad_nombre: 'Datos básicos del centro',
        pendientes: 0,
        candidatos: 0,
        candidatos_posibles: 0,
        diagnostico: incidencia.mensaje,
        contexto: {},
        causas: [{ codigo: incidencia.codigo, ocurrencias: 1, causa: incidencia.mensaje, revisar: 'Revise el asistente y los datos básicos antes de calcular.' }]
      });
    }
  }
  for (const item of explicarBloqueosPreparacion(proyecto)) {
    if (!items.some((x) => x.codigo === item.codigo && x.actividad_id === item.actividad_id)) items.push(item);
  }
  for (const actividad of proyecto.actividades || []) {
    const explicacion = explicarActividadPendiente(proyecto, actividad);
    if (explicacion) items.push(explicacion);
  }
  const bloqueos = items.filter((item) => item.nivel === 'bloqueo').length;
  const avisos = items.filter((item) => item.nivel !== 'bloqueo').length;
  return {
    bloqueos,
    avisos,
    items,
    resumen: resumenExplicaciones({ bloqueos, avisos, items })
  };
}

export function resumenExplicaciones(resultado) {
  const total = resultado?.items?.length || 0;
  if (!total) return 'No hay sesiones pendientes ni bloqueos explicables.';
  if (resultado.bloqueos) return `${resultado.bloqueos} bloqueo/s y ${resultado.avisos || 0} aviso/s explicados.`;
  return `${resultado.avisos || total} aviso/s explicados; no hay bloqueos graves de colocación.`;
}
