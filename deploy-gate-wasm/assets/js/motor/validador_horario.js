import { claveHueco, tramosCubiertos, ordenarPorOrden, docentesDeSesion, docentesDeActividad, requiereGrupoActividad, normalizarTramo, esActividadLectiva, esServicioCentro } from '../dominio/modelo.js';
import { calcularCargaDocente } from '../dominio/carga_docente.js';

function incidencia(nivel, codigo, mensaje, detalle = {}) {
  return { nivel, codigo, mensaje, detalle };
}

function existe(lista, id) {
  return Boolean(id) && lista.some((elemento) => elemento.id === id);
}

function nombreActividad(actividad) {
  return actividad?.nombre || 'Actividad sin nombre';
}

export function validarDatosProyecto(proyecto) {
  const incidencias = [];
  if (!proyecto?.centro?.nombre?.trim()) incidencias.push(incidencia('grave', 'CENTRO_SIN_NOMBRE', 'El centro debe tener nombre.'));
  if (!Array.isArray(proyecto.dias) || proyecto.dias.length === 0) incidencias.push(incidencia('grave', 'SIN_DIAS', 'Debe haber al menos un día lectivo.'));
  if (!Array.isArray(proyecto.tramos) || proyecto.tramos.length === 0) incidencias.push(incidencia('grave', 'SIN_TRAMOS', 'Debe haber al menos un tramo horario.'));
  if (!Array.isArray(proyecto.personas) || proyecto.personas.length === 0) incidencias.push(incidencia('grave', 'SIN_PROFESORADO', 'Debe añadirse al menos una persona docente.'));
  if (!Array.isArray(proyecto.grupos) || proyecto.grupos.length === 0) incidencias.push(incidencia('aviso', 'SIN_GRUPOS', 'No hay grupos o unidades. Solo se podrán modelar servicios o actividades sin grupo.'));
  if (!Array.isArray(proyecto.espacios) || proyecto.espacios.length === 0) incidencias.push(incidencia('aviso', 'SIN_ESPACIOS', 'No hay espacios definidos. Se podrá calcular sin aula, pero no validar ocupación de espacios.'));
  if (!Array.isArray(proyecto.actividades) || proyecto.actividades.length === 0) incidencias.push(incidencia('grave', 'SIN_ACTIVIDADES', 'Debe añadirse al menos una actividad horaria.'));

  const ids = new Map();
  for (const coleccion of ['personas', 'grupos', 'espacios', 'actividades']) {
    for (const elemento of proyecto[coleccion] || []) {
      if (!elemento.id) incidencias.push(incidencia('grave', 'ID_VACIO', `Hay un elemento sin identificador en ${coleccion}.`));
      if (ids.has(elemento.id)) incidencias.push(incidencia('grave', 'ID_DUPLICADO', `Hay identificadores duplicados: ${elemento.id}.`));
      ids.set(elemento.id, coleccion);
    }
  }

  for (const tramo of proyecto.tramos || []) {
    const t = normalizarTramo(tramo);
    if (!t.nombre?.trim()) incidencias.push(incidencia('grave', 'TRAMO_SIN_NOMBRE', 'Hay un tramo horario sin nombre.', { tramo_id: t.id }));
    if (t.inicio && !/^\d{1,2}:\d{2}$/.test(t.inicio)) incidencias.push(incidencia('aviso', 'TRAMO_INICIO_INVALIDO', `El tramo “${t.nombre}” tiene una hora de inicio no reconocible.`, { tramo_id: t.id }));
    if (t.fin && !/^\d{1,2}:\d{2}$/.test(t.fin)) incidencias.push(incidencia('aviso', 'TRAMO_FIN_INVALIDO', `El tramo “${t.nombre}” tiene una hora de fin no reconocible.`, { tramo_id: t.id }));
    if (t.inicio && t.fin && Number(t.duracion_minutos || 0) <= 0) incidencias.push(incidencia('aviso', 'TRAMO_DURACION_INVALIDA', `El tramo “${t.nombre}” no tiene una duración positiva.`, { tramo_id: t.id }));
    if (!t.admite_clase && !t.admite_servicios && t.tipo_tramo !== 'No disponible') incidencias.push(incidencia('aviso', 'TRAMO_SIN_USO', `El tramo “${t.nombre}” no admite clase ni servicios.`, { tramo_id: t.id }));
  }

  for (const grupo of proyecto.grupos || []) {
    if (grupo.grupo_matriz_id && !existe(proyecto.grupos, grupo.grupo_matriz_id)) {
      incidencias.push(incidencia('grave', 'GRUPO_MATRIZ_INEXISTENTE', `El subgrupo “${grupo.nombre}” tiene un grupo matriz que no existe.`, { grupo_id: grupo.id, grupo_matriz_id: grupo.grupo_matriz_id }));
    }
    if (grupo.grupo_matriz_id === grupo.id) {
      incidencias.push(incidencia('grave', 'GRUPO_MATRIZ_AUTORREFERENCIA', `El grupo “${grupo.nombre}” no puede ser matriz de sí mismo.`, { grupo_id: grupo.id }));
    }
  }

  for (const actividad of proyecto.actividades || []) {
    if (!actividad.nombre?.trim()) incidencias.push(incidencia('grave', 'ACTIVIDAD_SIN_NOMBRE', 'Hay una actividad sin nombre.', { actividad_id: actividad.id }));
    if (requiereGrupoActividad(actividad) && !existe(proyecto.grupos, actividad.grupo_id)) {
      incidencias.push(incidencia('grave', 'ACTIVIDAD_SIN_GRUPO', `La actividad “${nombreActividad(actividad)}” requiere un grupo, unidad o subgrupo válido.`, { actividad_id: actividad.id }));
    }
    if (!existe(proyecto.personas, actividad.persona_id)) incidencias.push(incidencia('grave', 'ACTIVIDAD_SIN_PERSONA', `La actividad “${nombreActividad(actividad)}” no tiene docente responsable válido.`, { actividad_id: actividad.id }));
    for (const docente_id of actividad.docentes_acompanantes_ids || []) {
      if (!existe(proyecto.personas, docente_id)) incidencias.push(incidencia('grave', 'DOCENTE_ACOMPANANTE_INVALIDO', `La actividad “${nombreActividad(actividad)}” tiene un docente acompañante no válido.`, { actividad_id: actividad.id, docente_id }));
      if (docente_id === actividad.persona_id) incidencias.push(incidencia('grave', 'DOCENTE_ACOMPANANTE_DUPLICADO', `La actividad “${nombreActividad(actividad)}” tiene repetido al docente responsable como acompañante.`, { actividad_id: actividad.id, docente_id }));
    }
    if (Number(actividad.docentes_necesarios || 1) > docentesDeActividad(actividad).length) {
      incidencias.push(incidencia('grave', 'COBERTURA_DOCENTE_INSUFICIENTE', `La actividad “${nombreActividad(actividad)}” necesita ${actividad.docentes_necesarios} docente/s y solo tiene ${docentesDeActividad(actividad).length}.`, { actividad_id: actividad.id }));
    }
    if (actividad.requiere_espacio && !existe(proyecto.espacios, actividad.espacio_id)) incidencias.push(incidencia('grave', 'ACTIVIDAD_SIN_ESPACIO_OBLIGATORIO', `La actividad “${nombreActividad(actividad)}” requiere un espacio válido.`, { actividad_id: actividad.id }));
    if (Number(actividad.sesiones_semanales) < 1) incidencias.push(incidencia('grave', 'SESIONES_INVALIDAS', `La actividad “${nombreActividad(actividad)}” debe tener al menos una sesión semanal.`, { actividad_id: actividad.id }));
    if (Number(actividad.duracion_tramos) < 1) incidencias.push(incidencia('grave', 'DURACION_INVALIDA', `La actividad “${nombreActividad(actividad)}” debe ocupar al menos un tramo.`, { actividad_id: actividad.id }));
    if (Number(actividad.duracion_tramos) > (proyecto.tramos || []).length) incidencias.push(incidencia('grave', 'DURACION_EXCESIVA', `La actividad “${nombreActividad(actividad)}” ocupa más tramos de los que tiene un día.`, { actividad_id: actividad.id }));
    const condiciones = actividad.condiciones || {};
    for (const dia_id of condiciones.dias_prohibidos || []) {
      if (!existe(proyecto.dias, dia_id)) incidencias.push(incidencia('aviso', 'CONDICION_DIA_INEXISTENTE', `La actividad “${nombreActividad(actividad)}” tiene un día prohibido que ya no existe.`, { actividad_id: actividad.id, dia_id }));
    }
    for (const tramo_id of condiciones.tramos_prohibidos || []) {
      if (!existe(proyecto.tramos, tramo_id)) incidencias.push(incidencia('aviso', 'CONDICION_TRAMO_INEXISTENTE', `La actividad “${nombreActividad(actividad)}” tiene un tramo prohibido que ya no existe.`, { actividad_id: actividad.id, tramo_id }));
    }
  }
  return incidencias;
}

