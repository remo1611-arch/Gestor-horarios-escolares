export const VERSION_APLICACION = '1.4.1';
export const VERSION_FORMATO = '1.7';

export const TIPOS_CENTRO = ['IES', 'CEIP', 'CPI', 'CIFP', 'CEE', 'Otro'];
export const CLASIFICACIONES_HORARIAS = ['Lectiva', 'Docencia complementaria', 'Servicio de centro', 'No lectiva'];
export const TIPOS_TRAMO = ['Lectivo', 'Entrada', 'Recreo', 'Salida', 'Transporte', 'Comida', 'Reunión', 'No disponible'];
export const TIPOS_DOCENCIA_COMPLEMENTARIA = ['Guardia', 'Guardia de patio', 'Guardia de entrada', 'Guardia de salida', 'Guardia de recreo', 'Tutoría de atención a familias', 'Coordinación', 'Cargo', 'Reducción', 'Biblioteca', 'Reunión', 'Permanencia en centro', 'Itinerancia'];
export const TIPOS_ACTIVIDAD = [
  'Materia',
  'Módulo profesional',
  'Ámbito',
  'Apoyo lectivo',
  'Tutoría lectiva',
  'Libre disposición',
  'Docencia compartida',
  'Religión',
  'Atención educativa',
  'Guardia',
  'Guardia de patio',
  'Guardia de entrada',
  'Guardia de salida',
  'Guardia de recreo',
  'Tutoría de atención a familias',
  'Coordinación',
  'Cargo',
  'Reducción',
  'Biblioteca',
  'Atención específica',
  'Reunión',
  'Itinerancia',
  'Permanencia en centro',
  'Actividad fija'
];

export const DIAS_BASE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function generarId(prefijo = 'id') {
  const aleatorio = Math.random().toString(36).slice(2, 9);
  const tiempo = Date.now().toString(36).slice(-5);
  return `${prefijo}_${tiempo}_${aleatorio}`;
}

