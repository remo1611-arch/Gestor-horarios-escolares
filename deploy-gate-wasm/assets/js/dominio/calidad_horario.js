import {
  ordenarPorOrden,
  tramosCubiertos,
  docentesDeSesion,
  obtenerNombrePorId,
  esActividadLectiva,
  esDocenciaComplementaria,
  esServicioCentro
} from './modelo.js';

function crearRegistroDocente(persona = {}) {
  return {
    persona_id: persona.id,
    nombre: persona.nombre || 'Docente sin nombre',
    dias: {},
    huecos: 0,
    jornadas_con_huecos: 0,
    primeras_horas: 0,
    ultimas_horas: 0,
    sesiones: 0,
    lectivas: 0,
    dc: 0,
    servicios: 0,
    reparto_diario: [],
    maximo_dia: 0,
    minimo_dia_ocupado: 0,
    desequilibrio_diario: 0,
    avisos: []
  };
}

function crearRegistroGrupo(grupo = {}) {
  return {
    grupo_id: grupo.id,
    nombre: grupo.nombre || 'Grupo sin nombre',
    dias: {},
    huecos: 0,
    jornadas_con_huecos: 0,
    primeras_horas: 0,
    ultimas_horas: 0,
    sesiones: 0,
    reparto_diario: [],
    maximo_dia: 0,
    minimo_dia_ocupado: 0,
    desequilibrio_diario: 0,
    avisos: []
  };
}

function ensureSet(objeto, clave) {
  if (!objeto[clave]) objeto[clave] = new Set();
  return objeto[clave];
}

function analizarDias(registro, diasOrdenados) {
  let huecos = 0;
  let jornadasConHuecos = 0;
  const reparto = [];
  for (const dia of diasOrdenados) {
    const ocupados = [...(registro.dias[dia.id] || new Set())].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    reparto.push({ dia_id: dia.id, dia: dia.nombre, sesiones: ocupados.length });
    if (ocupados.length < 2) continue;
    let huecosDia = 0;
    for (let i = ocupados[0]; i <= ocupados[ocupados.length - 1]; i += 1) {
      if (!ocupados.includes(i)) huecosDia += 1;
    }
    if (huecosDia > 0) jornadasConHuecos += 1;
    huecos += huecosDia;
  }
  registro.huecos = huecos;
  registro.jornadas_con_huecos = jornadasConHuecos;
  registro.reparto_diario = reparto;
  const valores = reparto.map((r) => r.sesiones);
  registro.maximo_dia = valores.length ? Math.max(...valores) : 0;
  const ocupados = valores.filter((v) => v > 0);
  registro.minimo_dia_ocupado = ocupados.length ? Math.min(...ocupados) : 0;
  registro.desequilibrio_diario = registro.maximo_dia - registro.minimo_dia_ocupado;
  if (registro.huecos > 0) registro.avisos.push(`${registro.huecos} hueco/s`);
  if (registro.ultimas_horas > 0) registro.avisos.push(`${registro.ultimas_horas} última/s hora/s`);
  if (registro.desequilibrio_diario >= 4) registro.avisos.push(`Reparto diario desigual (${registro.minimo_dia_ocupado}-${registro.maximo_dia})`);
}

function minMax(lista, campo) {
  const valores = lista.map((x) => Number(x[campo] || 0));
  if (!valores.length) return { min: 0, max: 0, diferencia: 0 };
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return { min, max, diferencia: max - min };
}

