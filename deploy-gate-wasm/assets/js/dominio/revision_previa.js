import { docentesDeActividad, esActividadLectiva, requiereGrupoActividad } from './modelo.js';

function existe(lista = [], id = '') {
  return Boolean(id && lista.some((item) => item.id === id));
}

function item(estado, codigo, titulo, detalle, destino = '') {
  return { estado, codigo, titulo, detalle, destino };
}

function estadoOrden(estado) {
  return { bloqueo: 0, pendiente: 1, aviso: 2, correcto: 3 }[estado] ?? 4;
}

export function revisarPreparacionProyecto(proyecto = {}) {
  const personas = proyecto.personas || [];
  const grupos = proyecto.grupos || [];
  const espacios = proyecto.espacios || [];
  const actividades = proyecto.actividades || [];
  const dias = proyecto.dias || [];
  const tramos = proyecto.tramos || [];
  const items = [];

  const nombreCentro = String(proyecto.centro?.nombre || '').trim();
  items.push(nombreCentro && nombreCentro !== 'Centro sin nombre'
    ? item('correcto', 'CENTRO_NOMBRE_OK', 'Centro identificado', `Nombre: ${nombreCentro}`, 'datos')
    : item('pendiente', 'CENTRO_NOMBRE_PENDIENTE', 'Falta nombre real del centro', 'Indique un nombre reconocible antes de usar el proyecto con un centro real.', 'datos'));

  items.push(dias.length >= 1 && tramos.length >= 1
    ? item('correcto', 'MARCO_HORARIO_OK', 'Marco horario creado', `${dias.length} día/s y ${tramos.length} tramo/s.`, 'datos')
    : item('bloqueo', 'MARCO_HORARIO_INCOMPLETO', 'Faltan días o tramos', 'Defina al menos un día y un tramo horario.', 'datos'));

  items.push(personas.length > 0
    ? item('correcto', 'DOCENTES_OK', 'Profesorado creado', `${personas.length} docente/s.`, 'profesorado')
    : item('bloqueo', 'SIN_DOCENTES', 'Falta profesorado', 'Añada al menos una persona docente.', 'profesorado'));

  items.push(grupos.length > 0
    ? item('correcto', 'GRUPOS_OK', 'Grupos/unidades creados', `${grupos.length} grupo/s o unidad/es.`, 'grupos')
    : item('bloqueo', 'SIN_GRUPOS', 'Faltan grupos o unidades', 'Añada grupos, unidades o subgrupos.', 'grupos'));

  items.push(espacios.length > 0
    ? item('correcto', 'ESPACIOS_OK', 'Espacios creados', `${espacios.length} espacio/s.`, 'espacios')
    : item('aviso', 'SIN_ESPACIOS', 'No hay espacios', 'Puede trabajar con actividades sin espacio obligatorio, pero un centro real suele necesitar aulas, patios o zonas.', 'espacios'));

  items.push(actividades.length > 0
    ? item('correcto', 'ACTIVIDADES_OK', 'Actividades creadas', `${actividades.length} actividad/es horaria/s.`, 'actividades')
    : item('bloqueo', 'SIN_ACTIVIDADES', 'Faltan actividades', 'Añada materias, módulos, LD, DC, servicios o apoyos antes de calcular.', 'actividades'));

  for (const grupo of grupos) {
    if (grupo.grupo_matriz_id && !existe(grupos, grupo.grupo_matriz_id)) {
      items.push(item('bloqueo', 'SUBGRUPO_SIN_MATRIZ', `Subgrupo sin grupo matriz: ${grupo.nombre}`, 'El grupo matriz indicado no existe.', 'grupos'));
    }
    if (grupo.grupo_matriz_id && !grupo.permite_paralelo_con_matriz) {
      items.push(item('aviso', 'SUBGRUPO_SIN_PARALELO', `Subgrupo sin paralelo declarado: ${grupo.nombre}`, 'Para Religión/Atención educativa u otros desdobles conviene permitir el uso paralelo con el grupo matriz cuando proceda.', 'grupos'));
    }
  }

  for (const actividad of actividades) {
    const nombre = actividad.nombre || 'Actividad sin nombre';
    if (Number(actividad.sesiones_semanales || 0) <= 0) {
      items.push(item('bloqueo', 'ACTIVIDAD_SIN_SESIONES', `Actividad sin sesiones: ${nombre}`, 'Indique cuántas sesiones semanales debe tener.', 'actividades'));
    }
    if (!existe(personas, actividad.persona_id)) {
      items.push(item('bloqueo', 'ACTIVIDAD_SIN_DOCENTE', `Actividad sin docente responsable: ${nombre}`, 'Asigne una persona responsable.', 'actividades'));
    }
    if (requiereGrupoActividad(actividad) && !existe(grupos, actividad.grupo_id)) {
      items.push(item('bloqueo', 'ACTIVIDAD_SIN_GRUPO', `Actividad sin grupo/unidad: ${nombre}`, 'Las actividades lectivas o marcadas como “requiere grupo” necesitan grupo, unidad o subgrupo.', 'actividades'));
    }
    if (actividad.requiere_espacio && !existe(espacios, actividad.espacio_id)) {
      items.push(item('bloqueo', 'ACTIVIDAD_SIN_ESPACIO', `Actividad sin espacio obligatorio: ${nombre}`, 'Asigne un espacio o desmarque que sea obligatorio.', 'actividades'));
    }
    const docentes = docentesDeActividad(actividad).filter((id) => existe(personas, id));
    if (Number(actividad.docentes_necesarios || 1) > docentes.length) {
      items.push(item('bloqueo', 'COBERTURA_DOCENTE_INSUFICIENTE', `Cobertura insuficiente: ${nombre}`, `Necesita ${actividad.docentes_necesarios} docente/s y tiene ${docentes.length}.`, 'actividades'));
    }
    const acompanantes = actividad.docentes_acompanantes_ids || [];
    for (const docenteId of acompanantes) {
      if (!existe(personas, docenteId)) {
        items.push(item('bloqueo', 'ACOMPANANTE_INVALIDO', `Docente acompañante inválido: ${nombre}`, 'Hay un acompañante que no existe en el profesorado.', 'actividades'));
      }
      if (docenteId === actividad.persona_id) {
        items.push(item('bloqueo', 'ACOMPANANTE_REPETIDO', `Docente duplicado: ${nombre}`, 'El responsable no debe repetirse como acompañante.', 'actividades'));
      }
    }
    if (esActividadLectiva(actividad) && actividad.clasificacion_horaria !== 'Lectiva') {
      items.push(item('aviso', 'CLASIFICACION_LECTIVA_DUDOSA', `Clasificación dudosa: ${nombre}`, 'Revise si esta actividad debe ser lectiva o DC/no lectiva.', 'actividades'));
    }
  }

  const docentesSinObjetivos = personas.filter((persona) => !Number(persona.horas_lectivas_objetivo || 0) && !Number(persona.horas_dc_objetivo || 0) && !Number(persona.horas_permanencia_objetivo || 0));
  if (personas.length && docentesSinObjetivos.length === personas.length) {
    items.push(item('aviso', 'OBJETIVOS_CARGA_NO_CONFIGURADOS', 'Objetivos de carga no configurados', 'Puede calcular, pero los informes de lectivo/DC/permanencia serán menos útiles.', 'profesorado'));
  } else if (personas.length) {
    items.push(item('correcto', 'OBJETIVOS_CARGA_CONFIGURADOS', 'Objetivos de carga revisados', `${personas.length - docentesSinObjetivos.length}/${personas.length} docente/s con algún objetivo configurado.`, 'profesorado'));
  }

  if ((proyecto.horario || []).length) {
    items.push(item('correcto', 'HORARIO_EXISTE', 'Hay horario generado o editado', `${proyecto.horario.length} sesión/es colocada/s.`, 'revisar'));
  } else {
    items.push(item('pendiente', 'HORARIO_NO_GENERADO', 'Horario aún no generado', 'Cuando los datos estén revisados, pase a Calcular horario.', 'calcular'));
  }

  const resumen = items.reduce((acc, actual) => {
    acc[actual.estado] = (acc[actual.estado] || 0) + 1;
    return acc;
  }, { correcto: 0, aviso: 0, pendiente: 0, bloqueo: 0 });

  return {
    items: items.sort((a, b) => estadoOrden(a.estado) - estadoOrden(b.estado)),
    resumen,
    bloqueantes: resumen.bloqueo || 0,
    pendientes: resumen.pendiente || 0,
    avisos: resumen.aviso || 0,
    listo_para_calcular: !(resumen.bloqueo || 0)
  };
}

export function resumenRevisionPrevia(revision) {
  if (!revision) return 'Revisión no disponible.';
  if (revision.bloqueantes) return `Hay ${revision.bloqueantes} bloqueo/s que conviene corregir antes de calcular.`;
  if (revision.pendientes || revision.avisos) return `Sin bloqueos. Pendientes: ${revision.pendientes}. Avisos: ${revision.avisos}.`;
  return 'Proyecto preparado para calcular.';
}
