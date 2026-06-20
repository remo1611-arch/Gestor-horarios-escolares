import { docentesDeSesion, tramosCubiertos, minutosDeColocacion, esDocenciaComplementaria, esServicioCentro } from './modelo.js';

function numero(valor, defecto = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
}

export function clasificarActividadParaCarga(actividad = {}) {
  const clasificacion = actividad.clasificacion_horaria || 'Lectiva';
  const servicio = esServicioCentro(actividad);
  if (clasificacion === 'Lectiva' || actividad.computa_lectivo === true) {
    return { categoria: 'lectiva', servicio: false };
  }
  if (clasificacion === 'Docencia complementaria' || esDocenciaComplementaria(actividad)) {
    return { categoria: 'dc', servicio };
  }
  if (clasificacion === 'Servicio de centro') {
    return { categoria: 'dc', servicio: true };
  }
  return { categoria: 'no_lectiva', servicio: false };
}

export function crearRegistroCarga(persona) {
  return {
    persona_id: persona.id,
    nombre: persona.nombre,
    departamento: persona.departamento || '',
    lectiva: 0,
    dc: 0,
    servicios: 0,
    no_lectiva: 0,
    total_permanencia: 0,
    lectiva_minutos: 0,
    dc_minutos: 0,
    servicios_minutos: 0,
    no_lectiva_minutos: 0,
    total_permanencia_minutos: 0,
    sesiones: 0,
    objetivo_lectiva: numero(persona.horas_lectivas_objetivo, 0),
    objetivo_dc: numero(persona.horas_dc_objetivo, 0),
    objetivo_permanencia: numero(persona.horas_permanencia_objetivo || persona.horas_maximas, 0),
    diferencia_lectiva: 0,
    diferencia_dc: 0,
    diferencia_permanencia: 0,
    incidencias: []
  };
}

export function calcularCargaDocente(proyecto) {
  const registros = new Map((proyecto.personas || []).map((persona) => [persona.id, crearRegistroCarga(persona)]));
  const actividades = new Map((proyecto.actividades || []).map((actividad) => [actividad.id, actividad]));

  for (const sesion of proyecto.horario || []) {
    const actividad = actividades.get(sesion.actividad_id);
    if (!actividad) continue;
    const duracion = tramosCubiertos(proyecto, sesion).length || numero(sesion.duracion_tramos || actividad.duracion_tramos, 1);
    const minutos = minutosDeColocacion(proyecto, sesion) || duracion * 50;
    const { categoria, servicio } = clasificarActividadParaCarga(actividad);
    for (const docente_id of docentesDeSesion(proyecto, sesion)) {
      const registro = registros.get(docente_id);
      if (!registro) continue;
      registro.sesiones += 1;
      if (categoria === 'lectiva') { registro.lectiva += duracion; registro.lectiva_minutos += minutos; }
      else if (categoria === 'dc') { registro.dc += duracion; registro.dc_minutos += minutos; }
      else { registro.no_lectiva += duracion; registro.no_lectiva_minutos += minutos; }
      if (servicio) { registro.servicios += duracion; registro.servicios_minutos += minutos; }
    }
  }

  for (const registro of registros.values()) {
    registro.total_permanencia = registro.lectiva + registro.dc + registro.no_lectiva;
    registro.total_permanencia_minutos = registro.lectiva_minutos + registro.dc_minutos + registro.no_lectiva_minutos;
    registro.diferencia_lectiva = registro.objetivo_lectiva ? registro.lectiva - registro.objetivo_lectiva : 0;
    registro.diferencia_dc = registro.objetivo_dc ? registro.dc - registro.objetivo_dc : 0;
    registro.diferencia_permanencia = registro.objetivo_permanencia ? registro.total_permanencia - registro.objetivo_permanencia : 0;
    if (registro.objetivo_lectiva && registro.diferencia_lectiva !== 0) {
      registro.incidencias.push(`${registro.diferencia_lectiva > 0 ? 'Exceso' : 'Defecto'} lectivo: ${Math.abs(registro.diferencia_lectiva)} tramo/s`);
    }
    if (registro.objetivo_dc && registro.diferencia_dc !== 0) {
      registro.incidencias.push(`${registro.diferencia_dc > 0 ? 'Exceso' : 'Defecto'} DC: ${Math.abs(registro.diferencia_dc)} tramo/s`);
    }
    if (registro.objetivo_permanencia && registro.diferencia_permanencia !== 0) {
      registro.incidencias.push(`${registro.diferencia_permanencia > 0 ? 'Exceso' : 'Defecto'} de permanencia: ${Math.abs(registro.diferencia_permanencia)} tramo/s`);
    }
  }
  return [...registros.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function resumenCargaDocente(proyecto) {
  const registros = calcularCargaDocente(proyecto);
  return registros.reduce((resumen, registro) => {
    resumen.lectiva += registro.lectiva;
    resumen.dc += registro.dc;
    resumen.servicios += registro.servicios;
    resumen.no_lectiva += registro.no_lectiva;
    resumen.total_permanencia += registro.total_permanencia;
    resumen.lectiva_minutos += registro.lectiva_minutos;
    resumen.dc_minutos += registro.dc_minutos;
    resumen.servicios_minutos += registro.servicios_minutos;
    resumen.no_lectiva_minutos += registro.no_lectiva_minutos;
    resumen.total_permanencia_minutos += registro.total_permanencia_minutos;
    resumen.incidencias += registro.incidencias.length;
    return resumen;
  }, { docentes: registros.length, lectiva: 0, dc: 0, servicios: 0, no_lectiva: 0, total_permanencia: 0, lectiva_minutos: 0, dc_minutos: 0, servicios_minutos: 0, no_lectiva_minutos: 0, total_permanencia_minutos: 0, incidencias: 0 });
}