export function calcularCalidadHorario(proyecto) {
  const dias = ordenarPorOrden(proyecto.dias || []);
  const tramos = ordenarPorOrden(proyecto.tramos || []);
  const indiceTramo = new Map(tramos.map((tramo, indice) => [tramo.id, indice]));
  const actividades = new Map((proyecto.actividades || []).map((actividad) => [actividad.id, actividad]));
  const docentes = new Map((proyecto.personas || []).map((persona) => [persona.id, crearRegistroDocente(persona)]));
  const grupos = new Map((proyecto.grupos || []).map((grupo) => [grupo.id, crearRegistroGrupo(grupo)]));

  for (const sesion of proyecto.horario || []) {
    const actividad = actividades.get(sesion.actividad_id) || {};
    const tramosSesion = tramosCubiertos(proyecto, sesion);
    const indices = tramosSesion.map((id) => indiceTramo.get(id)).filter((n) => Number.isFinite(n));
    const primera = indices.includes(0);
    const ultima = indices.includes(tramos.length - 1);
    const grupoId = sesion.grupo_id || actividad.grupo_id || '';
    const registroGrupo = grupos.get(grupoId);
    if (registroGrupo) {
      registroGrupo.sesiones += tramosSesion.length || 1;
      if (primera) registroGrupo.primeras_horas += 1;
      if (ultima) registroGrupo.ultimas_horas += 1;
      for (const indice of indices) ensureSet(registroGrupo.dias, sesion.dia_id).add(indice);
    }
    for (const docenteId of docentesDeSesion(proyecto, sesion)) {
      const registro = docentes.get(docenteId);
      if (!registro) continue;
      registro.sesiones += tramosSesion.length || 1;
      if (primera) registro.primeras_horas += 1;
      if (ultima) registro.ultimas_horas += 1;
      if (esActividadLectiva(actividad)) registro.lectivas += tramosSesion.length || 1;
      if (esDocenciaComplementaria(actividad)) registro.dc += tramosSesion.length || 1;
      if (esServicioCentro(actividad)) registro.servicios += tramosSesion.length || 1;
      for (const indice of indices) ensureSet(registro.dias, sesion.dia_id).add(indice);
    }
  }

  const registros_docentes = [...docentes.values()];
  const registros_grupos = [...grupos.values()];
  registros_docentes.forEach((r) => analizarDias(r, dias));
  registros_grupos.forEach((r) => analizarDias(r, dias));

  const totalHuecosDocentes = registros_docentes.reduce((s, r) => s + r.huecos, 0);
  const totalHuecosGrupos = registros_grupos.reduce((s, r) => s + r.huecos, 0);
  const primerasDocentes = registros_docentes.reduce((s, r) => s + r.primeras_horas, 0);
  const ultimasDocentes = registros_docentes.reduce((s, r) => s + r.ultimas_horas, 0);
  const ultimasGrupos = registros_grupos.reduce((s, r) => s + r.ultimas_horas, 0);
  const repartoServicios = minMax(registros_docentes, 'servicios');
  const repartoDc = minMax(registros_docentes, 'dc');
  const desequilibrioDocente = registros_docentes.reduce((s, r) => s + r.desequilibrio_diario, 0);
  const sesionesPendientes = (proyecto.actividades || []).reduce((suma, actividad) => {
    const colocadas = (proyecto.horario || []).filter((sesion) => sesion.actividad_id === actividad.id).length;
    return suma + Math.max(0, Number(actividad.sesiones_semanales || 0) - colocadas);
  }, 0);

  const puntuacion_penalizacion = totalHuecosDocentes * 6 + totalHuecosGrupos * 4 + ultimasDocentes * 2 + ultimasGrupos * 2 + desequilibrioDocente + repartoServicios.diferencia * 3 + sesionesPendientes * 10;
  let nivel = 'buena';
  if (sesionesPendientes > 0 || totalHuecosDocentes > 10 || puntuacion_penalizacion > 80) nivel = 'revisar';
  else if (totalHuecosDocentes > 0 || ultimasDocentes > 0 || repartoServicios.diferencia > 2 || puntuacion_penalizacion > 25) nivel = 'mejorable';

  const recomendaciones = [];
  if (sesionesPendientes > 0) recomendaciones.push('Revisar sesiones pendientes antes de valorar la calidad global.');
  if (totalHuecosDocentes > 0) recomendaciones.push('Revisar huecos del profesorado y mover sesiones cuando sea posible.');
  if (ultimasDocentes > 0) recomendaciones.push('Comprobar si las últimas horas están justificadas por condiciones del centro.');
  if (repartoServicios.diferencia > 2) recomendaciones.push('Revisar reparto de servicios/guardias entre docentes.');
  if (repartoDc.diferencia > 3) recomendaciones.push('Revisar reparto de docencia complementaria.');
  if (!recomendaciones.length) recomendaciones.push('No se detectan alertas básicas de calidad.');

  return {
    resumen: {
      nivel,
      puntuacion_penalizacion,
      sesiones_pendientes: sesionesPendientes,
      huecos_docentes: totalHuecosDocentes,
      huecos_grupos: totalHuecosGrupos,
      primeras_horas_docente: primerasDocentes,
      ultimas_horas_docente: ultimasDocentes,
      ultimas_horas_grupo: ultimasGrupos,
      desequilibrio_diario_docente: desequilibrioDocente,
      reparto_servicios: repartoServicios,
      reparto_dc: repartoDc
    },
    docentes: registros_docentes.sort((a, b) => b.huecos - a.huecos || b.ultimas_horas - a.ultimas_horas || a.nombre.localeCompare(b.nombre, 'es')),
    grupos: registros_grupos.sort((a, b) => b.huecos - a.huecos || b.ultimas_horas - a.ultimas_horas || a.nombre.localeCompare(b.nombre, 'es')),
    recomendaciones
  };
}

export function compararCalidadHorarios(proyectoA, proyectoB) {
  const calidadA = calcularCalidadHorario(proyectoA);
  const calidadB = calcularCalidadHorario(proyectoB);
  const a = calidadA.resumen.puntuacion_penalizacion;
  const b = calidadB.resumen.puntuacion_penalizacion;
  return {
    calidad_a: calidadA.resumen,
    calidad_b: calidadB.resumen,
    diferencia_penalizacion: b - a,
    dictamen: a === b ? 'equivalentes' : (a < b ? 'mejor_a' : 'mejor_b')
  };
}

export function textoNivelCalidad(nivel) {
  if (nivel === 'buena') return 'Buena';
  if (nivel === 'mejorable') return 'Mejorable';
  return 'Revisar';
}
