import { ordenarPorOrden, obtenerNombrePorId, tramosCubiertos, docentesDeSesion, etiquetaTramo } from '../dominio/modelo.js';
import { validarHorario, resumenValidacion } from '../motor/validador_horario.js';
import { calcularCargaDocente, resumenCargaDocente } from '../dominio/carga_docente.js';
import { explicarBloqueosProyecto, resumenExplicaciones } from '../dominio/explicador_bloqueos.js';
import { calcularCalidadHorario, textoNivelCalidad } from '../dominio/calidad_horario.js';
import { normalizarGestionDiaria, resumenGestionDiaria, informeGestionDiariaEstructurado } from '../dominio/gestion_diaria.js';

function celdaCsv(valor) {
  const texto = String(valor ?? '');
  if (/[";\n]/.test(texto)) return `"${texto.replaceAll('"', '""')}"`;
  return texto;
}

function etiquetaSesion(proyecto, sesion) {
  const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
  if (!actividad) return 'Actividad no encontrada';
  const grupo = obtenerNombrePorId(proyecto.grupos, sesion.grupo_id || actividad.grupo_id, 'Sin grupo');
  const persona = docentesDeSesion(proyecto, sesion).map((id) => obtenerNombrePorId(proyecto.personas, id, '')).filter(Boolean).join(' + ') || 'Sin docente';
  const espacio = obtenerNombrePorId(proyecto.espacios, sesion.espacio_id || actividad.espacio_id, 'Sin espacio');
  return `${actividad.nombre} · ${actividad.clasificacion_horaria || 'Lectiva'} · ${grupo} · ${persona} · ${espacio}`;
}

export function generarCsvHorario(proyecto, modo = 'grupo') {
  const dias = ordenarPorOrden(proyecto.dias);
  const tramos = ordenarPorOrden(proyecto.tramos);
  let entidades = proyecto.grupos;
  let campo = 'grupo_id';
  if (modo === 'persona') { entidades = proyecto.personas; campo = 'persona_id'; }
  if (modo === 'espacio') { entidades = proyecto.espacios; campo = 'espacio_id'; }
  const filas = [['Vista', 'Día', 'Tramo', 'Contenido']];
  for (const entidad of entidades) {
    for (const dia of dias) {
      for (const tramo of tramos) {
        const sesiones = proyecto.horario.filter((sesion) => {
          const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
          let idEntidad = sesion[campo] || actividad?.[campo] || '';
          if (campo === 'persona_id') { return docentesDeSesion(proyecto, sesion).includes(entidad.id) && sesion.dia_id === dia.id && tramosCubiertos(proyecto, sesion).includes(tramo.id); }
          return idEntidad === entidad.id && sesion.dia_id === dia.id && tramosCubiertos(proyecto, sesion).includes(tramo.id);
        });
        filas.push([entidad.nombre, dia.nombre, etiquetaTramo(tramo), sesiones.map((s) => etiquetaSesion(proyecto, s)).join(' | ')]);
      }
    }
  }
  return filas.map((fila) => fila.map(celdaCsv).join(';')).join('\n');
}

export function generarInformeValidacion(proyecto) {
  const incidencias = validarHorario(proyecto);
  const lineas = [];
  lineas.push(`Informe de validación · ${proyecto.centro.nombre}`);
  lineas.push(`Fecha: ${new Date().toLocaleString('es-ES')}`);
  lineas.push(resumenValidacion(incidencias));
  lineas.push('');
  if (!incidencias.length) lineas.push('No se han detectado incidencias.');
  for (const incidencia of incidencias) {
    lineas.push(`[${incidencia.nivel.toUpperCase()}] ${incidencia.mensaje}`);
  }
  return lineas.join('\n');
}

export function generarHtmlImprimible(proyecto, modo = 'grupo') {
  const dias = ordenarPorOrden(proyecto.dias);
  const tramos = ordenarPorOrden(proyecto.tramos);
  let entidades = proyecto.grupos;
  let campo = 'grupo_id';
  let titulo = 'Horario por grupo';
  if (modo === 'persona') { entidades = proyecto.personas; campo = 'persona_id'; titulo = 'Horario por docente'; }
  if (modo === 'espacio') { entidades = proyecto.espacios; campo = 'espacio_id'; titulo = 'Horario por espacio'; }
  const estilos = `
    body{font-family:Arial,sans-serif;margin:24px;color:#111827} h1{font-size:22px;margin:0 0 4px} h2{font-size:18px;margin-top:24px;page-break-before:always} h2:first-of-type{page-break-before:auto} table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px} th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top} th{background:#f1f5f9} .meta{color:#475569;font-size:12px;margin-bottom:16px}.sesion{font-weight:600}.detalle{color:#475569;font-size:11px}.vacio{color:#94a3b8}@media print{body{margin:12mm} h2{break-before:page} h2:first-of-type{break-before:auto}}`;
  let cuerpo = `<h1>${titulo}</h1><div class="meta">${proyecto.centro.nombre} · ${proyecto.centro.curso_academico || ''} · ${new Date().toLocaleString('es-ES')}</div>`;
  for (const entidad of entidades) {
    cuerpo += `<h2>${entidad.nombre}</h2><table><thead><tr><th>Tramo / horario</th>${dias.map((d) => `<th>${d.nombre}</th>`).join('')}</tr></thead><tbody>`;
    for (const tramo of tramos) {
      cuerpo += `<tr><th>${etiquetaTramo(tramo)}</th>`;
      for (const dia of dias) {
        const sesiones = proyecto.horario.filter((sesion) => {
          const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
          let idEntidad = sesion[campo] || actividad?.[campo] || '';
          if (campo === 'persona_id') { return docentesDeSesion(proyecto, sesion).includes(entidad.id) && sesion.dia_id === dia.id && tramosCubiertos(proyecto, sesion).includes(tramo.id); }
          return idEntidad === entidad.id && sesion.dia_id === dia.id && tramosCubiertos(proyecto, sesion).includes(tramo.id);
        });
        if (!sesiones.length) cuerpo += '<td class="vacio">—</td>';
        else {
          cuerpo += `<td>${sesiones.map((sesion) => {
            const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
            const grupo = obtenerNombrePorId(proyecto.grupos, sesion.grupo_id || actividad?.grupo_id, '');
            const persona = docentesDeSesion(proyecto, sesion).map((id) => obtenerNombrePorId(proyecto.personas, id, '')).filter(Boolean).join(' + ');
            const espacio = obtenerNombrePorId(proyecto.espacios, sesion.espacio_id || actividad?.espacio_id, '');
            return `<div class="sesion">${actividad?.nombre || 'Actividad'} <span class="detalle">(${actividad?.clasificacion_horaria || 'Lectiva'})</span></div><div class="detalle">${grupo} · ${persona} · ${espacio}</div>`;
          }).join('<hr>')}</td>`;
        }
      }
      cuerpo += '</tr>';
    }
    cuerpo += '</tbody></table>';
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title><style>${estilos}</style></head><body>${cuerpo}</body></html>`;
}


export function generarCsvCargaDocente(proyecto) {
  const filas = [[
    'Docente',
    'Departamento / especialidad',
    'Lectivo colocado',
    'DC colocada',
    'Servicios dentro de DC',
    'No lectivo adicional',
    'Total permanencia',
    'Lectivo minutos',
    'DC minutos',
    'Servicios minutos',
    'Permanencia minutos',
    'Objetivo lectivo',
    'Objetivo DC',
    'Objetivo permanencia',
    'Incidencias'
  ]];
  for (const registro of calcularCargaDocente(proyecto)) {
    filas.push([
      registro.nombre,
      registro.departamento,
      registro.lectiva,
      registro.dc,
      registro.servicios,
      registro.no_lectiva,
      registro.total_permanencia,
      registro.lectiva_minutos,
      registro.dc_minutos,
      registro.servicios_minutos,
      registro.total_permanencia_minutos,
      registro.objetivo_lectiva || '',
      registro.objetivo_dc || '',
      registro.objetivo_permanencia || '',
      registro.incidencias.join(' | ')
    ]);
  }
  return filas.map((fila) => fila.map(celdaCsv).join(';')).join('\n');
}

export function generarInformeCargaDocente(proyecto) {
  const resumen = resumenCargaDocente(proyecto);
  const lineas = [];
  lineas.push(`Informe de carga docente · ${proyecto.centro.nombre}`);
  lineas.push(`Fecha: ${new Date().toLocaleString('es-ES')}`);
  lineas.push('');
  lineas.push('Resumen global');
  lineas.push(`Docentes: ${resumen.docentes}`);
  lineas.push(`Tramos lectivos colocados: ${resumen.lectiva} (${resumen.lectiva_minutos} min)`);
  lineas.push(`Tramos de docencia complementaria colocados: ${resumen.dc} (${resumen.dc_minutos} min)`);
  lineas.push(`Servicios de centro dentro de DC: ${resumen.servicios} (${resumen.servicios_minutos} min)`);
  lineas.push(`Tramos no lectivos adicionales: ${resumen.no_lectiva} (${resumen.no_lectiva_minutos} min)`);
  lineas.push(`Total de permanencia colocada: ${resumen.total_permanencia} tramo/s (${resumen.total_permanencia_minutos} min)`);
  lineas.push(`Incidencias de carga: ${resumen.incidencias}`);
  lineas.push('');
  lineas.push('Detalle por docente');
  for (const registro of calcularCargaDocente(proyecto)) {
    lineas.push('');
    lineas.push(`- ${registro.nombre}`);
    lineas.push(`  Lectivo: ${registro.lectiva} tramo/s · ${registro.lectiva_minutos} min${registro.objetivo_lectiva ? ` / objetivo ${registro.objetivo_lectiva}` : ''}`);
    lineas.push(`  DC: ${registro.dc} tramo/s · ${registro.dc_minutos} min${registro.objetivo_dc ? ` / objetivo ${registro.objetivo_dc}` : ''}`);
    lineas.push(`  Servicios dentro de DC: ${registro.servicios} tramo/s · ${registro.servicios_minutos} min`);
    lineas.push(`  No lectivo adicional: ${registro.no_lectiva} tramo/s · ${registro.no_lectiva_minutos} min`);
    lineas.push(`  Permanencia total: ${registro.total_permanencia} tramo/s · ${registro.total_permanencia_minutos} min${registro.objetivo_permanencia ? ` / objetivo ${registro.objetivo_permanencia}` : ''}`);
    if (registro.incidencias.length) {
      for (const item of registro.incidencias) lineas.push(`  AVISO: ${item}`);
    } else {
      lineas.push('  Sin incidencias de carga configuradas.');
    }
  }
  return lineas.join('\n');
}


export function generarInformeBloqueos(proyecto) {
  const explicacion = explicarBloqueosProyecto(proyecto);
  const lineas = [];
  lineas.push(`Informe de bloqueos del horario · ${proyecto.centro.nombre}`);
  lineas.push(`Fecha: ${new Date().toLocaleString('es-ES')}`);
  lineas.push('');
  lineas.push(resumenExplicaciones(explicacion));
  lineas.push('');
  if (!explicacion.items.length) {
    lineas.push('No hay sesiones pendientes ni bloqueos explicables.');
    return lineas.join('\n');
  }
  for (const item of explicacion.items) {
    lineas.push(`${item.nivel === 'bloqueo' ? 'BLOQUEO' : 'AVISO'} · ${item.actividad_nombre}`);
    lineas.push(`  Diagnóstico: ${item.diagnostico}`);
    if (item.contexto?.clasificacion) {
      lineas.push(`  Clasificación: ${item.contexto.clasificacion}`);
      lineas.push(`  Grupo/unidad: ${item.contexto.grupo}`);
      lineas.push(`  Docente/s: ${item.contexto.docentes}`);
      lineas.push(`  Espacio: ${item.contexto.espacio}`);
      lineas.push(`  Duración: ${item.contexto.duracion_tramos} tramo/s`);
    }
    if (item.pendientes) lineas.push(`  Sesiones pendientes: ${item.pendientes}`);
    if (typeof item.candidatos === 'number') lineas.push(`  Huecos analizados: ${item.candidatos}; huecos posibles: ${item.candidatos_posibles}`);
    for (const causa of item.causas || []) {
      lineas.push(`  - Causa: ${causa.causa}`);
      lineas.push(`    Revisar: ${causa.revisar}`);
      if (causa.ocurrencias) lineas.push(`    Apariciones en huecos probados: ${causa.ocurrencias}`);
    }
    lineas.push('');
  }
  return lineas.join('\n');
}


export function generarCsvCalidadHorario(proyecto) {
  const calidad = calcularCalidadHorario(proyecto);
  const filas = [[
    'Tipo',
    'Nombre',
    'Huecos',
    'Jornadas con huecos',
    'Primeras horas',
    'Últimas horas',
    'Sesiones',
    'Lectivas',
    'DC',
    'Servicios',
    'Desequilibrio diario',
    'Avisos'
  ]];
  for (const docente of calidad.docentes) {
    filas.push(['Docente', docente.nombre, docente.huecos, docente.jornadas_con_huecos, docente.primeras_horas, docente.ultimas_horas, docente.sesiones, docente.lectivas, docente.dc, docente.servicios, docente.desequilibrio_diario, docente.avisos.join(' | ')]);
  }
  for (const grupo of calidad.grupos) {
    filas.push(['Grupo', grupo.nombre, grupo.huecos, grupo.jornadas_con_huecos, grupo.primeras_horas, grupo.ultimas_horas, grupo.sesiones, '', '', '', grupo.desequilibrio_diario, grupo.avisos.join(' | ')]);
  }
  return filas.map((fila) => fila.map(celdaCsv).join(';')).join('\n');
}

export function generarInformeCalidadHorario(proyecto) {
  const calidad = calcularCalidadHorario(proyecto);
  const r = calidad.resumen;
  const lineas = [];
  lineas.push(`Informe de calidad del horario · ${proyecto.centro.nombre}`);
  lineas.push(`Fecha: ${new Date().toLocaleString('es-ES')}`);
  lineas.push('');
  lineas.push(`Nivel: ${textoNivelCalidad(r.nivel)}`);
  lineas.push(`Penalización orientativa: ${r.puntuacion_penalizacion}`);
  lineas.push(`Sesiones pendientes: ${r.sesiones_pendientes}`);
  lineas.push(`Huecos docentes: ${r.huecos_docentes}`);
  lineas.push(`Huecos de grupo: ${r.huecos_grupos}`);
  lineas.push(`Primeras horas docentes: ${r.primeras_horas_docente}`);
  lineas.push(`Últimas horas docentes: ${r.ultimas_horas_docente}`);
  lineas.push(`Últimas horas de grupos: ${r.ultimas_horas_grupo}`);
  lineas.push(`Reparto servicios: mínimo ${r.reparto_servicios.min}, máximo ${r.reparto_servicios.max}, diferencia ${r.reparto_servicios.diferencia}`);
  lineas.push(`Reparto DC: mínimo ${r.reparto_dc.min}, máximo ${r.reparto_dc.max}, diferencia ${r.reparto_dc.diferencia}`);
  lineas.push('');
  lineas.push('Recomendaciones');
  for (const item of calidad.recomendaciones) lineas.push(`- ${item}`);
  lineas.push('');
  lineas.push('Docentes con más alertas');
  for (const docente of calidad.docentes.filter((d) => d.huecos || d.ultimas_horas || d.desequilibrio_diario >= 4 || d.avisos.length).slice(0, 20)) {
    lineas.push(`- ${docente.nombre}: ${docente.huecos} hueco/s, ${docente.ultimas_horas} última/s hora/s, servicios ${docente.servicios}, DC ${docente.dc}${docente.avisos.length ? ` · ${docente.avisos.join(' · ')}` : ''}`);
  }
  if (!calidad.docentes.some((d) => d.huecos || d.ultimas_horas || d.avisos.length)) lineas.push('- Sin alertas docentes básicas.');
  lineas.push('');
  lineas.push('Grupos con más alertas');
  for (const grupo of calidad.grupos.filter((g) => g.huecos || g.ultimas_horas || g.desequilibrio_diario >= 4 || g.avisos.length).slice(0, 20)) {
    lineas.push(`- ${grupo.nombre}: ${grupo.huecos} hueco/s, ${grupo.ultimas_horas} última/s hora/s${grupo.avisos.length ? ` · ${grupo.avisos.join(' · ')}` : ''}`);
  }
  if (!calidad.grupos.some((g) => g.huecos || g.ultimas_horas || g.avisos.length)) lineas.push('- Sin alertas básicas de grupo.');
  return lineas.join('\n');
}

export function generarCsvGestionDiaria(proyecto) {
  const gestion = normalizarGestionDiaria(proyecto);
  const filas = [[
    'Tipo',
    'Estado',
    'Día',
    'Docente',
    'Tramos / sesión',
    'Detalle',
    'Observaciones'
  ]];
  for (const ausencia of gestion.ausencias) {
    const dia = obtenerNombrePorId(proyecto.dias, ausencia.dia_id, 'Sin día');
    const docente = obtenerNombrePorId(proyecto.personas, ausencia.persona_id, 'Sin docente');
    const tramos = ausencia.tramo_ids?.length ? ausencia.tramo_ids.map((id) => obtenerNombrePorId(proyecto.tramos, id, id)).join(' + ') : 'Jornada completa';
    filas.push(['Ausencia', ausencia.estado, dia, docente, tramos, ausencia.motivo || '', ausencia.observaciones || '']);
  }
  for (const cobertura of gestion.coberturas) {
    const ausencia = gestion.ausencias.find((a) => a.id === cobertura.ausencia_id) || {};
    const sesion = proyecto.horario.find((s) => s.id === cobertura.sesion_id) || {};
    const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id) || {};
    const dia = obtenerNombrePorId(proyecto.dias, sesion.dia_id || ausencia.dia_id, 'Sin día');
    const docente = obtenerNombrePorId(proyecto.personas, cobertura.docente_id, 'Sin docente');
    const tramo = obtenerNombrePorId(proyecto.tramos, sesion.tramo_id, 'Sin tramo');
    filas.push(['Cobertura', cobertura.estado, dia, docente, tramo, actividad.nombre || 'Sesión no localizada', cobertura.observaciones || '']);
  }
  for (const incidencia of gestion.incidencias) {
    const dia = obtenerNombrePorId(proyecto.dias, incidencia.dia_id, 'Sin día');
    filas.push(['Incidencia', incidencia.estado, dia, '', '', incidencia.tipo || 'Observación', incidencia.descripcion || '']);
  }
  return filas.map((fila) => fila.map(celdaCsv).join(';')).join('\n');
}

export function generarInformeGestionDiaria(proyecto) {
  const resumen = resumenGestionDiaria(proyecto);
  const datos = informeGestionDiariaEstructurado(proyecto);
  const lineas = [];
  lineas.push(`Informe de gestión diaria · ${proyecto.centro.nombre}`);
  lineas.push(`Fecha: ${new Date().toLocaleString('es-ES')}`);
  lineas.push('');
  lineas.push(`Ausencias: ${resumen.ausencias} (${resumen.ausencias_confirmadas} confirmada/s)`);
  lineas.push(`Sesiones afectadas: ${resumen.sesiones_afectadas}`);
  lineas.push(`Coberturas: ${resumen.coberturas}; confirmadas/realizadas: ${resumen.coberturas_confirmadas}; sin cubrir: ${resumen.sin_cubrir}`);
  lineas.push(`Incidencias: ${resumen.incidencias}`);
  lineas.push('');
  lineas.push('Ausencias y sesiones afectadas');
  if (!datos.ausencias.length) lineas.push('No hay ausencias registradas.');
  for (const item of datos.ausencias) {
    lineas.push('');
    lineas.push(`- ${item.persona} · ${item.dia} · ${item.tramosTexto} · ${item.ausencia.estado}`);
    if (item.ausencia.motivo) lineas.push(`  Motivo: ${item.ausencia.motivo}`);
    if (!item.sesiones.length) lineas.push('  No hay sesiones afectadas colocadas.');
    for (const sesion of item.sesiones) {
      const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
      const tramo = obtenerNombrePorId(proyecto.tramos, sesion.tramo_id, 'Sin tramo');
      const cobertura = datos.gestion.coberturas.find((c) => c.ausencia_id === item.ausencia.id && c.sesion_id === sesion.id);
      const docenteCobertura = cobertura?.docente_id ? obtenerNombrePorId(proyecto.personas, cobertura.docente_id, 'Sin docente') : 'Sin cobertura registrada';
      lineas.push(`  · ${actividad?.nombre || 'Actividad'} · ${tramo} · cobertura: ${docenteCobertura}${cobertura ? ` (${cobertura.estado})` : ''}`);
    }
  }
  if (datos.gestion.incidencias.length) {
    lineas.push('');
    lineas.push('Incidencias');
    for (const incidencia of datos.gestion.incidencias) {
      lineas.push(`- ${obtenerNombrePorId(proyecto.dias, incidencia.dia_id, 'Sin día')} · ${incidencia.tipo}: ${incidencia.descripcion} (${incidencia.estado})`);
    }
  }
  return lineas.join('\n');
}
