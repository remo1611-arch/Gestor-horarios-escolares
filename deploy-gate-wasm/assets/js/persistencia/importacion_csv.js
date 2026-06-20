import {
  normalizarProyecto,
  normalizarTramo,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  TIPOS_ACTIVIDAD,
  CLASIFICACIONES_HORARIAS,
  TIPOS_TRAMO
} from '../dominio/modelo.js';

const TIPOS_IMPORTACION = ['personas', 'grupos', 'espacios', 'tramos', 'actividades'];

export const PLANTILLAS_CSV = {
  personas: {
    nombre: 'plantilla_docentes.csv',
    texto: 'nombre;departamento;horas_lectivas_objetivo;horas_dc_objetivo;horas_permanencia_objetivo;horas_maximas\nDocente de ejemplo;Departamento;18;5;23;25\n'
  },
  grupos: {
    nombre: 'plantilla_grupos.csv',
    texto: 'nombre;ensenanza;nivel;grupo_matriz;tipo_agrupamiento;permite_paralelo\n1.º ESO A;ESO;1.º;;Grupo;no\n1.º ESO A · Religión;ESO;1.º;1.º ESO A;Subgrupo;sí\n'
  },
  espacios: {
    nombre: 'plantilla_espacios.csv',
    texto: 'nombre;tipo;capacidad\nAula 1;Aula ordinaria;25\nPatio norte;Zona de vigilancia;\n'
  },
  tramos: {
    nombre: 'plantilla_tramos.csv',
    texto: 'nombre;inicio;fin;duracion_minutos;tipo_tramo;admite_clase;admite_servicios;computa_permanencia\nEntrada;08:35;08:50;15;Entrada;no;sí;sí\n1.ª hora;08:50;09:40;50;Lectivo;sí;no;sí\nRecreo;11:20;11:50;30;Recreo;no;sí;sí\n'
  },
  actividades: {
    nombre: 'plantilla_actividades.csv',
    texto: 'nombre;tipo;clasificacion_horaria;grupo;docente;docentes_acompanantes;espacio;sesiones_semanales;duracion_tramos;requiere_grupo;requiere_espacio;docentes_necesarios\nLengua;Materia;Lectiva;1.º ESO A;Docente de ejemplo;;Aula 1;4;1;sí;sí;1\nGuardia de patio;Guardia de patio;Docencia complementaria;;Docente de ejemplo;;Patio norte;2;1;no;sí;1\n'
  }
};

export function tipoImportacionValido(tipo) {
  return TIPOS_IMPORTACION.includes(tipo);
}