export function minutosDesdeHora(valor = '') {
  const m = String(valor || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
}

export function calcularDuracionMinutos(inicio = '', fin = '') {
  const a = minutosDesdeHora(inicio);
  const b = minutosDesdeHora(fin);
  if (a === null || b === null || b <= a) return 0;
  return b - a;
}

export function crearTramosBase(numero = 6) {
  const tramos = [];
  for (let i = 1; i <= numero; i += 1) {
    tramos.push(normalizarTramo({ id: `tramo_${i}`, nombre: `${i}.ª hora`, orden: i, inicio: '', fin: '', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false, computa_permanencia: true }));
  }
  return tramos;
}

export function normalizarTramo(tramo = {}) {
  const tipo = TIPOS_TRAMO.includes(tramo.tipo_tramo) ? tramo.tipo_tramo : 'Lectivo';
  const calculada = calcularDuracionMinutos(tramo.inicio || '', tramo.fin || '');
  const duracion = Math.max(0, Number(tramo.duracion_minutos || calculada || (tipo === 'Lectivo' ? 50 : 0)));
  const esLectivo = tipo === 'Lectivo';
  const esServicio = ['Entrada', 'Recreo', 'Salida', 'Transporte', 'Comida'].includes(tipo);
  return {
    ...tramo,
    nombre: tramo.nombre || 'Tramo horario',
    inicio: tramo.inicio || '',
    fin: tramo.fin || '',
    duracion_minutos: duracion,
    tipo_tramo: tipo,
    admite_clase: Object.prototype.hasOwnProperty.call(tramo, 'admite_clase') ? Boolean(tramo.admite_clase) : esLectivo,
    admite_servicios: Object.prototype.hasOwnProperty.call(tramo, 'admite_servicios') ? Boolean(tramo.admite_servicios) : esServicio,
    computa_permanencia: Object.prototype.hasOwnProperty.call(tramo, 'computa_permanencia') ? Boolean(tramo.computa_permanencia) : tipo !== 'No disponible'
  };
}

export function crearProyectoVacio() {
  return {
    version_formato: VERSION_FORMATO,
    aplicacion: {
      nombre: 'Generador de Horarios Escolares',
      version: VERSION_APLICACION
    },
    centro: {
      nombre: 'Centro sin nombre',
      tipo: 'IES',
      curso_academico: '2026-2027',
      descripcion: ''
    },
    dias: DIAS_BASE.map((nombre, indice) => ({ id: `dia_${indice + 1}`, nombre, orden: indice + 1 })),
    tramos: crearTramosBase(6),
    personas: [],
    grupos: [],
    espacios: [],
    actividades: [],
    horario: [],
    preferencias: {
      repartir_actividad_en_dias: true,
      evitar_ultima_hora: false,
      compactar_profesorado: false,
      minimizar_cambios_espacio: true,
      priorizar_tramos_preferidos: true
    },
    gestion_diaria: { ausencias: [], coberturas: [], incidencias: [] },
    historial: [],
    metadatos: {
      creado: new Date().toISOString(),
      modificado: new Date().toISOString(),
      origen: 'nuevo'
    }
  };
}

export function clonar(valor) {
  return structuredClone ? structuredClone(valor) : JSON.parse(JSON.stringify(valor));
}

export function claveHueco(dia_id, tramo_id) {
  return `${dia_id}__${tramo_id}`;
}

export function obtenerNombrePorId(lista, id, reserva = 'Sin asignar') {
  return lista.find((elemento) => elemento.id === id)?.nombre || reserva;
}

export function crearDisponibilidadCompleta(proyecto) {
  const disponibilidad = {};
  for (const dia of proyecto.dias) {
    for (const tramo of proyecto.tramos) {
      disponibilidad[claveHueco(dia.id, tramo.id)] = true;
    }
  }
  return disponibilidad;
}

export function asegurarDisponibilidad(entidad, proyecto) {
  if (!entidad.disponibilidad || typeof entidad.disponibilidad !== 'object') {
    entidad.disponibilidad = crearDisponibilidadCompleta(proyecto);
  }
  for (const dia of proyecto.dias) {
    for (const tramo of proyecto.tramos) {
      const clave = claveHueco(dia.id, tramo.id);
      if (typeof entidad.disponibilidad[clave] !== 'boolean') entidad.disponibilidad[clave] = true;
    }
  }
  return entidad;
}

export function condicionesBaseActividad() {
  return {
    dias_prohibidos: [],
    tramos_prohibidos: [],
    huecos_prohibidos: [],
    dias_preferidos: [],
    tramos_preferidos: [],
    una_sesion_por_dia: false,
    prohibir_ultima_hora: false
  };
}

export function normalizarCondicionesActividad(condiciones = {}) {
  const base = condicionesBaseActividad();
  const listas = ['dias_prohibidos', 'tramos_prohibidos', 'huecos_prohibidos', 'dias_preferidos', 'tramos_preferidos'];
  const salida = { ...base, ...(condiciones || {}) };
  for (const clave of listas) {
    salida[clave] = Array.isArray(salida[clave]) ? [...new Set(salida[clave].filter(Boolean))] : [];
  }
  salida.una_sesion_por_dia = Boolean(salida.una_sesion_por_dia);
  salida.prohibir_ultima_hora = Boolean(salida.prohibir_ultima_hora);
  return salida;
}

export function esActividadLectiva(actividad = {}) {
  return (actividad.clasificacion_horaria || 'Lectiva') === 'Lectiva';
}

export function esServicioCentro(actividad = {}) {
  return (actividad.clasificacion_horaria || '') === 'Servicio de centro' || ['Guardia de patio', 'Guardia de entrada', 'Guardia de salida', 'Guardia de recreo'].includes(actividad.tipo || '');
}

export function esDocenciaComplementaria(actividad = {}) {
  return (actividad.clasificacion_horaria || '') === 'Docencia complementaria' || TIPOS_DOCENCIA_COMPLEMENTARIA.includes(actividad.tipo || '');
}

export function normalizarClasificacionHoraria(actividad = {}) {
  const actual = actividad.clasificacion_horaria || '';
  if (actual === 'DC') return 'Docencia complementaria';
  if (actual === 'No lectiva' && TIPOS_DOCENCIA_COMPLEMENTARIA.includes(actividad.tipo || '')) return 'Docencia complementaria';
  if (actual === 'Servicio de centro' && TIPOS_DOCENCIA_COMPLEMENTARIA.includes(actividad.tipo || '')) return 'Docencia complementaria';
  return CLASIFICACIONES_HORARIAS.includes(actual) ? actual : 'Lectiva';
}

export function requiereGrupoActividad(actividad = {}) {
  if (Object.prototype.hasOwnProperty.call(actividad, 'requiere_grupo')) return Boolean(actividad.requiere_grupo);
  return esActividadLectiva(actividad);
}

export function docentesDeActividad(actividad = {}) {
  const ids = [];
  if (actividad.persona_id) ids.push(actividad.persona_id);
  for (const id of actividad.docentes_acompanantes_ids || []) {
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function docentesDeSesion(proyecto, colocacion = {}) {
  const actividad = proyecto.actividades.find((a) => a.id === colocacion.actividad_id) || {};
  const ids = [];
  if (colocacion.persona_id || actividad.persona_id) ids.push(colocacion.persona_id || actividad.persona_id);
  for (const id of (colocacion.docentes_acompanantes_ids || actividad.docentes_acompanantes_ids || [])) {
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function normalizarActividad(actividad = {}) {
  const clasificacion = normalizarClasificacionHoraria(actividad);
  const esNoLectiva = clasificacion !== 'Lectiva';
  const requiereGrupo = Object.prototype.hasOwnProperty.call(actividad, 'requiere_grupo') ? Boolean(actividad.requiere_grupo) : clasificacion === 'Lectiva';
  return {
    ...actividad,
    tipo: actividad.tipo || 'Materia',
    clasificacion_horaria: clasificacion,
    grupo_id: actividad.grupo_id || '',
    persona_id: actividad.persona_id || '',
    espacio_id: actividad.espacio_id || '',
    docentes_acompanantes_ids: Array.isArray(actividad.docentes_acompanantes_ids) ? [...new Set(actividad.docentes_acompanantes_ids.filter(Boolean))] : [],
    docentes_necesarios: Math.max(1, Number(actividad.docentes_necesarios || 1)),
    computa_lectivo: esNoLectiva ? false : (Object.prototype.hasOwnProperty.call(actividad, 'computa_lectivo') ? Boolean(actividad.computa_lectivo) : true),
    computa_no_lectivo: esNoLectiva ? true : (Object.prototype.hasOwnProperty.call(actividad, 'computa_no_lectivo') ? Boolean(actividad.computa_no_lectivo) : false),
    requiere_grupo: requiereGrupo,
    sesiones_semanales: Math.max(0, Number(actividad.sesiones_semanales || 0)),
    duracion_tramos: Math.max(1, Number(actividad.duracion_tramos || 1)),
    requiere_espacio: Boolean(actividad.requiere_espacio),
    condiciones: normalizarCondicionesActividad(actividad.condiciones)
  };
}

export function normalizarProyecto(entrada) {
  const base = crearProyectoVacio();
  const proyecto = { ...base, ...clonar(entrada || {}) };
  proyecto.version_formato = VERSION_FORMATO;
  proyecto.aplicacion = { ...base.aplicacion, ...(entrada?.aplicacion || {}), version: VERSION_APLICACION };
  proyecto.centro = { ...base.centro, ...(entrada?.centro || {}) };
  proyecto.dias = Array.isArray(entrada?.dias) && entrada.dias.length ? entrada.dias : base.dias;
  proyecto.tramos = Array.isArray(entrada?.tramos) && entrada.tramos.length ? entrada.tramos.map((tramo, indice) => normalizarTramo({ orden: indice + 1, ...tramo })) : base.tramos;
  proyecto.personas = Array.isArray(entrada?.personas) ? entrada.personas.map((persona) => ({
    ...persona,
    horas_maximas: Number(persona.horas_maximas || persona.horas_permanencia_objetivo || 25),
    horas_lectivas_objetivo: Number(persona.horas_lectivas_objetivo || 0),
    horas_dc_objetivo: Number(persona.horas_dc_objetivo || 0),
    horas_permanencia_objetivo: Number(persona.horas_permanencia_objetivo || 0)
  })) : [];
  proyecto.grupos = Array.isArray(entrada?.grupos) ? entrada.grupos.map((grupo) => ({
    ...grupo,
    grupo_matriz_id: grupo.grupo_matriz_id || '',
    tipo_agrupamiento: grupo.tipo_agrupamiento || (grupo.grupo_matriz_id ? 'Subgrupo' : 'Grupo'),
    permite_paralelo_con_matriz: Boolean(grupo.permite_paralelo_con_matriz)
  })) : [];
  proyecto.espacios = Array.isArray(entrada?.espacios) ? entrada.espacios : [];
  proyecto.actividades = Array.isArray(entrada?.actividades) ? entrada.actividades.map((actividad) => normalizarActividad(actividad)) : [];
  proyecto.horario = Array.isArray(entrada?.horario) ? entrada.horario.map((sesion) => ({
    ...sesion,
    docentes_acompanantes_ids: Array.isArray(sesion.docentes_acompanantes_ids) ? [...new Set(sesion.docentes_acompanantes_ids.filter(Boolean))] : undefined
  })) : [];
  proyecto.preferencias = { ...base.preferencias, ...(entrada?.preferencias || {}) };
  proyecto.gestion_diaria = {
    ausencias: Array.isArray(entrada?.gestion_diaria?.ausencias) ? entrada.gestion_diaria.ausencias : [],
    coberturas: Array.isArray(entrada?.gestion_diaria?.coberturas) ? entrada.gestion_diaria.coberturas : [],
    incidencias: Array.isArray(entrada?.gestion_diaria?.incidencias) ? entrada.gestion_diaria.incidencias : []
  };
  proyecto.historial = Array.isArray(entrada?.historial) ? entrada.historial : [];
  proyecto.metadatos = { ...base.metadatos, ...(entrada?.metadatos || {}), modificado: new Date().toISOString() };
  for (const persona of proyecto.personas) asegurarDisponibilidad(persona, proyecto);
  for (const espacio of proyecto.espacios) asegurarDisponibilidad(espacio, proyecto);
  return proyecto;
}

export function nuevaPersona(nombre = '') {
  return {
    id: generarId('persona'),
    nombre: nombre.trim() || 'Nueva persona',
    departamento: '',
    horas_maximas: 25,
    horas_lectivas_objetivo: 0,
    horas_dc_objetivo: 0,
    horas_permanencia_objetivo: 0,
    observaciones: '',
    disponibilidad: {}
  };
}

export function nuevoGrupo(nombre = '') {
  return {
    id: generarId('grupo'),
    nombre: nombre.trim() || 'Nuevo grupo',
    ensenanza: '',
    nivel: '',
    grupo_matriz_id: '',
    tipo_agrupamiento: 'Grupo',
    permite_paralelo_con_matriz: false,
    observaciones: ''
  };
}

export function nuevoEspacio(nombre = '') {
  return {
    id: generarId('espacio'),
    nombre: nombre.trim() || 'Nuevo espacio',
    tipo: 'Aula ordinaria',
    capacidad: '',
    observaciones: '',
    disponibilidad: {}
  };
}

export function nuevaActividad(nombre = '') {
  return {
    id: generarId('actividad'),
    nombre: nombre.trim() || 'Nueva actividad',
    tipo: 'Materia',
    clasificacion_horaria: 'Lectiva',
    grupo_id: '',
    requiere_grupo: true,
    persona_id: '',
    docentes_acompanantes_ids: [],
    docentes_necesarios: 1,
    espacio_id: '',
    sesiones_semanales: 1,
    duracion_tramos: 1,
    requiere_espacio: false,
    computa_lectivo: true,
    computa_no_lectivo: false,
    condiciones: condicionesBaseActividad(),
    observaciones: ''
  };
}

export function nuevaColocacion({ actividad_id, dia_id, tramo_id, espacio_id = '', persona_id = '', grupo_id = '', docentes_acompanantes_ids = [], duracion_tramos = 1, fija = false }) {
  return {
    id: generarId('sesion'),
    actividad_id,
    dia_id,
    tramo_id,
    espacio_id,
    persona_id,
    grupo_id,
    docentes_acompanantes_ids: Array.isArray(docentes_acompanantes_ids) ? [...new Set(docentes_acompanantes_ids.filter(Boolean))] : [],
    duracion_tramos: Number(duracion_tramos) || 1,
    fija: Boolean(fija)
  };
}

export function ordenarPorOrden(lista) {
  return [...lista].sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

export function indiceTramo(proyecto, tramo_id) {
  return ordenarPorOrden(proyecto.tramos).findIndex((tramo) => tramo.id === tramo_id);
}

export function tramosCubiertos(proyecto, colocacion) {
  const tramos = ordenarPorOrden(proyecto.tramos).map((tramo) => normalizarTramo(tramo));
  const inicio = tramos.findIndex((tramo) => tramo.id === colocacion.tramo_id);
  if (inicio < 0) return [];
  return tramos.slice(inicio, inicio + (Number(colocacion.duracion_tramos) || 1)).map((tramo) => tramo.id);
}

export function huecosDeColocacion(proyecto, colocacion) {
  return tramosCubiertos(proyecto, colocacion).map((tramo_id) => claveHueco(colocacion.dia_id, tramo_id));
}

export function minutosDeColocacion(proyecto, colocacion = {}) {
  const ids = tramosCubiertos(proyecto, colocacion);
  const tramos = new Map((proyecto.tramos || []).map((tramo) => [tramo.id, normalizarTramo(tramo)]));
  return ids.reduce((suma, id) => suma + Number(tramos.get(id)?.duracion_minutos || 0), 0);
}

export function etiquetaTramo(tramo = {}) {
  const t = normalizarTramo(tramo);
  const horario = t.inicio && t.fin ? ` · ${t.inicio}-${t.fin}` : '';
  const minutos = t.duracion_minutos ? ` · ${t.duracion_minutos} min` : '';
  return `${t.nombre}${horario}${minutos}`;
}

export function descripcionColocacion(proyecto, colocacion) {
  const actividad = proyecto.actividades.find((a) => a.id === colocacion.actividad_id);
  const grupo = proyecto.grupos.find((g) => g.id === colocacion.grupo_id || g.id === actividad?.grupo_id);
  const docentes = docentesDeSesion(proyecto, colocacion).map((id) => obtenerNombrePorId(proyecto.personas, id, '')).filter(Boolean).join(' + ');
  const espacio = proyecto.espacios.find((e) => e.id === colocacion.espacio_id || e.id === actividad?.espacio_id);
  const dia = proyecto.dias.find((d) => d.id === colocacion.dia_id);
  const tramo = proyecto.tramos.find((t) => t.id === colocacion.tramo_id);
  return `${actividad?.nombre || 'Actividad'} · ${grupo?.nombre || 'Sin grupo'} · ${docentes || 'Sin docente'} · ${espacio?.nombre || 'Sin espacio'} · ${dia?.nombre || 'Día'} ${tramo?.nombre || ''}`;
}

export function resumenProyecto(proyecto) {
  const actividades = proyecto.actividades || [];
  const lectivas = actividades.filter((actividad) => esActividadLectiva(actividad)).length;
  const docenciaComplementaria = actividades.filter((actividad) => esDocenciaComplementaria(actividad)).length;
  const noLectivas = actividades.filter((actividad) => (actividad.clasificacion_horaria || '') === 'No lectiva').length;
  const servicios = actividades.filter((actividad) => esServicioCentro(actividad)).length;
  const sesionesPorCategoria = actividades.reduce((resumen, actividad) => {
    const sesiones = Number(actividad.sesiones_semanales || 0);
    if (esActividadLectiva(actividad)) resumen.lectivas += sesiones;
    else if (esDocenciaComplementaria(actividad)) resumen.dc += sesiones;
    else if ((actividad.clasificacion_horaria || '') === 'No lectiva') resumen.no_lectivas += sesiones;
    if (esServicioCentro(actividad)) resumen.servicios += sesiones;
    return resumen;
  }, { lectivas: 0, dc: 0, no_lectivas: 0, servicios: 0 });
  return {
    personas: proyecto.personas.length,
    grupos: proyecto.grupos.length,
    espacios: proyecto.espacios.length,
    actividades: actividades.length,
    actividades_lectivas: lectivas,
    actividades_docencia_complementaria: docenciaComplementaria,
    actividades_no_lectivas: noLectivas,
    servicios_centro: servicios,
    sesiones_lectivas_previstas: sesionesPorCategoria.lectivas,
    sesiones_dc_previstas: sesionesPorCategoria.dc,
    sesiones_no_lectivas_previstas: sesionesPorCategoria.no_lectivas,
    sesiones_servicios_previstas: sesionesPorCategoria.servicios,
    sesiones_previstas: actividades.reduce((suma, actividad) => suma + Number(actividad.sesiones_semanales || 0), 0),
    sesiones_colocadas: proyecto.horario.length
  };
}
