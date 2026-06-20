import { docentesDeActividad, esServicioCentro } from './modelo.js';
import { calcularCargaDocente, clasificarActividadParaCarga } from './carga_docente.js';

function numero(valor, defecto = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
}

function crearRegistroPlanificado(persona) {
  return {
    persona_id: persona.id,
    nombre: persona.nombre,
    previsto_lectiva: 0,
    previsto_dc: 0,
    previsto_servicios: 0,
    previsto_no_lectiva: 0,
    previsto_permanencia: 0,
    objetivo_lectiva: numero(persona.horas_lectivas_objetivo, 0),
    objetivo_dc: numero(persona.horas_dc_objetivo, 0),
    objetivo_permanencia: numero(persona.horas_permanencia_objetivo || persona.horas_maximas, 0),
    colocado_lectiva: 0,
    colocado_dc: 0,
    colocado_servicios: 0,
    colocado_no_lectiva: 0,
    colocado_permanencia: 0,
    incidencias: []
  };
}

function diferenciaTexto(diferencia) {
  if (diferencia > 0) return `sobran ${diferencia}`;
  if (diferencia < 0) return `faltan ${Math.abs(diferencia)}`;
  return 'cuadra';
}

export function calcularCargaPlanificada(proyecto) {
  const registros = new Map((proyecto.personas || []).map((persona) => [persona.id, crearRegistroPlanificado(persona)]));
  for (const actividad of proyecto.actividades || []) {
    const sesiones = numero(actividad.sesiones_semanales, 0);
    const duracion = numero(actividad.duracion_tramos, 1);
    const tramosPrevistos = sesiones * duracion;
    if (!tramosPrevistos) continue;
    const clasificacion = clasificarActividadParaCarga(actividad);
    const servicio = clasificacion.servicio || esServicioCentro(actividad);
    for (const docente_id of docentesDeActividad(actividad)) {
      const registro = registros.get(docente_id);
      if (!registro) continue;
      if (clasificacion.categoria === 'lectiva') registro.previsto_lectiva += tramosPrevistos;
      else if (clasificacion.categoria === 'dc') registro.previsto_dc += tramosPrevistos;
      else registro.previsto_no_lectiva += tramosPrevistos;
      if (servicio) registro.previsto_servicios += tramosPrevistos;
    }
  }
  for (const registro of registros.values()) {
    registro.previsto_permanencia = registro.previsto_lectiva + registro.previsto_dc + registro.previsto_no_lectiva;
  }
  return [...registros.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function auditarCoherenciaCarga(proyecto) {
  const planificados = calcularCargaPlanificada(proyecto);
  const colocados = new Map(calcularCargaDocente(proyecto).map((registro) => [registro.persona_id, registro]));
  const registros = planificados.map((registro) => {
    const colocado = colocados.get(registro.persona_id) || {};
    const salida = {
      ...registro,
      colocado_lectiva: numero(colocado.lectiva, 0),
      colocado_dc: numero(colocado.dc, 0),
      colocado_servicios: numero(colocado.servicios, 0),
      colocado_no_lectiva: numero(colocado.no_lectiva, 0),
      colocado_permanencia: numero(colocado.total_permanencia, 0)
    };
    if (salida.objetivo_lectiva) {
      const dif = salida.previsto_lectiva - salida.objetivo_lectiva;
      if (dif !== 0) salida.incidencias.push({ categoria: 'Lectivo', diferencia: dif, mensaje: `Objetivo lectivo: ${diferenciaTexto(dif)} tramo/s en las actividades definidas.` });
    }
    if (salida.objetivo_dc) {
      const dif = salida.previsto_dc - salida.objetivo_dc;
      if (dif !== 0) salida.incidencias.push({ categoria: 'DC', diferencia: dif, mensaje: `Objetivo DC: ${diferenciaTexto(dif)} tramo/s en las actividades definidas.` });
    }
    if (salida.objetivo_permanencia) {
      const dif = salida.previsto_permanencia - salida.objetivo_permanencia;
      if (dif !== 0) salida.incidencias.push({ categoria: 'Permanencia', diferencia: dif, mensaje: `Objetivo de permanencia: ${diferenciaTexto(dif)} tramo/s en las actividades definidas.` });
    }
    return salida;
  });
  const totales = registros.reduce((acc, registro) => {
    acc.objetivo_lectiva += registro.objetivo_lectiva;
    acc.objetivo_dc += registro.objetivo_dc;
    acc.objetivo_permanencia += registro.objetivo_permanencia;
    acc.previsto_lectiva += registro.previsto_lectiva;
    acc.previsto_dc += registro.previsto_dc;
    acc.previsto_servicios += registro.previsto_servicios;
    acc.previsto_no_lectiva += registro.previsto_no_lectiva;
    acc.previsto_permanencia += registro.previsto_permanencia;
    acc.colocado_lectiva += registro.colocado_lectiva;
    acc.colocado_dc += registro.colocado_dc;
    acc.colocado_servicios += registro.colocado_servicios;
    acc.colocado_no_lectiva += registro.colocado_no_lectiva;
    acc.colocado_permanencia += registro.colocado_permanencia;
    acc.incidencias += registro.incidencias.length;
    return acc;
  }, {
    objetivo_lectiva: 0, objetivo_dc: 0, objetivo_permanencia: 0,
    previsto_lectiva: 0, previsto_dc: 0, previsto_servicios: 0, previsto_no_lectiva: 0, previsto_permanencia: 0,
    colocado_lectiva: 0, colocado_dc: 0, colocado_servicios: 0, colocado_no_lectiva: 0, colocado_permanencia: 0,
    incidencias: 0
  });
  return {
    registros,
    totales,
    avisos: totales.incidencias,
    tieneObjetivos: registros.some((r) => r.objetivo_lectiva || r.objetivo_dc || r.objetivo_permanencia)
  };
}

export function resumenCoherenciaCarga(auditoria) {
  if (!auditoria.tieneObjetivos) return 'No hay objetivos docentes configurados: no se puede auditar suficiencia de carga.';
  if (!auditoria.avisos) return 'Las actividades definidas son coherentes con los objetivos docentes configurados.';
  return `La generación puede estar completa, pero la carga definida por actividades no cuadra con los objetivos docentes: ${auditoria.avisos} desajuste/s.`;
}

export function generarInformeCoherenciaCarga(proyecto) {
  const auditoria = auditarCoherenciaCarga(proyecto);
  const lineas = [];
  lineas.push(`Informe de coherencia de carga · ${proyecto.centro?.nombre || 'Centro'}`);
  lineas.push('');
  lineas.push(resumenCoherenciaCarga(auditoria));
  lineas.push('');
  lineas.push('Totales');
  lineas.push(`Lectivo objetivo/definido/colocado: ${auditoria.totales.objetivo_lectiva}/${auditoria.totales.previsto_lectiva}/${auditoria.totales.colocado_lectiva}`);
  lineas.push(`DC objetivo/definido/colocado: ${auditoria.totales.objetivo_dc}/${auditoria.totales.previsto_dc}/${auditoria.totales.colocado_dc}`);
  lineas.push(`Servicios definidos/colocados: ${auditoria.totales.previsto_servicios}/${auditoria.totales.colocado_servicios}`);
  lineas.push(`Permanencia objetivo/definida/colocada: ${auditoria.totales.objetivo_permanencia}/${auditoria.totales.previsto_permanencia}/${auditoria.totales.colocado_permanencia}`);
  lineas.push('');
  lineas.push('Detalle por docente');
  for (const registro of auditoria.registros) {
    lineas.push(`- ${registro.nombre}: lectivo ${registro.objetivo_lectiva}/${registro.previsto_lectiva}/${registro.colocado_lectiva}; DC ${registro.objetivo_dc}/${registro.previsto_dc}/${registro.colocado_dc}; permanencia ${registro.objetivo_permanencia}/${registro.previsto_permanencia}/${registro.colocado_permanencia}.`);
    for (const incidencia of registro.incidencias) lineas.push(`  · ${incidencia.mensaje}`);
  }
  lineas.push('');
  lineas.push('Lectura: objetivo/definido/colocado. Definido significa lo que existe en actividades; colocado significa lo que ya está en horario.');
  return lineas.join('\n');
}