function limpiarClave(valor) {
  return String(valor || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
}

function normalizarTexto(valor) {
  return String(valor ?? '').trim();
}

function normalizarNombre(valor) {
  return normalizarTexto(valor).toLowerCase();
}

function booleanoCsv(valor, defecto = false) {
  const v = normalizarTexto(valor).toLowerCase();
  if (!v) return defecto;
  return ['1', 'si', 'sí', 'true', 'verdadero', 'x'].includes(v);
}

function numeroCsv(valor, defecto = 0) {
  const n = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : defecto;
}

function dividirLista(valor) {
  return normalizarTexto(valor).split(/[+|,]/g).map((v) => v.trim()).filter(Boolean);
}

function mapaPorNombre(lista) {
  const mapa = new Map();
  for (const item of lista || []) {
    if (item?.nombre) mapa.set(normalizarNombre(item.nombre), item);
  }
  return mapa;
}

export function parsearCsv(texto = '') {
  const filas = [];
  let fila = [];
  let celda = '';
  let comillas = false;
  const entrada = String(texto || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < entrada.length; i += 1) {
    const c = entrada[i];
    const siguiente = entrada[i + 1];
    if (c === '"') {
      if (comillas && siguiente === '"') {
        celda += '"';
        i += 1;
      } else {
        comillas = !comillas;
      }
    } else if ((c === ';' || c === ',') && !comillas) {
      fila.push(celda.trim());
      celda = '';
    } else if ((c === '\n' || c === '\r') && !comillas) {
      if (c === '\r' && siguiente === '\n') i += 1;
      fila.push(celda.trim());
      if (fila.some((v) => normalizarTexto(v))) filas.push(fila);
      fila = [];
      celda = '';
    } else {
      celda += c;
    }
  }
  if (celda || fila.length) {
    fila.push(celda.trim());
    if (fila.some((v) => normalizarTexto(v))) filas.push(fila);
  }
  if (!filas.length) return { cabeceras: [], registros: [] };
  const cabeceras = filas[0].map(limpiarClave);
  const registros = filas.slice(1).map((valores, indice) => {
    const obj = { __fila: indice + 2 };
    cabeceras.forEach((clave, i) => { obj[clave] = valores[i] ?? ''; });
    return obj;
  });
  return { cabeceras, registros };
}

function exigirCabeceras(cabeceras, requeridas, incidencias) {
  const faltan = requeridas.filter((c) => !cabeceras.includes(c));
  if (faltan.length) {
    incidencias.push({ nivel: 'grave', mensaje: `Faltan columnas obligatorias: ${faltan.join(', ')}` });
    return false;
  }
  return true;
}

function resolverIdPorNombre(mapa, nombre, tipo, fila, incidencias, obligatorio = true) {
  const valor = normalizarTexto(nombre);
  if (!valor) {
    if (obligatorio) incidencias.push({ nivel: 'grave', mensaje: `Fila ${fila}: falta ${tipo}.` });
    return '';
  }
  const item = mapa.get(normalizarNombre(valor));
  if (!item) {
    incidencias.push({ nivel: 'grave', mensaje: `Fila ${fila}: no existe ${tipo} “${valor}”. Importe o cree ese dato antes.` });
    return '';
  }
  return item.id;
}

function importarPersonas(proyecto, registros, incidencias) {
  const mapa = mapaPorNombre(proyecto.personas);
  let creados = 0;
  let actualizados = 0;
  for (const r of registros) {
    const nombre = normalizarTexto(r.nombre);
    if (!nombre) { incidencias.push({ nivel: 'grave', mensaje: `Fila ${r.__fila}: docente sin nombre.` }); continue; }
    let persona = mapa.get(normalizarNombre(nombre));
    if (!persona) {
      persona = nuevaPersona(nombre);
      proyecto.personas.push(persona);
      mapa.set(normalizarNombre(nombre), persona);
      creados += 1;
    } else actualizados += 1;
    persona.nombre = nombre;
    persona.departamento = normalizarTexto(r.departamento || persona.departamento);
    persona.horas_lectivas_objetivo = numeroCsv(r.horas_lectivas_objetivo, persona.horas_lectivas_objetivo || 0);
    persona.horas_dc_objetivo = numeroCsv(r.horas_dc_objetivo, persona.horas_dc_objetivo || 0);
    persona.horas_permanencia_objetivo = numeroCsv(r.horas_permanencia_objetivo, persona.horas_permanencia_objetivo || 0);
    persona.horas_maximas = numeroCsv(r.horas_maximas, persona.horas_maximas || 25);
  }
  return { creados, actualizados };
}

function importarGrupos(proyecto, registros, incidencias) {
  const mapa = mapaPorNombre(proyecto.grupos);
  let creados = 0;
  let actualizados = 0;
  for (const r of registros) {
    const nombre = normalizarTexto(r.nombre);
    if (!nombre) { incidencias.push({ nivel: 'grave', mensaje: `Fila ${r.__fila}: grupo sin nombre.` }); continue; }
    let grupo = mapa.get(normalizarNombre(nombre));
    if (!grupo) {
      grupo = nuevoGrupo(nombre);
      proyecto.grupos.push(grupo);
      mapa.set(normalizarNombre(nombre), grupo);
      creados += 1;
    } else actualizados += 1;
    grupo.nombre = nombre;
    grupo.ensenanza = normalizarTexto(r.ensenanza || grupo.ensenanza);
    grupo.nivel = normalizarTexto(r.nivel || grupo.nivel);
    grupo.tipo_agrupamiento = normalizarTexto(r.tipo_agrupamiento || grupo.tipo_agrupamiento || 'Grupo');
    grupo.permite_paralelo_con_matriz = booleanoCsv(r.permite_paralelo, grupo.permite_paralelo_con_matriz);
    if (normalizarTexto(r.grupo_matriz)) {
      const matrizId = resolverIdPorNombre(mapa, r.grupo_matriz, 'grupo matriz', r.__fila, incidencias, false);
      if (matrizId) grupo.grupo_matriz_id = matrizId;
    } else grupo.grupo_matriz_id = '';
  }
  return { creados, actualizados };
}

function importarEspacios(proyecto, registros, incidencias) {
  const mapa = mapaPorNombre(proyecto.espacios);
  let creados = 0;
  let actualizados = 0;
  for (const r of registros) {
    const nombre = normalizarTexto(r.nombre);
    if (!nombre) { incidencias.push({ nivel: 'grave', mensaje: `Fila ${r.__fila}: espacio sin nombre.` }); continue; }
    let espacio = mapa.get(normalizarNombre(nombre));
    if (!espacio) {
      espacio = nuevoEspacio(nombre);
      proyecto.espacios.push(espacio);
      mapa.set(normalizarNombre(nombre), espacio);
      creados += 1;
    } else actualizados += 1;
    espacio.nombre = nombre;
    espacio.tipo = normalizarTexto(r.tipo || espacio.tipo || 'Aula ordinaria');
    espacio.capacidad = normalizarTexto(r.capacidad || espacio.capacidad || '');
  }
  return { creados, actualizados };
}

function importarTramos(proyecto, registros, incidencias) {
  const salida = [];
  let creados = 0;
  for (const r of registros) {
    const nombre = normalizarTexto(r.nombre);
    if (!nombre) { incidencias.push({ nivel: 'grave', mensaje: `Fila ${r.__fila}: tramo sin nombre.` }); continue; }
    const tipo = TIPOS_TRAMO.includes(normalizarTexto(r.tipo_tramo)) ? normalizarTexto(r.tipo_tramo) : 'Lectivo';
    salida.push(normalizarTramo({
      id: `tramo_${salida.length + 1}`,
      nombre,
      orden: salida.length + 1,
      inicio: normalizarTexto(r.inicio),
      fin: normalizarTexto(r.fin),
      duracion_minutos: numeroCsv(r.duracion_minutos, 0),
      tipo_tramo: tipo,
      admite_clase: booleanoCsv(r.admite_clase, tipo === 'Lectivo'),
      admite_servicios: booleanoCsv(r.admite_servicios, ['Entrada', 'Recreo', 'Salida', 'Transporte', 'Comida'].includes(tipo)),
      computa_permanencia: booleanoCsv(r.computa_permanencia, tipo !== 'No disponible')
    }));
    creados += 1;
  }
  if (salida.length) {
    proyecto.tramos = salida;
    // La disponibilidad se recalcula al normalizar el proyecto.
    proyecto.horario = [];
    incidencias.push({ nivel: 'aviso', mensaje: 'Al importar tramos se ha vaciado el horario colocado, porque cambian los huecos disponibles.' });
  }
  return { creados, actualizados: 0 };
}

function importarActividades(proyecto, registros, incidencias) {
  const mapaActividades = mapaPorNombre(proyecto.actividades);
  const mapaGrupos = mapaPorNombre(proyecto.grupos);
  const mapaPersonas = mapaPorNombre(proyecto.personas);
  const mapaEspacios = mapaPorNombre(proyecto.espacios);
  let creados = 0;
  let actualizados = 0;
  for (const r of registros) {
    const nombre = normalizarTexto(r.nombre);
    if (!nombre) { incidencias.push({ nivel: 'grave', mensaje: `Fila ${r.__fila}: actividad sin nombre.` }); continue; }
    const tipo = TIPOS_ACTIVIDAD.includes(normalizarTexto(r.tipo)) ? normalizarTexto(r.tipo) : 'Materia';
    const clasificacion = CLASIFICACIONES_HORARIAS.includes(normalizarTexto(r.clasificacion_horaria)) ? normalizarTexto(r.clasificacion_horaria) : 'Lectiva';
    const requiereGrupo = booleanoCsv(r.requiere_grupo, clasificacion === 'Lectiva');
    const requiereEspacio = booleanoCsv(r.requiere_espacio, Boolean(normalizarTexto(r.espacio)));
    const grupoId = resolverIdPorNombre(mapaGrupos, r.grupo, 'grupo/unidad/subgrupo', r.__fila, incidencias, requiereGrupo);
    const personaId = resolverIdPorNombre(mapaPersonas, r.docente, 'docente responsable', r.__fila, incidencias, true);
    const espacioId = resolverIdPorNombre(mapaEspacios, r.espacio, 'espacio/zona', r.__fila, incidencias, requiereEspacio);
    if (!personaId || (requiereGrupo && !grupoId) || (requiereEspacio && !espacioId)) continue;
    const acompanantes = [];
    for (const nombreDocente of dividirLista(r.docentes_acompanantes)) {
      const id = resolverIdPorNombre(mapaPersonas, nombreDocente, 'docente acompañante', r.__fila, incidencias, false);
      if (id && !acompanantes.includes(id) && id !== personaId) acompanantes.push(id);
    }
    let actividad = mapaActividades.get(normalizarNombre(nombre));
    if (!actividad) {
      actividad = nuevaActividad(nombre);
      proyecto.actividades.push(actividad);
      mapaActividades.set(normalizarNombre(nombre), actividad);
      creados += 1;
    } else actualizados += 1;
    actividad.nombre = nombre;
    actividad.tipo = tipo;
    actividad.clasificacion_horaria = clasificacion;
    actividad.grupo_id = grupoId;
    actividad.persona_id = personaId;
    actividad.docentes_acompanantes_ids = acompanantes;
    actividad.espacio_id = espacioId;
    actividad.sesiones_semanales = numeroCsv(r.sesiones_semanales, actividad.sesiones_semanales || 1);
    actividad.duracion_tramos = numeroCsv(r.duracion_tramos, actividad.duracion_tramos || 1);
    actividad.requiere_grupo = requiereGrupo;
    actividad.requiere_espacio = requiereEspacio;
    actividad.docentes_necesarios = Math.max(1, numeroCsv(r.docentes_necesarios, 1));
  }
  return { creados, actualizados };
}

export function plantillaCsv(tipo) {
  if (!PLANTILLAS_CSV[tipo]) throw new Error(`Tipo de plantilla no soportado: ${tipo}`);
  return PLANTILLAS_CSV[tipo];
}

export function importarCsvEnProyecto(proyectoEntrada, tipo, texto) {
  if (!tipoImportacionValido(tipo)) throw new Error(`Tipo de importación no soportado: ${tipo}`);
  const incidencias = [];
  const proyecto = normalizarProyecto(proyectoEntrada);
  const { cabeceras, registros } = parsearCsv(texto);
  if (!registros.length) {
    return { proyecto, incidencias: [{ nivel: 'grave', mensaje: 'El CSV no contiene filas de datos.' }], creados: 0, actualizados: 0 };
  }
  const requeridas = {
    personas: ['nombre'],
    grupos: ['nombre'],
    espacios: ['nombre'],
    tramos: ['nombre'],
    actividades: ['nombre', 'docente']
  }[tipo];
  if (!exigirCabeceras(cabeceras, requeridas, incidencias)) {
    return { proyecto, incidencias, creados: 0, actualizados: 0 };
  }
  const resultado = {
    personas: () => importarPersonas(proyecto, registros, incidencias),
    grupos: () => importarGrupos(proyecto, registros, incidencias),
    espacios: () => importarEspacios(proyecto, registros, incidencias),
    tramos: () => importarTramos(proyecto, registros, incidencias),
    actividades: () => importarActividades(proyecto, registros, incidencias)
  }[tipo]();
  const normalizado = normalizarProyecto(proyecto);
  return { proyecto: normalizado, incidencias, creados: resultado.creados, actualizados: resultado.actualizados };
}

export function resumenImportacion(resultado) {
  const graves = resultado.incidencias.filter((i) => i.nivel === 'grave').length;
  const avisos = resultado.incidencias.filter((i) => i.nivel !== 'grave').length;
  return `Importación finalizada: ${resultado.creados} alta/s, ${resultado.actualizados} actualización/es, ${graves} error/es grave/s y ${avisos} aviso/s.`;
}