export function validarHorario(proyecto) {
  const incidencias = [...validarDatosProyecto(proyecto)];
  const ocupacionGrupo = new Map();
  const ocupacionPersona = new Map();
  const ocupacionEspacio = new Map();
  const conteoActividad = new Map();
  const conteoActividadDia = new Map();
  const cargaDocente = new Map();

  const diasValidos = new Set((proyecto.dias || []).map((dia) => dia.id));
  const tramosValidos = new Set((proyecto.tramos || []).map((tramo) => tramo.id));
  const actividades = new Map((proyecto.actividades || []).map((actividad) => [actividad.id, actividad]));
  const personas = new Map((proyecto.personas || []).map((persona) => [persona.id, persona]));
  const grupos = new Map((proyecto.grupos || []).map((grupo) => [grupo.id, grupo]));
  const espacios = new Map((proyecto.espacios || []).map((espacio) => [espacio.id, espacio]));
  const tramosOrdenados = ordenarPorOrden(proyecto.tramos || []);
  const ultimoTramoId = tramosOrdenados[tramosOrdenados.length - 1]?.id || '';

  for (const colocacion of proyecto.horario || []) {
    const actividad = actividades.get(colocacion.actividad_id);
    if (!actividad) {
      incidencias.push(incidencia('grave', 'SESION_ACTIVIDAD_INEXISTENTE', 'Hay una sesión con actividad inexistente.', { colocacion_id: colocacion.id }));
      continue;
    }
    const grupo_id = colocacion.grupo_id || actividad.grupo_id || '';
    const persona_id = colocacion.persona_id || actividad.persona_id;
    const docentes = docentesDeSesion(proyecto, colocacion);
    const espacio_id = colocacion.espacio_id || actividad.espacio_id || '';
    if (!diasValidos.has(colocacion.dia_id)) incidencias.push(incidencia('grave', 'DIA_INVALIDO', `La actividad “${nombreActividad(actividad)}” está en un día no válido.`, { colocacion_id: colocacion.id }));
    if (!tramosValidos.has(colocacion.tramo_id)) incidencias.push(incidencia('grave', 'TRAMO_INVALIDO', `La actividad “${nombreActividad(actividad)}” está en un tramo no válido.`, { colocacion_id: colocacion.id }));
    if (requiereGrupoActividad(actividad) && !grupos.has(grupo_id)) incidencias.push(incidencia('grave', 'GRUPO_INVALIDO', `La actividad “${nombreActividad(actividad)}” requiere un grupo o subgrupo válido.`, { colocacion_id: colocacion.id }));
    if (!personas.has(persona_id)) incidencias.push(incidencia('grave', 'PERSONA_INVALIDA', `La actividad “${nombreActividad(actividad)}” tiene una persona responsable no válida.`, { colocacion_id: colocacion.id }));
    for (const docente_id of docentes) {
      if (!personas.has(docente_id)) incidencias.push(incidencia('grave', 'DOCENTE_SESION_INVALIDO', `La actividad “${nombreActividad(actividad)}” tiene un docente no válido en una sesión.`, { colocacion_id: colocacion.id, docente_id }));
    }
    if (Number(actividad.docentes_necesarios || 1) > docentes.length) {
      incidencias.push(incidencia('grave', 'SERVICIO_SIN_COBERTURA_MINIMA', `“${nombreActividad(actividad)}” necesita ${actividad.docentes_necesarios} docente/s en cada sesión y solo tiene ${docentes.length}.`, { colocacion_id: colocacion.id }));
    }
    if (actividad.requiere_espacio && !espacios.has(espacio_id)) incidencias.push(incidencia('grave', 'ESPACIO_INVALIDO', `La actividad “${nombreActividad(actividad)}” requiere un espacio válido.`, { colocacion_id: colocacion.id }));

    const tramos = tramosCubiertos(proyecto, colocacion);
    if (tramos.length !== Number(colocacion.duracion_tramos || actividad.duracion_tramos || 1)) {
      incidencias.push(incidencia('grave', 'BLOQUE_FUERA_DE_DIA', `La actividad “${nombreActividad(actividad)}” no cabe completa en el día elegido.`, { colocacion_id: colocacion.id }));
    }

    const condiciones = actividad.condiciones || {};
    const huecos = tramos.map((tramo_id) => claveHueco(colocacion.dia_id, tramo_id));
    const mapaTramos = new Map((proyecto.tramos || []).map((tramo) => [tramo.id, normalizarTramo(tramo)]));
    for (const tramo_id of tramos) {
      const tramo = mapaTramos.get(tramo_id);
      if (!tramo) continue;
      if (esActividadLectiva(actividad) && tramo.admite_clase === false) {
        incidencias.push(incidencia('grave', 'CLASE_EN_TRAMO_NO_LECTIVO', `La actividad lectiva “${nombreActividad(actividad)}” está en un tramo que no admite clase: ${tramo.nombre}.`, { colocacion_id: colocacion.id, tramo_id }));
      }
      if (esServicioCentro(actividad) && tramo.admite_servicios === false) {
        incidencias.push(incidencia('grave', 'SERVICIO_EN_TRAMO_NO_APTO', `El servicio “${nombreActividad(actividad)}” está en un tramo que no admite servicios: ${tramo.nombre}.`, { colocacion_id: colocacion.id, tramo_id }));
      }
    }
    if ((condiciones.dias_prohibidos || []).includes(colocacion.dia_id)) {
      incidencias.push(incidencia('grave', 'ACTIVIDAD_DIA_PROHIBIDO', `La actividad “${nombreActividad(actividad)}” está colocada en un día prohibido.`, { colocacion_id: colocacion.id, dia_id: colocacion.dia_id }));
    }
    if (condiciones.prohibir_ultima_hora && tramos.includes(ultimoTramoId)) {
      incidencias.push(incidencia('grave', 'ACTIVIDAD_ULTIMA_HORA_PROHIBIDA', `La actividad “${nombreActividad(actividad)}” no puede colocarse en la última hora.`, { colocacion_id: colocacion.id }));
    }
    for (const tramo_id of tramos) {
      if ((condiciones.tramos_prohibidos || []).includes(tramo_id)) {
        incidencias.push(incidencia('grave', 'ACTIVIDAD_TRAMO_PROHIBIDO', `La actividad “${nombreActividad(actividad)}” ocupa un tramo prohibido.`, { colocacion_id: colocacion.id, tramo_id }));
      }
    }
    for (const hueco of huecos) {
      if ((condiciones.huecos_prohibidos || []).includes(hueco)) {
        incidencias.push(incidencia('grave', 'ACTIVIDAD_HUECO_PROHIBIDO', `La actividad “${nombreActividad(actividad)}” está en un hueco prohibido.`, { colocacion_id: colocacion.id, hueco }));
      }
    }

    for (const tramo_id of tramos) {
      const hueco = claveHueco(colocacion.dia_id, tramo_id);
      if (grupo_id) {
        const claveGrupo = `${grupo_id}__${hueco}`;
        if (ocupacionGrupo.has(claveGrupo)) incidencias.push(incidencia('grave', 'GRUPO_SOLAPADO', `El grupo o subgrupo tiene dos actividades a la vez en ${hueco}.`, { colocacion_id: colocacion.id, otra: ocupacionGrupo.get(claveGrupo) }));
        ocupacionGrupo.set(claveGrupo, colocacion.id);
      }
      for (const docente_id of docentes) {
        const clavePersona = `${docente_id}__${hueco}`;
        if (ocupacionPersona.has(clavePersona)) incidencias.push(incidencia('grave', 'PERSONA_SOLAPADA', `La persona docente tiene dos actividades a la vez en ${hueco}.`, { colocacion_id: colocacion.id, docente_id, otra: ocupacionPersona.get(clavePersona) }));
        ocupacionPersona.set(clavePersona, colocacion.id);
        const persona = personas.get(docente_id);
        if (persona?.disponibilidad && persona.disponibilidad[hueco] === false) {
          incidencias.push(incidencia('grave', 'PERSONA_NO_DISPONIBLE', `La persona docente no está disponible para “${nombreActividad(actividad)}”.`, { colocacion_id: colocacion.id, docente_id, hueco }));
        }
        cargaDocente.set(docente_id, (cargaDocente.get(docente_id) || 0) + 1);
      }
      if (espacio_id) {
        const claveEspacio = `${espacio_id}__${hueco}`;
        if (ocupacionEspacio.has(claveEspacio)) incidencias.push(incidencia('grave', 'ESPACIO_SOLAPADO', `El espacio está asignado dos veces a la vez en ${hueco}.`, { colocacion_id: colocacion.id, otra: ocupacionEspacio.get(claveEspacio) }));
        ocupacionEspacio.set(claveEspacio, colocacion.id);
        const espacio = espacios.get(espacio_id);
        if (espacio?.disponibilidad && espacio.disponibilidad[hueco] === false) {
          incidencias.push(incidencia('grave', 'ESPACIO_NO_DISPONIBLE', `El espacio no está disponible para “${nombreActividad(actividad)}”.`, { colocacion_id: colocacion.id, hueco }));
        }
      }
    }
    conteoActividad.set(actividad.id, (conteoActividad.get(actividad.id) || 0) + 1);
    const claveActividadDia = `${actividad.id}__${colocacion.dia_id}`;
    conteoActividadDia.set(claveActividadDia, (conteoActividadDia.get(claveActividadDia) || 0) + 1);
  }

  for (const actividad of proyecto.actividades || []) {
    const colocadas = conteoActividad.get(actividad.id) || 0;
    const previstas = Number(actividad.sesiones_semanales || 0);
    if (colocadas < previstas) incidencias.push(incidencia('aviso', 'SESIONES_PENDIENTES', `La actividad “${nombreActividad(actividad)}” tiene ${previstas - colocadas} sesión/es pendiente/s.`, { actividad_id: actividad.id, colocadas, previstas }));
    if (colocadas > previstas) incidencias.push(incidencia('grave', 'SESIONES_DE_MAS', `La actividad “${nombreActividad(actividad)}” tiene más sesiones de las previstas.`, { actividad_id: actividad.id, colocadas, previstas }));
    if (actividad.condiciones?.una_sesion_por_dia) {
      for (const dia of proyecto.dias || []) {
        const colocadasDia = conteoActividadDia.get(`${actividad.id}__${dia.id}`) || 0;
        if (colocadasDia > 1) {
          incidencias.push(incidencia('grave', 'ACTIVIDAD_REPETIDA_MISMO_DIA', `La actividad “${nombreActividad(actividad)}” no puede tener más de una sesión el mismo día.`, { actividad_id: actividad.id, dia_id: dia.id, colocadasDia }));
        }
      }
    }
  }

  for (const persona of proyecto.personas || []) {
    const carga = cargaDocente.get(persona.id) || 0;
    const maximo = Number(persona.horas_maximas || persona.horas_permanencia_objetivo || 0);
    if (maximo > 0 && carga > maximo) {
      incidencias.push(incidencia('aviso', 'CARGA_DOCENTE_SUPERA_MAXIMO', `La persona “${persona.nombre}” tiene ${carga} tramo/s asignado/s y supera su máximo indicado (${maximo}).`, { persona_id: persona.id, carga, maximo }));
    }
  }

  for (const registro of calcularCargaDocente(proyecto)) {
    if (registro.objetivo_lectiva && registro.diferencia_lectiva !== 0) {
      incidencias.push(incidencia('aviso', registro.diferencia_lectiva > 0 ? 'CARGA_LECTIVA_EXCESO' : 'CARGA_LECTIVA_DEFECTO', `La persona “${registro.nombre}” tiene ${registro.lectiva} tramo/s lectivo/s frente a ${registro.objetivo_lectiva} previsto/s.`, { persona_id: registro.persona_id, carga: registro.lectiva, objetivo: registro.objetivo_lectiva }));
    }
    if (registro.objetivo_dc && registro.diferencia_dc !== 0) {
      incidencias.push(incidencia('aviso', registro.diferencia_dc > 0 ? 'CARGA_DC_EXCESO' : 'CARGA_DC_DEFECTO', `La persona “${registro.nombre}” tiene ${registro.dc} tramo/s de DC frente a ${registro.objetivo_dc} previsto/s.`, { persona_id: registro.persona_id, carga: registro.dc, objetivo: registro.objetivo_dc }));
    }
    if (registro.objetivo_permanencia && registro.diferencia_permanencia !== 0) {
      incidencias.push(incidencia('aviso', registro.diferencia_permanencia > 0 ? 'CARGA_PERMANENCIA_EXCESO' : 'CARGA_PERMANENCIA_DEFECTO', `La persona “${registro.nombre}” tiene ${registro.total_permanencia} tramo/s de permanencia frente a ${registro.objetivo_permanencia} previsto/s.`, { persona_id: registro.persona_id, carga: registro.total_permanencia, objetivo: registro.objetivo_permanencia }));
    }
  }

  return incidencias;
}

export function tieneGraves(incidencias) {
  return incidencias.some((incidencia) => incidencia.nivel === 'grave');
}

export function resumenValidacion(incidencias) {
  const graves = incidencias.filter((i) => i.nivel === 'grave').length;
  const avisos = incidencias.filter((i) => i.nivel === 'aviso').length;
  if (graves === 0 && avisos === 0) return 'Horario completo y sin incidencias.';
  if (graves === 0) return `Horario sin errores graves. Avisos: ${avisos}.`;
  return `Horario con ${graves} error/es grave/s y ${avisos} aviso/s.`;
}
