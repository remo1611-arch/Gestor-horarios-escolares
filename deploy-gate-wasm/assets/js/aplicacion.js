import {
  VERSION_APLICACION,
  TIPOS_CENTRO,
  TIPOS_ACTIVIDAD,
  CLASIFICACIONES_HORARIAS,
  TIPOS_TRAMO,
  crearProyectoVacio,
  crearTramosBase,
  normalizarProyecto,
  clonar,
  generarId,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  nuevaColocacion,
  asegurarDisponibilidad,
  claveHueco,
  ordenarPorOrden,
  obtenerNombrePorId,
  tramosCubiertos,
  etiquetaTramo,
  resumenProyecto,
  docentesDeSesion
} from './dominio/modelo.js';
import { validarHorario, validarDatosProyecto, resumenValidacion, tieneGraves } from './motor/validador_horario.js';
import { generarHorario } from './motor/generador_horario.js';
import { guardarProyectoLocal, recuperarProyectoLocal, recuperarCopiaAnteriorLocal, guardarCopiaEmergenciaLocal, recuperarCopiaEmergenciaLocal, descargarTexto, leerArchivoComoTexto } from './persistencia/almacenamiento_local.js';
import { exportarProyectoJSON, importarProyectoJSON, nombreSeguro } from './persistencia/importar_exportar.js';
import { plantillaCsv, importarCsvEnProyecto, resumenImportacion, PLANTILLAS_CSV } from './persistencia/importacion_csv.js';
import { generarCsvHorario, generarHtmlImprimible, generarInformeValidacion, generarCsvCargaDocente, generarInformeCargaDocente, generarInformeBloqueos, generarCsvCalidadHorario, generarInformeCalidadHorario, generarCsvGestionDiaria, generarInformeGestionDiaria } from './documentos/exportar.js';
import { calcularCargaDocente, resumenCargaDocente } from './dominio/carga_docente.js';
import { auditarCoherenciaCarga, resumenCoherenciaCarga, generarInformeCoherenciaCarga } from './dominio/coherencia_carga.js';
import { revisarPreparacionProyecto, resumenRevisionPrevia } from './dominio/revision_previa.js';
import { explicarBloqueosProyecto, resumenExplicaciones } from './dominio/explicador_bloqueos.js';
import { calcularCalidadHorario, textoNivelCalidad } from './dominio/calidad_horario.js';
import {
  ESTADOS_COBERTURA,
  TIPOS_INCIDENCIA_DIARIA,
  nuevaAusenciaDiaria,
  nuevaIncidenciaDiaria,
  normalizarGestionDiaria,
  crearCoberturasPropuestas,
  resumenGestionDiaria,
  sesionesAfectadasPorAusencia
} from './dominio/gestion_diaria.js';
import {
  aplicarMovimientoSesion,
  huecosValidosParaSesion,
  crearSesionPendiente,
  actividadesConSesionesPendientes
} from './motor/editor_manual.js';

const secciones = [
  ['inicio', 'Inicio'],
  ['asistente', 'Asistente'],
  ['importacion', 'Importación CSV'],
  ['datos', 'Datos del centro'],
  ['profesorado', 'Profesorado'],
  ['grupos', 'Grupos'],
  ['espacios', 'Espacios'],
  ['actividades', 'Actividades'],
  ['disponibilidad', 'Disponibilidad'],
  ['condiciones', 'Condiciones'],
  ['calcular', 'Calcular horario'],
  ['revisar', 'Revisar y ajustar'],
  ['gestion-diaria', 'Gestión diaria'],
  ['documentos', 'Documentos'],
  ['mantenimiento', 'Mantenimiento avanzado']
];

let proyecto = normalizarProyecto(crearProyectoVacio());
let seccionActual = 'inicio';
let mensaje = '';
let sesionSeleccionadaId = '';
let vistaRevision = { modo: 'grupo', entidad_id: '' };
let vistaDisponibilidad = { tipo: 'persona', entidad_id: '' };
let pasoAsistente = 'centro';
let actividadCondicionSeleccionadaId = '';
let pilaDeshacer = [];
let pilaRehacer = [];
const LIMITE_HISTORIAL_EDICION = 25;
let cambiosPendientes = false;
let calculandoHorario = false;
let progresoCalculo = null;
let calculoActivo = null;
let numeroCalculo = 0;

const botonPantallaCompleta = document.querySelector('#boton-pantalla-completa');

const app = document.querySelector('#app');
const navegacion = document.querySelector('#navegacion');
const estadoCorto = document.querySelector('#estado-corto');



function elementoPantallaCompletaActual() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function pantallaCompletaSoportada() {
  const elemento = document.documentElement;
  return Boolean(elemento.requestFullscreen || elemento.webkitRequestFullscreen);
}

function enPantallaCompleta() {
  return Boolean(elementoPantallaCompletaActual());
}

function actualizarBotonPantallaCompleta() {
  if (!botonPantallaCompleta) return;
  if (!pantallaCompletaSoportada()) {
    botonPantallaCompleta.classList.add('no-soportado');
    botonPantallaCompleta.setAttribute('aria-hidden', 'true');
    return;
  }
  const activa = enPantallaCompleta();
  botonPantallaCompleta.classList.remove('no-soportado');
  botonPantallaCompleta.setAttribute('aria-hidden', 'false');
  botonPantallaCompleta.setAttribute('aria-pressed', activa ? 'true' : 'false');
  botonPantallaCompleta.textContent = activa ? 'Salir de pantalla completa' : '⛶ Pantalla completa';
  botonPantallaCompleta.title = activa ? 'Salir de pantalla completa' : 'Pantalla completa';
}

async function alternarPantallaCompleta() {
  if (!pantallaCompletaSoportada()) {
    mensaje = '<div class="aviso advertencia">Este navegador no permite activar pantalla completa desde la app.</div>';
    renderizar();
actualizarBotonPantallaCompleta();
    return;
  }
  try {
    if (enPantallaCompleta()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } else {
      const elemento = document.documentElement;
      if (elemento.requestFullscreen) await elemento.requestFullscreen();
      else if (elemento.webkitRequestFullscreen) await elemento.webkitRequestFullscreen();
    }
    actualizarBotonPantallaCompleta();
  } catch (error) {
    mensaje = `<div class="aviso advertencia">No se pudo cambiar a pantalla completa: ${htmlSeguro(error?.message || 'operación bloqueada por el navegador')}</div>`;
    renderizar();
  }
}

function esDispositivoTactil() {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const touch = 'ontouchstart' in window || Number(navigator.maxTouchPoints || 0) > 0;
  return Boolean(coarse || touch);
}

function arrastreVisualPermitido() {
  return !esDispositivoTactil();
}

function cancelarEventoTactilLargo(evento) {
  // En móviles Android no se debe cancelar touchstart: hacerlo puede anular
  // el click normal. Solo se bloquean las rutas que realmente abren menú
  // contextual o inician arrastre no deseado.
  if (!esDispositivoTactil()) return;
  if (evento.type === 'contextmenu' || evento.type === 'dragstart') {
    evento.preventDefault();
  }
}

function toqueTactilNoBloqueante(evento) {
  // Marcador deliberadamente no bloqueante. Mantiene la pulsación corta
  // funcional en Android y deja que el evento click seleccione la sesión.
  if (!esDispositivoTactil()) return;
  // No usar preventDefault aquí.
}

function htmlSeguro(valor) {
  return String(valor ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function opciones(lista, seleccionado = '', etiquetaVacia = 'Seleccionar') {
  return `<option value="">${htmlSeguro(etiquetaVacia)}</option>${lista.map((item) => `<option value="${htmlSeguro(item.id)}" ${item.id === seleccionado ? 'selected' : ''}>${htmlSeguro(item.nombre)}</option>`).join('')}`;
}

function opcionesTexto(lista, seleccionado = '') {
  return lista.map((item) => `<option value="${htmlSeguro(item)}" ${item === seleccionado ? 'selected' : ''}>${htmlSeguro(item)}</option>`).join('');
}

function avisar(texto, tipo = 'correcto') {
  mensaje = `<div class="aviso ${tipo}">${htmlSeguro(texto)}</div>`;
  renderizar();
}

function marcarModificado() {
  proyecto.metadatos = { ...(proyecto.metadatos || {}), modificado: new Date().toISOString() };
  cambiosPendientes = true;
  guardarEmergencia('cambio_sin_guardar');
}

function marcarGuardado() {
  cambiosPendientes = false;
}

function confirmarAccion(texto) {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
  return window.confirm(texto);
}

function confirmarReemplazoProyecto() {
  if (!cambiosPendientes) return true;
  return confirmarAccion('Hay cambios sin guardar. ¿Quiere continuar y sustituir el proyecto actual?');
}

function confirmarRecuperacion(texto) {
  if (cambiosPendientes) {
    return confirmarAccion(`${texto}

Hay cambios sin guardar. Si continúa, el proyecto actual será sustituido.`);
  }
  return confirmarAccion(texto);
}

function confirmarSustitucionHorario() {
  if (!proyecto.horario?.length) return true;
  return confirmarAccion('El cálculo sustituirá el horario actual, salvo las sesiones que el motor pueda conservar como fijadas. ¿Quiere continuar?');
}

function limpiarSeleccionTemporal(motivo = '') {
  if (!sesionSeleccionadaId) return false;
  sesionSeleccionadaId = '';
  if (motivo) mensaje = `<div class="aviso advertencia">${htmlSeguro(motivo)}</div>`;
  return true;
}


function guardarEmergencia(motivo = 'cambio') {
  try { guardarCopiaEmergenciaLocal(proyecto, motivo); } catch (_) { /* no bloqueante */ }
}

function registrarErrorInterfaz(contexto, error) {
  const detalle = error?.message || String(error || 'error desconocido');
  guardarEmergencia(`error_${contexto}`);
  calculandoHorario = false;
  calculoActivo = null;
  sesionSeleccionadaId = '';
  mensaje = `<div class="aviso grave"><strong>La operación se ha cancelado para proteger el proyecto.</strong><br>${htmlSeguro(detalle)}<br>Use “Recuperar copia de emergencia” si necesita restaurar el último estado.</div>`;
  try { renderizar(); }
  catch (_) {
    app.innerHTML = `<section class="panel"><h1>Protección de edición</h1><div class="aviso grave">La pantalla de edición no pudo reconstruirse. Recargue la página y pulse “Recuperar copia de emergencia”.</div></section>`;
  }
}

function ejecutarSeguro(contexto, operacion) {
  return async (evento) => {
    try {
      await operacion(evento);
    } catch (error) {
      registrarErrorInterfaz(contexto, error);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (evento) => {
    registrarErrorInterfaz('error_global', evento.error || new Error(evento.message || 'error global'));
  });
  window.addEventListener('unhandledrejection', (evento) => {
    registrarErrorInterfaz('promesa_no_controlada', evento.reason || new Error('promesa no controlada'));
  });
  window.addEventListener('beforeunload', (evento) => {
    if (!cambiosPendientes) return;
    guardarEmergencia('salida_o_recarga_con_cambios');
    evento.preventDefault();
    evento.returnValue = '';
  });
  window.addEventListener('pagehide', () => {
    if (cambiosPendientes || sesionSeleccionadaId) guardarEmergencia('pagina_oculta');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && (cambiosPendientes || sesionSeleccionadaId)) {
      guardarEmergencia('pagina_oculta');
    }
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && limpiarSeleccionTemporal('Selección cancelada.')) {
      renderizar();
    }
  });
  app.addEventListener('click', (evento) => {
    if (seccionActual !== 'revisar' || !sesionSeleccionadaId) return;
    const objetivo = evento.target;
    if (!(objetivo instanceof Element)) return;
    if (objetivo.closest('[data-sesion], [data-destino-dia], [data-accion], button, input, select, textarea, label, a')) return;
    if (limpiarSeleccionTemporal('Selección cancelada.')) renderizar();
  });
  botonPantallaCompleta?.addEventListener('click', ejecutarSeguro('pantalla_completa', alternarPantallaCompleta));
  document.addEventListener('fullscreenchange', actualizarBotonPantallaCompleta);
  document.addEventListener('webkitfullscreenchange', actualizarBotonPantallaCompleta);
}


function registrarCambioEdicion() {
  pilaDeshacer.push(clonar(proyecto));
  if (pilaDeshacer.length > LIMITE_HISTORIAL_EDICION) pilaDeshacer.shift();
  pilaRehacer = [];
}

function deshacerCambio() {
  if (!pilaDeshacer.length) return false;
  pilaRehacer.push(clonar(proyecto));
  proyecto = normalizarProyecto(pilaDeshacer.pop());
  sesionSeleccionadaId = '';
  marcarModificado();
  return true;
}

function rehacerCambio() {
  if (!pilaRehacer.length) return false;
  pilaDeshacer.push(clonar(proyecto));
  proyecto = normalizarProyecto(pilaRehacer.pop());
  sesionSeleccionadaId = '';
  marcarModificado();
  return true;
}

function cambiarSeccion(id) {
  const habiaSeleccion = Boolean(sesionSeleccionadaId);
  if (id !== seccionActual) limpiarSeleccionTemporal();
  seccionActual = id;
  mensaje = habiaSeleccion ? '<div class="aviso advertencia">Selección de edición cancelada al cambiar de sección.</div>' : '';
  renderizar();
  app.focus();
}

function renderizarNavegacion() {
  navegacion.innerHTML = secciones.map(([id, texto]) => `<button type="button" class="${id === seccionActual ? 'activo' : ''}" data-ir="${id}">${texto}</button>`).join('');
  navegacion.querySelectorAll('[data-ir]').forEach((boton) => boton.addEventListener('click', () => cambiarSeccion(boton.dataset.ir)));
}

function renderizarEstado() {
  const resumen = resumenProyecto(proyecto);
  const incidencias = validarHorario(proyecto);
  const graves = incidencias.filter((i) => i.nivel === 'grave').length;
  const avisos = incidencias.filter((i) => i.nivel === 'aviso').length;
  estadoCorto.textContent = `${resumen.sesiones_colocadas}/${resumen.sesiones_previstas} sesiones · ${graves} graves · ${avisos} avisos${cambiosPendientes ? ' · cambios sin guardar' : ''}${calculandoHorario ? ' · calculando' : ''}`;
}

function resumenHtml() {
  const r = resumenProyecto(proyecto);
  return `<div class="contador">
    <span>${r.personas} docentes</span>
    <span>${r.grupos} grupos</span>
    <span>${r.espacios} espacios</span>
    <span>${r.actividades} actividades</span>
    <span>${r.actividades_lectivas || 0} lectivas</span>
    <span>${r.actividades_docencia_complementaria || 0} DC</span>
    <span>${r.servicios_centro || 0} servicios</span>
    <span>${r.actividades_no_lectivas || 0} no lectivas</span>
    <span>${r.sesiones_colocadas}/${r.sesiones_previstas} sesiones</span>
  </div>`;
}

function campoTexto(id, etiqueta, valor, extra = '') {
  return `<div class="campo"><label for="${id}">${etiqueta}</label><input id="${id}" ${extra} value="${htmlSeguro(valor)}"></div>`;
}

function campoNumero(id, etiqueta, valor, extra = '') {
  return `<div class="campo"><label for="${id}">${etiqueta}</label><input id="${id}" type="number" min="0" step="1" ${extra} value="${htmlSeguro(valor)}"></div>`;
}

function crearEjemplo(tipo) {
  const p = crearProyectoVacio();
  const nombresCentro = {
    CEIP: 'CEIP de ejemplo',
    IES: 'IES de ejemplo',
    CPI: 'CPI de ejemplo',
    CIFP: 'CIFP de ejemplo',
    CEE: 'CEE de ejemplo',
    COMPLEJO: 'Centro complejo sintético',
    EXIGENTE: 'Centro exigente sintético'
  };
  p.centro = {
    nombre: nombresCentro[tipo] || 'Centro de ejemplo',
    tipo: ['COMPLEJO', 'EXIGENTE'].includes(tipo) ? 'CPI' : tipo,
    curso_academico: '2026-2027',
    descripcion: 'Ejemplo sintético sin datos reales ni correspondencia con centros concretos.'
  };
  const docentes = tipo === 'EXIGENTE'
    ? ['Docente A', 'Docente B', 'Docente C', 'Docente D', 'Docente E', 'Docente F', 'Docente G', 'Docente H', 'Docente I', 'Docente J']
    : tipo === 'COMPLEJO'
      ? ['Ana García', 'Luis Pérez', 'María López', 'Carlos Santos', 'Noa Varela', 'Xoán Castro']
      : ['Ana García', 'Luis Pérez', 'María López', 'Carlos Santos'];
  p.personas = docentes.map((nombre, indice) => asegurarDisponibilidad({
    ...nuevaPersona(nombre),
    departamento: indice % 2 ? 'Ámbito / especialidad' : 'Departamento',
    horas_lectivas_objetivo: tipo === 'EXIGENTE' ? 10 : 0,
    horas_dc_objetivo: tipo === 'EXIGENTE' ? 4 : 0,
    horas_permanencia_objetivo: tipo === 'EXIGENTE' ? 18 : 0,
    horas_maximas: tipo === 'EXIGENTE' ? 22 : 25
  }, p));
  const gruposPorTipo = {
    CEIP: ['4.º Infantil', '5.º Primaria'],
    IES: ['1.º ESO A', '2.º ESO A', '1.º Bachillerato'],
    CPI: ['5.º Infantil', '4.º Primaria', '1.º ESO A'],
    CIFP: ['1.º Cocina', '2.º Pastelería'],
    CEE: ['Unidad 1', 'Unidad 2', 'Grupo apoyo comunicación'],
    COMPLEJO: ['Infantil mixto', '5.º Primaria', '1.º ESO A', '2.º ESO B'],
    EXIGENTE: ['Infantil mixto', '5.º Primaria', '1.º ESO A', '1.º ESO B', '2.º ESO A', 'Aula de apoyo']
  };
  const espaciosPorTipo = {
    CEIP: ['Aula Infantil', 'Aula 5.º', 'Gimnasio', 'Música'],
    IES: ['Aula 101', 'Aula 102', 'Laboratorio', 'Gimnasio'],
    CPI: ['Aula Infantil', 'Aula Primaria', 'Aula ESO', 'Gimnasio', 'Biblioteca'],
    CIFP: ['Aula técnica', 'Taller cocina', 'Obrador pastelería', 'Aula polivalente'],
    CEE: ['Aula unidad 1', 'Aula unidad 2', 'Sala atención específica', 'Gimnasio terapéutico'],
    COMPLEJO: ['Aula Infantil', 'Aula Primaria', 'Aula ESO 1', 'Aula ESO 2', 'Gimnasio', 'Biblioteca', 'Laboratorio'],
    EXIGENTE: ['Aula Infantil', 'Aula Primaria', 'Aula Religión', 'Aula Atención Educativa', 'Aula ESO A', 'Aula ESO B', 'Laboratorio', 'Gimnasio', 'Patio norte', 'Patio sur', 'Acceso principal', 'Biblioteca', 'Sala de profesorado']
  };
  p.grupos = (gruposPorTipo[tipo] || gruposPorTipo.IES).map((n) => nuevoGrupo(n));
  if (['COMPLEJO', 'EXIGENTE'].includes(tipo)) {
    const matrizPrimaria = p.grupos.find((grupo) => grupo.nombre === '5.º Primaria');
    if (matrizPrimaria) {
      p.grupos.push({ ...nuevoGrupo('5.º Primaria · Religión'), grupo_matriz_id: matrizPrimaria.id, tipo_agrupamiento: 'Subgrupo', permite_paralelo_con_matriz: true });
      p.grupos.push({ ...nuevoGrupo('5.º Primaria · Atención educativa'), grupo_matriz_id: matrizPrimaria.id, tipo_agrupamiento: 'Subgrupo', permite_paralelo_con_matriz: true });
    }
  }
  if (tipo === 'EXIGENTE') {
    p.tramos = [
      { id: 'tramo_entrada', nombre: 'Entrada', orden: 1, inicio: '08:35', fin: '08:50', duracion_minutos: 15, tipo_tramo: 'Entrada', admite_clase: false, admite_servicios: true },
      { id: 'tramo_1', nombre: '1.ª hora', orden: 2, inicio: '08:50', fin: '09:40', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
      { id: 'tramo_2', nombre: '2.ª hora', orden: 3, inicio: '09:40', fin: '10:30', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
      { id: 'tramo_recreo', nombre: 'Recreo', orden: 4, inicio: '10:30', fin: '11:00', duracion_minutos: 30, tipo_tramo: 'Recreo', admite_clase: false, admite_servicios: true },
      { id: 'tramo_3', nombre: '3.ª hora', orden: 5, inicio: '11:00', fin: '11:50', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
      { id: 'tramo_4', nombre: '4.ª hora', orden: 6, inicio: '11:50', fin: '12:40', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
      { id: 'tramo_5', nombre: '5.ª hora', orden: 7, inicio: '12:40', fin: '13:30', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
      { id: 'tramo_salida', nombre: 'Salida', orden: 8, inicio: '13:30', fin: '13:45', duracion_minutos: 15, tipo_tramo: 'Salida', admite_clase: false, admite_servicios: true }
    ];
    for (const persona of p.personas) asegurarDisponibilidad(persona, p);
  }
  p.espacios = (espaciosPorTipo[tipo] || espaciosPorTipo.IES).map((n) => asegurarDisponibilidad(nuevoEspacio(n), p));

  const actividad = (nombre, tipoAct, sesiones, duracion, persona, grupo, espacio, extra = {}) => {
    const base = nuevaActividad(nombre);
    const clasificacion = extra.clasificacion_horaria || (['Guardia', 'Guardia de patio', 'Guardia de entrada', 'Guardia de salida', 'Guardia de recreo', 'Tutoría de atención a familias', 'Coordinación', 'Cargo', 'Reducción', 'Biblioteca', 'Reunión', 'Permanencia en centro', 'Itinerancia'].includes(tipoAct) ? 'Docencia complementaria' : 'Lectiva');
    const requiereGrupo = Object.prototype.hasOwnProperty.call(extra, 'requiere_grupo') ? extra.requiere_grupo : clasificacion === 'Lectiva';
    return {
      ...base,
      tipo: tipoAct,
      clasificacion_horaria: clasificacion,
      requiere_grupo: requiereGrupo,
      computa_lectivo: Object.prototype.hasOwnProperty.call(extra, 'computa_lectivo') ? extra.computa_lectivo : clasificacion === 'Lectiva',
      computa_no_lectivo: Object.prototype.hasOwnProperty.call(extra, 'computa_no_lectivo') ? extra.computa_no_lectivo : clasificacion !== 'Lectiva',
      sesiones_semanales: sesiones,
      duracion_tramos: duracion,
      persona_id: p.personas[persona % p.personas.length].id,
      grupo_id: requiereGrupo && p.grupos.length ? p.grupos[grupo % p.grupos.length].id : '',
      espacio_id: p.espacios[espacio % p.espacios.length]?.id || '',
      requiere_espacio: true,
      ...extra,
      condiciones: { ...(nuevaActividad().condiciones), ...(extra.condiciones || {}) }
    };
  };

  if (tipo === 'CIFP') {
    p.actividades = [
      actividad('Procesos culinarios', 'Módulo profesional', 4, 2, 0, 0, 1, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Pastelería básica', 'Módulo profesional', 3, 2, 1, 1, 2, { condiciones: { huecos_prohibidos: [claveHueco('dia_5', 'tramo_6')] } }),
      actividad('Seguridad alimentaria', 'Módulo profesional', 2, 1, 2, 0, 0),
      actividad('Empresa e iniciativa', 'Módulo profesional', 2, 1, 3, 1, 3, { requiere_espacio: false, espacio_id: '' })
    ];
  } else if (tipo === 'CEE') {
    p.actividades = [
      actividad('Ámbito de autonomía personal', 'Ámbito', 4, 1, 0, 0, 0, { condiciones: { prohibir_ultima_hora: true } }),
      actividad('Atención específica AL', 'Atención específica', 3, 1, 1, 2, 2, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Psicomotricidad', 'Apoyo', 2, 1, 2, 1, 3),
      actividad('Tutoría y coordinación', 'Tutoría', 1, 1, 3, 0, 0)
    ];
  } else if (tipo === 'CPI') {
    p.actividades = [
      actividad('Ámbito Infantil', 'Ámbito', 4, 1, 0, 0, 0),
      actividad('Matemáticas Primaria', 'Materia', 4, 1, 1, 1, 1, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Inglés ESO', 'Materia', 3, 1, 2, 2, 2),
      actividad('Educación Física compartida', 'Materia', 2, 1, 3, 1, 3, { condiciones: { tramos_prohibidos: ['tramo_1'] } })
    ];

  } else if (tipo === 'EXIGENTE') {
    const grupoReligion = p.grupos.find((grupo) => grupo.nombre.includes('Religión')) || p.grupos[1];
    const grupoAtencion = p.grupos.find((grupo) => grupo.nombre.includes('Atención educativa')) || p.grupos[1];
    const prohibirServicios = ['tramo_entrada', 'tramo_recreo', 'tramo_salida'];
    const soloEntrada = ['tramo_1', 'tramo_2', 'tramo_recreo', 'tramo_3', 'tramo_4', 'tramo_5', 'tramo_salida'];
    const soloRecreo = ['tramo_entrada', 'tramo_1', 'tramo_2', 'tramo_3', 'tramo_4', 'tramo_5', 'tramo_salida'];
    const soloSalida = ['tramo_entrada', 'tramo_1', 'tramo_2', 'tramo_recreo', 'tramo_3', 'tramo_4', 'tramo_5'];
    p.actividades = [
      actividad('Ámbito Infantil', 'Ámbito', 5, 1, 0, 0, 0, { condiciones: { tramos_prohibidos: prohibirServicios, prohibir_ultima_hora: true } }),
      actividad('Lengua 5.º Primaria', 'Materia', 4, 1, 1, 1, 1, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios } }),
      actividad('Matemáticas 5.º Primaria', 'Materia', 4, 1, 2, 1, 1, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios, tramos_preferidos: ['tramo_1', 'tramo_2'] } }),
      actividad('Inglés 5.º Primaria', 'Materia', 3, 1, 3, 1, 1, { condiciones: { tramos_prohibidos: prohibirServicios } }),
      actividad('Educación Física 5.º Primaria', 'Materia', 2, 1, 8, 1, 7, { condiciones: { tramos_prohibidos: ['tramo_entrada', 'tramo_1', 'tramo_recreo', 'tramo_salida'] } }),
      actividad('Libre disposición 5.º Primaria', 'Libre disposición', 2, 1, 9, 1, 1, { condiciones: { tramos_prohibidos: prohibirServicios } }),
      actividad('Religión 5.º Primaria', 'Religión', 2, 1, 3, p.grupos.indexOf(grupoReligion), 2, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios } }),
      actividad('Atención educativa 5.º Primaria', 'Atención educativa', 2, 1, 4, p.grupos.indexOf(grupoAtencion), 3, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios } }),
      actividad('Matemáticas 1.º ESO A con apoyo', 'Docencia compartida', 4, 1, 5, 2, 4, { docentes_acompanantes_ids: [p.personas[9].id], docentes_necesarios: 2, condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios, tramos_preferidos: ['tramo_1', 'tramo_2'] } }),
      actividad('Lengua 1.º ESO A', 'Materia', 4, 1, 6, 2, 4, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios } }),
      actividad('Ciencias 1.º ESO A laboratorio', 'Materia', 2, 2, 7, 2, 6, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: ['tramo_entrada', 'tramo_recreo', 'tramo_5', 'tramo_salida'] } }),
      actividad('Matemáticas 1.º ESO B', 'Materia', 4, 1, 5, 3, 5, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios } }),
      actividad('Lengua 1.º ESO B', 'Materia', 4, 1, 6, 3, 5, { condiciones: { una_sesion_por_dia: true, tramos_prohibidos: prohibirServicios } }),
      actividad('Inglés 1.º ESO B', 'Materia', 3, 1, 3, 3, 5, { condiciones: { tramos_prohibidos: prohibirServicios } }),
      actividad('Tecnología 2.º ESO A', 'Materia', 2, 2, 7, 4, 6, { condiciones: { tramos_prohibidos: ['tramo_entrada', 'tramo_recreo', 'tramo_5', 'tramo_salida'] } }),
      actividad('Libre disposición ESO', 'Libre disposición', 2, 1, 9, 3, 5, { condiciones: { tramos_prohibidos: prohibirServicios } }),
      actividad('Apoyo lingüístico ESO', 'Apoyo lectivo', 2, 1, 9, 2, 11, { condiciones: { dias_preferidos: ['dia_2', 'dia_4'], tramos_prohibidos: prohibirServicios } }),
      actividad('Tutoría lectiva 1.º ESO A', 'Tutoría lectiva', 1, 1, 6, 2, 4, { condiciones: { tramos_prohibidos: prohibirServicios } }),
      actividad('Guardia de entrada acceso principal', 'Guardia de entrada', 5, 1, 0, 0, 10, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[1].id], docentes_necesarios: 2, condiciones: { tramos_prohibidos: soloEntrada } }),
      actividad('Guardia de salida transporte', 'Guardia de salida', 5, 1, 2, 0, 10, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[3].id], docentes_necesarios: 2, condiciones: { tramos_prohibidos: soloSalida } }),
      actividad('Guardia de recreo patio norte', 'Guardia de patio', 5, 1, 4, 0, 8, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[8].id], docentes_necesarios: 2, condiciones: { tramos_prohibidos: soloRecreo } }),
      actividad('Guardia de recreo patio sur', 'Guardia de patio', 5, 1, 5, 0, 9, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[7].id], docentes_necesarios: 2, condiciones: { tramos_prohibidos: soloRecreo } }),
      actividad('Biblioteca de recreo', 'Biblioteca', 3, 1, 9, 0, 11, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_necesarios: 1, condiciones: { tramos_prohibidos: soloRecreo } }),
      actividad('Coordinación de etapa', 'Coordinación', 1, 1, 1, 0, 12, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[6].id], docentes_necesarios: 2, condiciones: { tramos_preferidos: ['tramo_5'], tramos_prohibidos: ['tramo_entrada', 'tramo_recreo', 'tramo_salida'] } }),
      actividad('Tutoría de atención a familias', 'Tutoría de atención a familias', 1, 1, 6, 0, 12, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, requiere_espacio: false, espacio_id: '', condiciones: { tramos_preferidos: ['tramo_5'], tramos_prohibidos: ['tramo_entrada', 'tramo_recreo', 'tramo_salida'] } }),
      actividad('Reunión de equipo docente', 'Reunión', 1, 1, 0, 0, 12, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[1].id, p.personas[2].id], docentes_necesarios: 3, condiciones: { tramos_preferidos: ['tramo_salida'] } })
    ];
  } else if (tipo === 'COMPLEJO') {
    const grupoReligion = p.grupos.find((grupo) => grupo.nombre.includes('Religión')) || p.grupos[1];
    const grupoAtencion = p.grupos.find((grupo) => grupo.nombre.includes('Atención educativa')) || p.grupos[1];
    p.actividades = [
      actividad('Ámbito Infantil', 'Ámbito', 4, 1, 0, 0, 0, { condiciones: { prohibir_ultima_hora: true } }),
      actividad('Lengua Primaria', 'Materia', 4, 1, 1, 1, 1, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Matemáticas ESO A con apoyo', 'Docencia compartida', 4, 1, 2, 2, 2, { docentes_acompanantes_ids: [p.personas[5].id], docentes_necesarios: 2, condiciones: { una_sesion_por_dia: true, tramos_preferidos: ['tramo_1', 'tramo_2'] } }),
      actividad('Laboratorio ESO B', 'Materia', 2, 2, 3, 3, 6, { condiciones: { huecos_prohibidos: [claveHueco('dia_5', 'tramo_5'), claveHueco('dia_5', 'tramo_6')] } }),
      actividad('Educación Física', 'Materia', 2, 1, 4, 1, 4, { condiciones: { tramos_prohibidos: ['tramo_1'] } }),
      actividad('Apoyo lingüístico', 'Apoyo lectivo', 3, 1, 5, 2, 5, { condiciones: { dias_preferidos: ['dia_2', 'dia_4'] } }),
      actividad('Religión 5.º Primaria', 'Religión', 2, 1, 1, p.grupos.indexOf(grupoReligion), 1, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Atención educativa 5.º Primaria', 'Atención educativa', 2, 1, 2, p.grupos.indexOf(grupoAtencion), 5, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Guardia de patio recreo', 'Guardia de patio', 5, 1, 3, 0, 4, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, docentes_acompanantes_ids: [p.personas[4].id], docentes_necesarios: 2, condiciones: { tramos_preferidos: ['tramo_3'] } }),
      actividad('Guardia de entrada', 'Guardia de entrada', 5, 1, 0, 0, 5, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, requiere_espacio: false, espacio_id: '', docentes_necesarios: 1, condiciones: { tramos_preferidos: ['tramo_1'] } }),
      actividad('Coordinación docente', 'Coordinación', 1, 1, 5, 0, 5, { clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, requiere_espacio: false, espacio_id: '', condiciones: { tramos_preferidos: ['tramo_6'] } })
    ];
  } else {
    p.actividades = [
      actividad('Lengua', 'Materia', 4, 1, 0, 0, 0),
      actividad('Matemáticas', 'Materia', 4, 1, 1, 0, 1, { condiciones: { una_sesion_por_dia: true } }),
      actividad('Inglés', 'Materia', 3, 1, 2, 1, 1),
      actividad('Educación Física', 'Materia', 2, 1, 3, 1, 2, { condiciones: { tramos_prohibidos: ['tramo_1'] } })
    ];
  }
  return normalizarProyecto(p);
}

function estadoRevisionClase(estado) {
  return estado === 'bloqueo' ? 'grave' : estado === 'pendiente' || estado === 'aviso' ? 'advertencia' : 'correcto';
}

function renderResumenRevisionPrevia(compacto = false) {
  const revision = revisarPreparacionProyecto(proyecto);
  const clase = revision.bloqueantes ? 'grave' : (revision.pendientes || revision.avisos) ? 'advertencia' : 'correcto';
  const lista = compacto ? revision.items.slice(0, 6) : revision.items;
  return `<div class="aviso ${clase}"><strong>${htmlSeguro(resumenRevisionPrevia(revision))}</strong></div>
    <div class="lista-incidencias revision-previa">
      ${lista.map((item) => `<div class="incidencia ${estadoRevisionClase(item.estado)}"><strong>${htmlSeguro(item.estado.toUpperCase())}.</strong> ${htmlSeguro(item.titulo)}<br><span>${htmlSeguro(item.detalle)}</span>${item.destino ? ` <button class="boton enlace" data-ir-revision="${htmlSeguro(item.destino)}">Ir</button>` : ''}</div>`).join('')}
    </div>`;
}

function pasosAsistente() {
  return [
    ['centro', 'Centro'],
    ['plantillas', 'Plantillas'],
    ['profesorado', 'Profesorado'],
    ['grupos', 'Grupos'],
    ['espacios', 'Espacios'],
    ['actividades', 'Actividades'],
    ['revision', 'Revisión']
  ];
}

function botonesPasosAsistente() {
  return `<div class="pasos-asistente">${pasosAsistente().map(([id, texto]) => `<button type="button" class="${id === pasoAsistente ? 'activo' : ''}" data-asistente-paso="${id}">${htmlSeguro(texto)}</button>`).join('')}</div>`;
}

function renderAsistenteCentro() {
  return `<section class="panel">
    <h2>1. Datos básicos del centro</h2>
    <p class="texto-suave">Este asistente no sustituye a las pantallas detalladas; evita empezar con un proyecto incoherente.</p>
    <div class="rejilla dos">
      ${campoTexto('as-centro-nombre', 'Nombre del centro', proyecto.centro.nombre === 'Centro sin nombre' ? '' : proyecto.centro.nombre)}
      <div class="campo"><label>Tipo de centro</label><select id="as-centro-tipo">${opcionesTexto(TIPOS_CENTRO, proyecto.centro.tipo)}</select></div>
      ${campoTexto('as-centro-curso', 'Curso académico', proyecto.centro.curso_academico)}
      <div class="campo"><label>Número de tramos diarios</label><select id="as-centro-tramos"><option value="5" ${proyecto.tramos.length === 5 ? 'selected' : ''}>5 tramos</option><option value="6" ${proyecto.tramos.length === 6 ? 'selected' : ''}>6 tramos</option><option value="7" ${proyecto.tramos.length === 7 ? 'selected' : ''}>7 tramos</option><option value="8" ${proyecto.tramos.length === 8 ? 'selected' : ''}>8 tramos</option></select></div>
    </div>
    <div class="acciones"><button class="boton primario" data-asistente-accion="aplicar-centro">Aplicar datos básicos</button><button class="boton" data-asistente-paso="profesorado">Siguiente: profesorado</button></div>
  </section>`;
}

function renderAsistentePlantillas() {
  return `<section class="panel">
    <h2>Plantillas sintéticas</h2>
    <p class="texto-suave">Cargan ejemplos completos sin datos reales. Si hay cambios sin guardar, la app pedirá confirmación antes de sustituir el proyecto.</p>
    <div class="acciones">
      <button class="boton" data-asistente-plantilla="CEIP">CEIP</button>
      <button class="boton" data-asistente-plantilla="IES">IES</button>
      <button class="boton" data-asistente-plantilla="CPI">CPI</button>
      <button class="boton" data-asistente-plantilla="CIFP">CIFP</button>
      <button class="boton" data-asistente-plantilla="CEE">CEE</button>
      <button class="boton" data-asistente-plantilla="COMPLEJO">Centro complejo sintético</button>
      <button class="boton primario" data-asistente-plantilla="EXIGENTE">Centro exigente sintético</button>
    </div>
  </section>`;
}

function renderAsistenteProfesorado() {
  return `<section class="panel">
    <h2>Añadir docente</h2>
    <div class="rejilla dos">
      ${campoTexto('as-docente-nombre', 'Nombre', '')}
      ${campoTexto('as-docente-departamento', 'Departamento / especialidad', '')}
      ${campoNumero('as-docente-lectivo', 'Objetivo lectivo', 0)}
      ${campoNumero('as-docente-dc', 'Objetivo DC', 0)}
      ${campoNumero('as-docente-permanencia', 'Objetivo permanencia', 0)}
      ${campoNumero('as-docente-maximo', 'Máximo total permitido', 25)}
    </div>
    <div class="acciones"><button class="boton primario" data-asistente-accion="anadir-docente">Añadir docente</button><button class="boton" data-asistente-paso="grupos">Siguiente: grupos</button></div>
    <p class="texto-suave">Docentes actuales: ${proyecto.personas.length}</p>
  </section>`;
}

function renderAsistenteGrupos() {
  return `<section class="panel">
    <h2>Añadir grupo, unidad o subgrupo</h2>
    <div class="rejilla dos">
      ${campoTexto('as-grupo-nombre', 'Nombre', '')}
      ${campoTexto('as-grupo-ensenanza', 'Enseñanza', '')}
      ${campoTexto('as-grupo-nivel', 'Nivel', '')}
      <div class="campo"><label>Grupo matriz, si es subgrupo</label><select id="as-grupo-matriz">${opciones(proyecto.grupos, '', 'Sin grupo matriz')}</select></div>
      <label class="campo"><span>Permitir uso paralelo como subgrupo</span><input type="checkbox" id="as-grupo-paralelo"></label>
    </div>
    <div class="acciones"><button class="boton primario" data-asistente-accion="anadir-grupo">Añadir grupo/unidad</button><button class="boton" data-asistente-paso="espacios">Siguiente: espacios</button></div>
    <p class="texto-suave">Grupos actuales: ${proyecto.grupos.length}</p>
  </section>`;
}

function renderAsistenteEspacios() {
  return `<section class="panel">
    <h2>Añadir espacio o zona</h2>
    <div class="rejilla dos">
      ${campoTexto('as-espacio-nombre', 'Nombre', '')}
      ${campoTexto('as-espacio-tipo', 'Tipo', 'Aula ordinaria')}
      ${campoTexto('as-espacio-capacidad', 'Capacidad', '')}
    </div>
    <div class="acciones"><button class="boton primario" data-asistente-accion="anadir-espacio">Añadir espacio</button><button class="boton" data-asistente-paso="actividades">Siguiente: actividades</button></div>
    <p class="texto-suave">Espacios actuales: ${proyecto.espacios.length}</p>
  </section>`;
}

function renderAsistenteActividades() {
  return `<section class="panel">
    <h2>Añadir actividad horaria</h2>
    <p class="texto-suave">Use este formulario para crear una actividad básica. Después puede afinar condiciones, disponibilidad o acompañantes en las pantallas detalladas.</p>
    <div class="rejilla dos">
      ${campoTexto('as-actividad-nombre', 'Nombre', '')}
      <div class="campo"><label>Tipo</label><select id="as-actividad-tipo">${opcionesTexto(TIPOS_ACTIVIDAD, 'Materia')}</select></div>
      <div class="campo"><label>Clasificación</label><select id="as-actividad-clasificacion">${opcionesTexto(CLASIFICACIONES_HORARIAS, 'Lectiva')}</select></div>
      <div class="campo"><label>Grupo/unidad/subgrupo</label><select id="as-actividad-grupo">${opciones(proyecto.grupos, '', 'Sin grupo')}</select></div>
      <div class="campo"><label>Docente responsable</label><select id="as-actividad-persona">${opciones(proyecto.personas, '', 'Elegir docente')}</select></div>
      <div class="campo"><label>Espacio</label><select id="as-actividad-espacio">${opciones(proyecto.espacios, '', 'Sin espacio')}</select></div>
      ${campoNumero('as-actividad-sesiones', 'Sesiones semanales', 1)}
      ${campoNumero('as-actividad-duracion', 'Duración en tramos', 1)}
      ${campoNumero('as-actividad-docentes-necesarios', 'Docentes necesarios', 1)}
      <label class="campo"><span>Requiere grupo</span><input type="checkbox" id="as-actividad-requiere-grupo" checked></label>
      <label class="campo"><span>Espacio obligatorio</span><input type="checkbox" id="as-actividad-requiere-espacio"></label>
    </div>
    <div class="acciones"><button class="boton primario" data-asistente-accion="anadir-actividad">Añadir actividad</button><button class="boton" data-asistente-paso="revision">Revisar proyecto</button></div>
    <p class="texto-suave">Actividades actuales: ${proyecto.actividades.length}</p>
  </section>`;
}

function renderAsistenteRevision() {
  const revision = revisarPreparacionProyecto(proyecto);
  return `<section class="panel">
    <h2>Revisión previa al cálculo</h2>
    ${renderResumenRevisionPrevia(false)}
    <div class="acciones"><button class="boton primario" data-asistente-accion="ir-calcular" ${revision.bloqueantes ? 'disabled' : ''}>Ir a calcular horario</button><button class="boton" data-accion="guardar-local">Guardar en este navegador</button><button class="boton" data-accion="exportar-json">Exportar proyecto</button></div>
  </section>`;
}

function renderAsistente() {
  const contenido = {
    centro: renderAsistenteCentro,
    plantillas: renderAsistentePlantillas,
    profesorado: renderAsistenteProfesorado,
    grupos: renderAsistenteGrupos,
    espacios: renderAsistenteEspacios,
    actividades: renderAsistenteActividades,
    revision: renderAsistenteRevision
  }[pasoAsistente] || renderAsistenteCentro;
  return `<section class="panel">
    <h1>Asistente de creación de centro</h1>
    <p class="texto-suave">Recorrido guiado para crear un proyecto mínimo coherente antes de calcular. Puede volver en cualquier momento a las pantallas detalladas.</p>
    ${mensaje}
    ${botonesPasosAsistente()}
  </section>
  <section class="panel"><h2>Estado del proyecto</h2>${renderResumenRevisionPrevia(true)}</section>
  ${contenido()}`;
}


function renderImportacionCsv() {
  const tipos = [
    ['personas', 'Docentes', 'Alta o actualización de profesorado y objetivos de carga.'],
    ['grupos', 'Grupos y subgrupos', 'Unidades, subgrupos de Religión/Atención educativa y agrupamientos.'],
    ['espacios', 'Espacios y zonas', 'Aulas, talleres, patios, zonas de entrada/salida o biblioteca.'],
    ['tramos', 'Tramos horarios', 'Inicio, fin, duración, tipo de tramo y si admite clase o servicios. Importar tramos vacía el horario colocado.'],
    ['actividades', 'Actividades horarias', 'Materias, LD, DC, servicios, guardias, docencia compartida y actividades no lectivas.']
  ];
  return `<section class="panel">
    <h1>Importación CSV y plantillas</h1>
    <p class="texto-suave">Use esta sección para preparar datos fuera de la app y cargarlos de forma controlada. El CSV debe estar en UTF-8 y usar punto y coma como separador. La importación actualiza por nombre si ya existe el dato.</p>
    ${mensaje}
    <div class="aviso advertencia"><strong>Recomendación:</strong> exporte antes el proyecto JSON. La importación puede modificar datos y, en el caso de tramos, vacía el horario colocado.</div>
  </section>
  <section class="panel">
    <h2>Plantillas descargables</h2>
    <div class="rejilla dos">
      ${tipos.map(([tipo, titulo, descripcion]) => `<div class="tarjeta">
        <h3>${htmlSeguro(titulo)}</h3>
        <p class="texto-suave">${htmlSeguro(descripcion)}</p>
        <button class="boton" data-plantilla-csv="${htmlSeguro(tipo)}">Descargar plantilla</button>
      </div>`).join('')}
    </div>
  </section>
  <section class="panel">
    <h2>Importar CSV</h2>
    <p class="texto-suave">Importe primero docentes, grupos, espacios y tramos. Después importe actividades, porque las actividades se vinculan por el nombre de docente, grupo y espacio.</p>
    <div class="rejilla dos">
      ${tipos.map(([tipo, titulo]) => `<div class="campo">
        <label>Importar ${htmlSeguro(titulo)}</label>
        <input type="file" accept=".csv,text/csv" data-importar-csv="${htmlSeguro(tipo)}">
      </div>`).join('')}
    </div>
  </section>
  <section class="panel">
    <h2>Campos principales</h2>
    <table><thead><tr><th>CSV</th><th>Columnas mínimas</th><th>Notas</th></tr></thead><tbody>
      <tr><td>Docentes</td><td>nombre</td><td>Puede incluir departamento, objetivos lectivos, DC, permanencia y máximo.</td></tr>
      <tr><td>Grupos</td><td>nombre</td><td>Para subgrupos, indique grupo_matriz y permite_paralelo=sí.</td></tr>
      <tr><td>Espacios</td><td>nombre</td><td>Use tipo para distinguir aula, taller, patio, zona, biblioteca, etc.</td></tr>
      <tr><td>Tramos</td><td>nombre</td><td>Puede incluir inicio, fin, duración, tipo_tramo, admite_clase y admite_servicios.</td></tr>
      <tr><td>Actividades</td><td>nombre, docente</td><td>Grupo, docente y espacio se resuelven por nombre. Los docentes acompañantes se separan con +.</td></tr>
    </tbody></table>
  </section>`;
}

function renderInicio() {
  return `<section class="panel">
    <h1>Inicio</h1>
    <p class="texto-suave">Cree un proyecto, introduzca los datos del centro, calcule un horario, revíselo manualmente y exporte los documentos necesarios.</p>
    ${resumenHtml()}
    ${mensaje}
    <div class="acciones" style="margin-top:1rem">
      <button class="boton primario" data-accion="nuevo-proyecto">Nuevo proyecto</button>
      <button class="boton" data-accion="abrir-asistente">Abrir asistente</button>
      <button class="boton" data-accion="guardar-local">Guardar en este navegador</button>
      <button class="boton" data-accion="recuperar-local">Recuperar guardado</button>
      <button class="boton" data-accion="recuperar-anterior">Recuperar copia anterior</button>
      <button class="boton" data-accion="recuperar-emergencia">Recuperar copia de emergencia</button>
      <button class="boton" data-accion="exportar-json">Exportar proyecto</button>
      <label class="boton" for="importar-json">Importar proyecto</label>
      <input class="oculto" id="importar-json" type="file" accept="application/json,.json">
    </div>
  </section>
  <section class="panel">
    <h2>Ejemplos sintéticos</h2>
    <p class="texto-suave">Sirven para probar la aplicación. No contienen datos reales.</p>
    <div class="acciones">
      <button class="boton" data-ejemplo="IES">Cargar ejemplo IES</button>
      <button class="boton" data-ejemplo="CEIP">Cargar ejemplo CEIP</button>
      <button class="boton" data-ejemplo="CPI">Cargar ejemplo CPI</button>
      <button class="boton" data-ejemplo="CIFP">Cargar ejemplo CIFP</button>
      <button class="boton" data-ejemplo="CEE">Cargar ejemplo CEE</button>
      <button class="boton" data-ejemplo="COMPLEJO">Cargar centro complejo sintético</button>
      <button class="boton primario" data-ejemplo="EXIGENTE">Cargar centro exigente sintético</button>
    </div>
  </section>`;
}

function renderDatos() {
  return `<section class="panel">
    <h1>Datos del centro</h1>
    ${mensaje}
    <div class="rejilla dos">
      ${campoTexto('centro-nombre', 'Nombre del centro', proyecto.centro.nombre)}
      <div class="campo"><label for="centro-tipo">Tipo de centro</label><select id="centro-tipo">${opcionesTexto(TIPOS_CENTRO, proyecto.centro.tipo)}</select></div>
      ${campoTexto('centro-curso', 'Curso académico', proyecto.centro.curso_academico)}
      <div class="campo"><label for="centro-descripcion">Observaciones</label><textarea id="centro-descripcion">${htmlSeguro(proyecto.centro.descripcion || '')}</textarea></div>
    </div>
    <div class="acciones"><button class="boton primario" data-accion="guardar-centro">Guardar datos del centro</button></div>
  </section>
  <section class="panel">
    <h2>Días y tramos horarios</h2>
    <p class="texto-suave">Defina también inicio, fin, duración y tipo. Las guardias no son tramos: son servicios colocados en tramos como entrada, recreo o salida.</p>
    <div class="acciones" style="margin-bottom:.8rem">
      <button class="boton" data-tramos="5">Usar 5 tramos</button>
      <button class="boton" data-tramos="6">Usar 6 tramos</button>
      <button class="boton" data-tramos="7">Usar 7 tramos</button>
    </div>
    <div class="rejilla dos">
      <div><h3>Días</h3>${ordenarPorOrden(proyecto.dias).map((dia) => campoTexto(`dia-${dia.id}`, `Día ${dia.orden}`, dia.nombre, `data-dia="${dia.id}"`)).join('')}</div>
      <div><h3>Tramos</h3>${ordenarPorOrden(proyecto.tramos).map((tramo) => `
        <div class="tarjeta compacta">
          ${campoTexto(`tramo-${tramo.id}`, `Tramo ${tramo.orden}`, tramo.nombre, `data-tramo="${tramo.id}"`)}
          <div class="rejilla dos">${campoTexto(`tramo-inicio-${tramo.id}`, 'Inicio', tramo.inicio || '', `data-tramo-inicio="${tramo.id}" placeholder="08:50"`)}${campoTexto(`tramo-fin-${tramo.id}`, 'Fin', tramo.fin || '', `data-tramo-fin="${tramo.id}" placeholder="09:40"`)}</div>
          <div class="rejilla dos">${campoNumero(`tramo-duracion-${tramo.id}`, 'Duración en minutos', tramo.duracion_minutos || 0, `data-tramo-duracion="${tramo.id}"`)}<div class="campo"><label>Tipo de tramo</label><select data-tramo-tipo="${tramo.id}">${opcionesTexto(TIPOS_TRAMO, tramo.tipo_tramo || 'Lectivo')}</select></div></div>
          <label class="campo"><span>Admite clase</span><input type="checkbox" data-tramo-admite-clase="${tramo.id}" ${tramo.admite_clase ? 'checked' : ''}></label>
          <label class="campo"><span>Admite servicios de centro</span><input type="checkbox" data-tramo-admite-servicios="${tramo.id}" ${tramo.admite_servicios ? 'checked' : ''}></label>
        </div>`).join('')}</div>
    </div>
    <div class="acciones"><button class="boton primario" data-accion="guardar-calendario">Guardar días y tramos</button></div>
  </section>`;
}

function renderColeccion(tipo) {
  const config = {
    profesorado: { titulo: 'Profesorado', lista: proyecto.personas, nuevo: 'Añadir docente', prefijo: 'persona' },
    grupos: { titulo: 'Grupos y unidades', lista: proyecto.grupos, nuevo: 'Añadir grupo', prefijo: 'grupo' },
    espacios: { titulo: 'Espacios', lista: proyecto.espacios, nuevo: 'Añadir espacio', prefijo: 'espacio' }
  }[tipo];
  return `<section class="panel">
    <h1>${config.titulo}</h1>
    ${mensaje}
    <div class="acciones" style="margin-bottom:1rem"><button class="boton primario" data-anadir="${tipo}">${config.nuevo}</button></div>
    <div class="tarjetas">${config.lista.map((item) => `
      <article class="tarjeta">
        <div class="campo"><label>Nombre</label><input data-campo="nombre" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.nombre)}"></div>
        ${tipo === 'profesorado' ? `<div class="campo"><label>Departamento / especialidad</label><input data-campo="departamento" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.departamento || '')}"></div><div class="rejilla dos">${campoNumero(`horas-lectivas-${item.id}`, 'Objetivo lectivo', item.horas_lectivas_objetivo || 0, `data-campo="horas_lectivas_objetivo" data-tipo="${tipo}" data-id="${item.id}"`)}${campoNumero(`horas-dc-${item.id}`, 'Objetivo DC', item.horas_dc_objetivo || 0, `data-campo="horas_dc_objetivo" data-tipo="${tipo}" data-id="${item.id}"`)}${campoNumero(`horas-permanencia-${item.id}`, 'Objetivo permanencia', item.horas_permanencia_objetivo || 0, `data-campo="horas_permanencia_objetivo" data-tipo="${tipo}" data-id="${item.id}"`)}${campoNumero(`horas-${item.id}`, 'Máximo total permitido', item.horas_maximas || 25, `data-campo="horas_maximas" data-tipo="${tipo}" data-id="${item.id}"`)}</div>` : ''}
        ${tipo === 'grupos' ? `<div class="campo"><label>Enseñanza</label><input data-campo="ensenanza" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.ensenanza || '')}"></div><div class="campo"><label>Nivel</label><input data-campo="nivel" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.nivel || '')}"></div><div class="campo"><label>Grupo matriz, si es subgrupo</label><select data-campo="grupo_matriz_id" data-tipo="${tipo}" data-id="${item.id}">${opciones(proyecto.grupos.filter((grupo) => grupo.id !== item.id), item.grupo_matriz_id || '', 'Sin grupo matriz')}</select></div><div class="campo"><label>Tipo de agrupamiento</label><input data-campo="tipo_agrupamiento" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.tipo_agrupamiento || 'Grupo')}"></div><label class="campo"><span>Permitir uso paralelo como subgrupo</span><input type="checkbox" data-campo="permite_paralelo_con_matriz" data-tipo="${tipo}" data-id="${item.id}" ${item.permite_paralelo_con_matriz ? 'checked' : ''}></label>` : ''}
        ${tipo === 'espacios' ? `<div class="campo"><label>Tipo de espacio</label><input data-campo="tipo" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.tipo || '')}"></div><div class="campo"><label>Capacidad</label><input data-campo="capacidad" data-tipo="${tipo}" data-id="${item.id}" value="${htmlSeguro(item.capacidad || '')}"></div>` : ''}
        <div class="campo"><label>Observaciones</label><textarea data-campo="observaciones" data-tipo="${tipo}" data-id="${item.id}">${htmlSeguro(item.observaciones || '')}</textarea></div>
        <div class="acciones"><button class="boton peligro pequeno" data-eliminar="${tipo}" data-id="${item.id}">Eliminar</button></div>
      </article>`).join('')}</div>
  </section>`;
}

function resumenCondicionesActividad(actividad) {
  const c = actividad.condiciones || nuevaActividad().condiciones;
  const partes = [];
  if (c.una_sesion_por_dia) partes.push('máximo una sesión al día');
  if (c.prohibir_ultima_hora) partes.push('sin última hora');
  if ((c.dias_prohibidos || []).length) partes.push(`${c.dias_prohibidos.length} día/s prohibido/s`);
  if ((c.tramos_prohibidos || []).length) partes.push(`${c.tramos_prohibidos.length} tramo/s prohibido/s`);
  if ((c.huecos_prohibidos || []).length) partes.push(`${c.huecos_prohibidos.length} hueco/s prohibido/s`);
  if ((c.dias_preferidos || []).length || (c.tramos_preferidos || []).length) partes.push('preferencias propias');
  return htmlSeguro(partes.length ? partes.join(' · ') : 'sin condiciones específicas');
}

function renderDocentesAcompanantes(actividad) {
  const seleccionados = new Set(actividad.docentes_acompanantes_ids || []);
  const disponibles = proyecto.personas.filter((persona) => persona.id !== actividad.persona_id);
  if (!disponibles.length) return '<p class="texto-suave">Añada más docentes para poder seleccionar acompañantes.</p>';
  return `<div class="lista-checkboxes">${disponibles.map((persona) => `<label class="opcion-lineal pequeno"><span>${htmlSeguro(persona.nombre)}</span><input type="checkbox" data-acompanante-actividad="${actividad.id}" value="${persona.id}" ${seleccionados.has(persona.id) ? 'checked' : ''}></label>`).join('')}</div>`;
}

function renderActividades() {
  return `<section class="panel">
    <h1>Actividades horarias</h1>
    <p class="texto-suave">Use “actividad” para materias, módulos, LD, docencia complementaria —guardias, tutorías de atención, coordinaciones, cargos o permanencias—, docencia compartida, Religión/Atención educativa y servicios de entrada, salida o recreo. Las actividades no lectivas pueden quedar sin grupo.</p>
    ${mensaje}
    <div class="acciones" style="margin-bottom:1rem"><button class="boton primario" data-anadir="actividades">Añadir actividad</button></div>
    <div class="tarjetas">${proyecto.actividades.map((actividad) => `
      <article class="tarjeta">
        <div class="campo"><label>Nombre</label><input data-campo="nombre" data-tipo="actividades" data-id="${actividad.id}" value="${htmlSeguro(actividad.nombre)}"></div>
        <div class="campo"><label>Tipo</label><select data-campo="tipo" data-tipo="actividades" data-id="${actividad.id}">${opcionesTexto(TIPOS_ACTIVIDAD, actividad.tipo)}</select></div>
        <div class="campo"><label>Clasificación horaria</label><select data-campo="clasificacion_horaria" data-tipo="actividades" data-id="${actividad.id}">${opcionesTexto(CLASIFICACIONES_HORARIAS, actividad.clasificacion_horaria || 'Lectiva')}</select></div>
        <label class="campo"><span>Requiere grupo, unidad o subgrupo</span><input type="checkbox" data-campo="requiere_grupo" data-tipo="actividades" data-id="${actividad.id}" ${actividad.requiere_grupo ? 'checked' : ''}></label>
        <div class="campo"><label>Grupo, unidad o subgrupo</label><select data-campo="grupo_id" data-tipo="actividades" data-id="${actividad.id}">${opciones(proyecto.grupos, actividad.grupo_id, 'Sin grupo')}</select></div>
        <div class="campo"><label>Docente responsable</label><select data-campo="persona_id" data-tipo="actividades" data-id="${actividad.id}">${opciones(proyecto.personas, actividad.persona_id, 'Elegir docente')}</select></div>
        <div class="campo"><label>Docentes acompañantes / cobertura adicional</label>${renderDocentesAcompanantes(actividad)}</div>
        ${campoNumero(`docentes-necesarios-${actividad.id}`, 'Docentes necesarios por sesión', actividad.docentes_necesarios || 1, `data-campo="docentes_necesarios" data-tipo="actividades" data-id="${actividad.id}"`)}
        <div class="campo"><label>Espacio preferente u obligatorio</label><select data-campo="espacio_id" data-tipo="actividades" data-id="${actividad.id}">${opciones(proyecto.espacios, actividad.espacio_id, 'Sin espacio asignado')}</select></div>
        <label class="campo"><span>El espacio es obligatorio</span><input type="checkbox" data-campo="requiere_espacio" data-tipo="actividades" data-id="${actividad.id}" ${actividad.requiere_espacio ? 'checked' : ''}></label>
        <div class="rejilla dos">
          <label class="campo"><span>Computa como lectivo</span><input type="checkbox" data-campo="computa_lectivo" data-tipo="actividades" data-id="${actividad.id}" ${actividad.computa_lectivo ? 'checked' : ''}></label>
          <label class="campo"><span>Computa como no lectivo / servicio</span><input type="checkbox" data-campo="computa_no_lectivo" data-tipo="actividades" data-id="${actividad.id}" ${actividad.computa_no_lectivo ? 'checked' : ''}></label>
        </div>
        ${campoNumero(`sesiones-${actividad.id}`, 'Sesiones semanales', actividad.sesiones_semanales, `data-campo="sesiones_semanales" data-tipo="actividades" data-id="${actividad.id}"`)}
        ${campoNumero(`duracion-${actividad.id}`, 'Duración de cada sesión en tramos consecutivos', actividad.duracion_tramos, `data-campo="duracion_tramos" data-tipo="actividades" data-id="${actividad.id}"`)}
        <p class="texto-suave resumen-condiciones">Condiciones: ${resumenCondicionesActividad(actividad)}</p>
        <div class="campo"><label>Observaciones</label><textarea data-campo="observaciones" data-tipo="actividades" data-id="${actividad.id}">${htmlSeguro(actividad.observaciones || '')}</textarea></div>
        <div class="acciones"><button class="boton peligro pequeno" data-eliminar="actividades" data-id="${actividad.id}">Eliminar</button></div>
      </article>`).join('')}</div>
  </section>`;
}

function renderDisponibilidad() {
  const lista = vistaDisponibilidad.tipo === 'persona' ? proyecto.personas : proyecto.espacios;
  if (!vistaDisponibilidad.entidad_id && lista[0]) vistaDisponibilidad.entidad_id = lista[0].id;
  const entidad = lista.find((x) => x.id === vistaDisponibilidad.entidad_id);
  if (entidad) asegurarDisponibilidad(entidad, proyecto);
  const dias = ordenarPorOrden(proyecto.dias);
  const tramos = ordenarPorOrden(proyecto.tramos);
  return `<section class="panel">
    <h1>Disponibilidad</h1>
    <p class="texto-suave">Marque cuándo una persona o un espacio no puede usarse. Verde significa disponible; rojo significa no disponible.</p>
    ${mensaje}
    <div class="rejilla dos">
      <div class="campo"><label>Tipo</label><select id="disp-tipo"><option value="persona" ${vistaDisponibilidad.tipo === 'persona' ? 'selected' : ''}>Profesorado</option><option value="espacio" ${vistaDisponibilidad.tipo === 'espacio' ? 'selected' : ''}>Espacios</option></select></div>
      <div class="campo"><label>Elemento</label><select id="disp-entidad">${opciones(lista, vistaDisponibilidad.entidad_id, 'Elegir')}</select></div>
    </div>
    ${entidad ? `<div class="tabla-scroll"><div class="disponibilidad" style="--columnas:${dias.length}">
      <div class="cab">Tramo</div>${dias.map((d) => `<div class="cab">${htmlSeguro(d.nombre)}</div>`).join('')}
      ${tramos.map((tramo) => `<div class="cab">${htmlSeguro(etiquetaTramo(tramo))}</div>${dias.map((dia) => {
        const clave = claveHueco(dia.id, tramo.id);
        const disponible = entidad.disponibilidad[clave] !== false;
        return `<button type="button" class="${disponible ? 'si' : 'no'}" data-disponibilidad="${clave}">${disponible ? 'Disponible' : 'No disponible'}</button>`;
      }).join('')}`).join('')}
    </div></div>` : '<div class="aviso advertencia">No hay elementos para editar.</div>'}
  </section>`;
}


function condicionesActividadActual() {
  if (!actividadCondicionSeleccionadaId && proyecto.actividades[0]) actividadCondicionSeleccionadaId = proyecto.actividades[0].id;
  const actividad = proyecto.actividades.find((item) => item.id === actividadCondicionSeleccionadaId) || null;
  if (actividad && !actividad.condiciones) actividad.condiciones = nuevaActividad().condiciones;
  return actividad;
}

function contieneValor(lista = [], valor) {
  return Array.isArray(lista) && lista.includes(valor);
}

function botonCondicionLista(lista, valor, texto, claseExtra = '') {
  const activo = contieneValor(lista, valor);
  return `<button type="button" class="boton-condicion ${activo ? 'activo' : ''} ${claseExtra}" data-condicion-lista="${htmlSeguro(valor)}">${htmlSeguro(texto)}</button>`;
}

function renderCondiciones() {
  const actividad = condicionesActividadActual();
  const dias = ordenarPorOrden(proyecto.dias);
  const tramos = ordenarPorOrden(proyecto.tramos);
  if (!proyecto.actividades.length) {
    return `<section class="panel"><h1>Condiciones</h1>${mensaje}<div class="aviso advertencia">Añada actividades antes de definir condiciones.</div></section>`;
  }
  const c = actividad.condiciones || nuevaActividad().condiciones;
  return `<section class="panel">
    <h1>Condiciones docentes</h1>
    <p class="texto-suave">Use esta pantalla para indicar reglas que el horario debe respetar. Las condiciones obligatorias bloquean colocaciones inválidas; las preferencias orientan el cálculo cuando hay varios huecos posibles.</p>
    ${mensaje}
    <div class="campo"><label>Actividad</label><select id="cond-actividad">${opciones(proyecto.actividades, actividad.id, 'Elegir actividad')}</select></div>
    <div class="rejilla dos">
      <label class="campo opcion-lineal"><span>Obligatoria: no colocar más de una sesión de esta actividad el mismo día</span><input type="checkbox" data-condicion-booleana="una_sesion_por_dia" ${c.una_sesion_por_dia ? 'checked' : ''}></label>
      <label class="campo opcion-lineal"><span>Obligatoria: no colocar esta actividad en la última hora del día</span><input type="checkbox" data-condicion-booleana="prohibir_ultima_hora" ${c.prohibir_ultima_hora ? 'checked' : ''}></label>
    </div>
    <div class="acciones"><button class="boton peligro" data-accion="limpiar-condiciones-actividad">Limpiar condiciones de esta actividad</button></div>
  </section>
  <section class="panel">
    <h2>Días y tramos</h2>
    <div class="rejilla dos">
      <div><h3>Días prohibidos</h3><div class="chips-condiciones" data-condicion-nombre="dias_prohibidos">${dias.map((dia) => botonCondicionLista(c.dias_prohibidos, dia.id, dia.nombre, 'prohibido')).join('')}</div></div>
      <div><h3>Días preferidos</h3><div class="chips-condiciones" data-condicion-nombre="dias_preferidos">${dias.map((dia) => botonCondicionLista(c.dias_preferidos, dia.id, dia.nombre, 'preferido')).join('')}</div></div>
      <div><h3>Tramos prohibidos</h3><div class="chips-condiciones" data-condicion-nombre="tramos_prohibidos">${tramos.map((tramo) => botonCondicionLista(c.tramos_prohibidos, tramo.id, tramo.nombre, 'prohibido')).join('')}</div></div>
      <div><h3>Tramos preferidos</h3><div class="chips-condiciones" data-condicion-nombre="tramos_preferidos">${tramos.map((tramo) => botonCondicionLista(c.tramos_preferidos, tramo.id, tramo.nombre, 'preferido')).join('')}</div></div>
    </div>
  </section>
  <section class="panel">
    <h2>Huecos prohibidos concretos</h2>
    <p class="texto-suave">Marque huecos concretos en los que esta actividad no puede colocarse. Esto sirve para restricciones puntuales.</p>
    <div class="tabla-scroll"><div class="disponibilidad matriz-condiciones" style="--columnas:${dias.length}">
      <div class="cab">Tramo</div>${dias.map((d) => `<div class="cab">${htmlSeguro(d.nombre)}</div>`).join('')}
      ${tramos.map((tramo) => `<div class="cab">${htmlSeguro(etiquetaTramo(tramo))}</div>${dias.map((dia) => {
        const clave = claveHueco(dia.id, tramo.id);
        const prohibido = contieneValor(c.huecos_prohibidos, clave);
        return `<button type="button" class="${prohibido ? 'no' : 'si'}" data-condicion-hueco="${htmlSeguro(clave)}">${prohibido ? 'Prohibido' : 'Permitido'}</button>`;
      }).join('')}`).join('')}
    </div></div>
  </section>`;
}

function renderCalcular() {
  const incidencias = validarHorario(proyecto);
  const resumen = resumenValidacion(incidencias);
  const graves = incidencias.filter((i) => i.nivel === 'grave').length;
  const revisionPrevia = revisarPreparacionProyecto(proyecto);
  return `<section class="panel">
    <h1>Calcular horario</h1>
    ${mensaje}
    <div class="aviso ${revisionPrevia.bloqueantes ? 'grave' : revisionPrevia.pendientes || revisionPrevia.avisos ? 'advertencia' : 'correcto'}">${htmlSeguro(resumenRevisionPrevia(revisionPrevia))}</div>
    <div class="aviso ${graves ? 'grave' : incidencias.length ? 'advertencia' : 'correcto'}">${htmlSeguro(resumen)}</div>
    ${resumenHtml()}
    ${renderDiagnosticoCoherenciaCarga()}
    <p class="texto-suave">El cálculo respeta las sesiones fijadas manualmente. El motor web avanzado trabaja en segundo plano, compara alternativas y conserva la mejor propuesta válida que encuentre.</p>
    ${renderProgresoCalculo()}
    <div class="acciones" style="margin-top:1rem">
      ${calculandoHorario ? '<button class="boton peligro" data-accion="cancelar-calculo">Cancelar cálculo</button>' : '<button class="boton primario" data-accion="calcular">Calcular horario</button>'}
      <button class="boton" data-accion="limpiar-no-fijas" ${calculandoHorario ? 'disabled' : ''}>Borrar sesiones no fijadas</button>
      <button class="boton" data-accion="validar">Validar ahora</button>
    </div>
  </section>
  <section class="panel"><h2>Incidencias actuales</h2>${renderIncidencias(incidencias)}</section>
  ${renderExplicacionesBloqueos()}`;
}


function renderProgresoCalculo() {
  if (!calculandoHorario || !progresoCalculo) return '';
  const colocadas = Number(progresoCalculo.colocadas || 0);
  const previstas = Number(progresoCalculo.previstas || resumenProyecto(proyecto).sesiones_previstas || 0);
  const porcentaje = previstas ? Math.min(100, Math.round((colocadas / previstas) * 100)) : 0;
  const detalle = progresoCalculo.mensaje || 'Calculando alternativa de horario';
  const pendientes = Number.isFinite(Number(progresoCalculo.pendientes)) ? ` · ${Number(progresoCalculo.pendientes)} pendientes` : '';
  return `<div class="aviso advertencia"><strong>Motor web avanzado en curso.</strong> ${htmlSeguro(detalle)}${pendientes}<div class="barra-progreso" aria-label="Progreso del cálculo"><span style="width:${porcentaje}%"></span></div><span class="texto-suave">${colocadas}/${previstas} sesiones colocadas en la mejor fase informada.</span></div>`;
}

function renderDiagnosticoCoherenciaCarga() {
  const auditoria = auditarCoherenciaCarga(proyecto);
  const clase = auditoria.avisos ? 'advertencia' : 'correcto';
  const filas = auditoria.registros.filter((r) => r.incidencias.length).slice(0, 8);
  const detalle = filas.length ? `<div class="tabla-scroll"><table><thead><tr><th>Docente</th><th>Lectivo obj/def/col</th><th>DC obj/def/col</th><th>Permanencia obj/def/col</th><th>Diagnóstico</th></tr></thead><tbody>${filas.map((r) => `<tr><td>${htmlSeguro(r.nombre)}</td><td>${r.objetivo_lectiva}/${r.previsto_lectiva}/${r.colocado_lectiva}</td><td>${r.objetivo_dc}/${r.previsto_dc}/${r.colocado_dc}</td><td>${r.objetivo_permanencia}/${r.previsto_permanencia}/${r.colocado_permanencia}</td><td>${htmlSeguro(r.incidencias.map((i) => i.mensaje).join(' · '))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="texto-suave">No se detectan desajustes entre actividades definidas y objetivos docentes configurados.</p>';
  return `<section class="aviso ${clase}"><strong>${htmlSeguro(resumenCoherenciaCarga(auditoria))}</strong><p class="texto-suave">Este diagnóstico no oculta avisos: separa horario completo de carga docente coherente. Lectura de columnas: objetivo / definido en actividades / colocado en horario.</p>${detalle}</section>`;
}

function renderIncidencias(incidencias) {
  if (!incidencias.length) return '<div class="aviso correcto">No se han detectado incidencias.</div>';
  return `<div class="lista-incidencias">${incidencias.map((i) => `<div class="incidencia ${i.nivel}"><strong>${i.nivel === 'grave' ? 'Error grave' : 'Aviso'}.</strong> ${htmlSeguro(i.mensaje)}</div>`).join('')}</div>`;
}

function renderExplicacionesBloqueos(compacto = false) {
  const explicacion = explicarBloqueosProyecto(proyecto);
  const clase = explicacion.bloqueos ? 'grave' : explicacion.avisos ? 'advertencia' : 'correcto';
  const items = compacto ? explicacion.items.slice(0, 5) : explicacion.items;
  const lista = items.length ? `<div class="lista-incidencias">${items.map((item) => `<div class="incidencia ${item.nivel === 'bloqueo' ? 'grave' : 'aviso'}"><strong>${htmlSeguro(item.actividad_nombre)}.</strong> ${htmlSeguro(item.diagnostico)}${item.contexto?.clasificacion ? `<br><span>${htmlSeguro(item.contexto.clasificacion)} · ${htmlSeguro(item.contexto.grupo || '')} · ${htmlSeguro(item.contexto.docentes || '')} · ${htmlSeguro(item.contexto.espacio || '')}</span>` : ''}<ul>${(item.causas || []).map((causa) => `<li><strong>${htmlSeguro(causa.causa)}</strong> ${htmlSeguro(causa.revisar)}${causa.ocurrencias ? ` <span class="texto-suave">(${causa.ocurrencias} hueco/s)</span>` : ''}</li>`).join('')}</ul></div>`).join('')}</div>` : '<div class="aviso correcto">No hay bloqueos pendientes que explicar.</div>';
  return `<section class="panel"><h2>Explicación de bloqueos</h2><div class="aviso ${clase}"><strong>${htmlSeguro(resumenExplicaciones(explicacion))}</strong></div><p class="texto-suave">Esta sección explica por qué una actividad no se puede colocar o qué revisar si queda pendiente. No sustituye a la validación: la complementa con lenguaje docente.</p>${lista}</section>`;
}

function sesionesEnCelda(modo, entidad_id, dia_id, tramo_id) {
  const campo = modo === 'persona' ? 'persona_id' : modo === 'espacio' ? 'espacio_id' : 'grupo_id';
  return proyecto.horario.filter((sesion) => {
    const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
    const idEntidad = sesion[campo] || actividad?.[campo] || '';
    if (campo === 'persona_id') return docentesDeSesion(proyecto, sesion).includes(entidad_id) && sesion.dia_id === dia_id && tramosCubiertos(proyecto, sesion).includes(tramo_id);
    return idEntidad === entidad_id && sesion.dia_id === dia_id && tramosCubiertos(proyecto, sesion).includes(tramo_id);
  });
}

function renderRevisar() {
  const coleccion = vistaRevision.modo === 'persona' ? proyecto.personas : vistaRevision.modo === 'espacio' ? proyecto.espacios : proyecto.grupos;
  if (!vistaRevision.entidad_id && coleccion[0]) vistaRevision.entidad_id = coleccion[0].id;
  const dias = ordenarPorOrden(proyecto.dias);
  const tramos = ordenarPorOrden(proyecto.tramos);
  const seleccionada = proyecto.horario.find((s) => s.id === sesionSeleccionadaId);
  const permisos = new Map(seleccionada ? huecosValidosParaSesion(proyecto, seleccionada.id).map((hueco) => [`${hueco.dia_id}__${hueco.tramo_id}`, hueco]) : []);
  return `<section class="panel">
    <h1>Revisar y ajustar</h1>
    ${mensaje}
    <div class="rejilla tres">
      <div class="campo"><label>Vista</label><select id="rev-modo"><option value="grupo" ${vistaRevision.modo === 'grupo' ? 'selected' : ''}>Por grupo</option><option value="persona" ${vistaRevision.modo === 'persona' ? 'selected' : ''}>Por docente</option><option value="espacio" ${vistaRevision.modo === 'espacio' ? 'selected' : ''}>Por espacio</option></select></div>
      <div class="campo"><label>Elemento</label><select id="rev-entidad">${opciones(coleccion, vistaRevision.entidad_id, 'Elegir')}</select></div>
      <div class="campo"><label>Sesión seleccionada</label><input readonly value="${htmlSeguro(seleccionada ? etiquetaSesionCorta(seleccionada) : 'Ninguna')}"></div>
    </div>
    <div class="acciones barra-editor">
      <button class="boton" data-accion="deshacer" ${pilaDeshacer.length ? '' : 'disabled'}>Deshacer</button>
      <button class="boton" data-accion="rehacer" ${pilaRehacer.length ? '' : 'disabled'}>Rehacer</button>
      <button class="boton" data-accion="validar">Validar ahora</button>
      <button class="boton" data-accion="cancelar-seleccion" ${sesionSeleccionadaId ? '' : 'disabled'}>Cancelar selección</button>
    </div>
    <p class="texto-suave">Seleccione una sesión con toque corto y pulse “Mover aquí” en un hueco permitido. Para salir de la edición pulse “Cancelar selección” o toque una zona vacía del horario. En ordenador también puede arrastrar.</p>
    <div class="tabla-scroll"><div class="horario editor-visual" style="--dias:${dias.length}">
      <div class="cab">Tramo</div>${dias.map((dia) => `<div class="cab">${htmlSeguro(dia.nombre)}</div>`).join('')}
      ${tramos.map((tramo) => `<div class="tramo">${htmlSeguro(etiquetaTramo(tramo))}</div>${dias.map((dia) => {
        const clave = `${dia.id}__${tramo.id}`;
        const permiso = permisos.get(clave);
        const claseDestino = seleccionada ? (permiso?.permitido ? 'destino-permitido' : 'destino-no-permitido') : '';
        const contenido = sesionesEnCelda(vistaRevision.modo, vistaRevision.entidad_id, dia.id, tramo.id).map((sesion) => renderSesionBoton(sesion)).join('');
        const accionDestino = seleccionada ? (permiso?.permitido
          ? `<button class="boton-destino" data-destino-dia="${dia.id}" data-destino-tramo="${tramo.id}">Mover aquí</button>`
          : `<span class="motivo-destino" title="${htmlSeguro(permiso?.mensaje || 'Movimiento no permitido')}">No permitido</span>`) : '';
        return `<div class="celda ${claseDestino}" data-celda-dia="${dia.id}" data-celda-tramo="${tramo.id}" title="${htmlSeguro(permiso?.mensaje || '')}">${contenido}${accionDestino}</div>`;
      }).join('')}`).join('')}
    </div></div>
  </section>
  <section class="panel">
    <h2>Ajuste manual</h2>
    ${seleccionada ? renderPanelMovimiento(seleccionada) : '<p class="texto-suave">Seleccione una sesión en el horario para moverla, fijarla o eliminarla.</p>'}
  </section>
  ${renderSesionesPendientes()}`;
}

function etiquetaSesionCorta(sesion) {
  const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
  return actividad?.nombre || 'Sesión';
}

function renderSesionBoton(sesion) {
  const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
  const grupo = obtenerNombrePorId(proyecto.grupos, sesion.grupo_id || actividad?.grupo_id, '');
  const persona = docentesDeSesion(proyecto, sesion).map((id) => obtenerNombrePorId(proyecto.personas, id, '')).filter(Boolean).join(' + ');
  const espacio = obtenerNombrePorId(proyecto.espacios, sesion.espacio_id || actividad?.espacio_id, '');
  const draggable = arrastreVisualPermitido() ? 'true' : 'false';
  return `<button class="sesion ${sesion.fija ? 'fija' : ''} ${sesion.id === sesionSeleccionadaId ? 'seleccionada' : ''}" draggable="${draggable}" data-sesion="${sesion.id}"><span class="nombre">${htmlSeguro(actividad?.nombre || 'Actividad')}</span><span class="detalle">${htmlSeguro(actividad?.clasificacion_horaria || 'Lectiva')} · ${htmlSeguro(grupo || 'Sin grupo')} · ${htmlSeguro(persona)} · ${htmlSeguro(espacio)}</span></button>`;
}

function renderPanelMovimiento(sesion) {
  const actividad = proyecto.actividades.find((a) => a.id === sesion.actividad_id);
  return `<div class="rejilla tres">
    <div class="campo"><label>Día</label><select id="mov-dia">${opciones(proyecto.dias, sesion.dia_id, 'Elegir día')}</select></div>
    <div class="campo"><label>Tramo inicial</label><select id="mov-tramo">${opciones(proyecto.tramos, sesion.tramo_id, 'Elegir tramo')}</select></div>
    <div class="campo"><label>Espacio</label><select id="mov-espacio">${opciones(proyecto.espacios, sesion.espacio_id || actividad?.espacio_id, 'Sin espacio')}</select></div>
  </div>
  <div class="acciones">
    <button class="boton primario" data-accion="mover-sesion">Mover si es válido</button>
    <button class="boton" data-accion="alternar-fija">${sesion.fija ? 'Dejar de fijar' : 'Fijar sesión'}</button>
    <button class="boton peligro" data-accion="eliminar-sesion">Eliminar sesión</button>
  </div>`;
}


function renderSesionesPendientes() {
  const pendientes = actividadesConSesionesPendientes(proyecto);
  if (!pendientes.length) {
    return `<section class="panel"><h2>Sesiones pendientes</h2><div class="aviso correcto">No hay sesiones pendientes.</div></section>`;
  }
  return `<section class="panel">
    <h2>Sesiones pendientes</h2>
    <p class="texto-suave">Puede pedir a la app que coloque una sesión pendiente en el primer hueco válido. Si no existe hueco, se explicará el bloqueo.</p>
    <div class="tarjetas compactas">${pendientes.map(({ actividad, colocadas, previstas, pendientes }) => `<article class="tarjeta pendiente">
      <h3>${htmlSeguro(actividad.nombre)}</h3>
      <p>${colocadas}/${previstas} colocadas · ${pendientes} pendiente/s</p>
      <div class="acciones"><button class="boton pequeno" data-crear-pendiente="${actividad.id}">Colocar una sesión</button></div>
    </article>`).join('')}</div>
  </section>`;
}



function renderResumenCalidadHorario() {
  const calidad = calcularCalidadHorario(proyecto);
  const r = calidad.resumen;
  const docentesConAvisos = calidad.docentes.filter((d) => d.huecos || d.ultimas_horas || d.avisos.length).slice(0, 8);
  const gruposConAvisos = calidad.grupos.filter((g) => g.huecos || g.ultimas_horas || g.avisos.length).slice(0, 8);
  return `<section class="panel">
    <h2>Calidad del horario</h2>
    <p class="texto-suave">Indicadores orientativos para revisar el horario: huecos del profesorado, últimas horas, reparto diario y distribución de DC/servicios. No sustituyen la revisión de jefatura.</p>
    <div class="resumen-carga">
      <article><strong>${textoNivelCalidad(r.nivel)}</strong><span>Nivel</span></article>
      <article><strong>${r.huecos_docentes}</strong><span>Huecos docentes</span></article>
      <article><strong>${r.huecos_grupos}</strong><span>Huecos de grupo</span></article>
      <article><strong>${r.ultimas_horas_docente}</strong><span>Últimas horas docentes</span></article>
      <article><strong>${r.reparto_servicios.diferencia}</strong><span>Diferencia servicios</span></article>
    </div>
    <div class="rejilla dos">
      <div><h3>Docentes a revisar</h3>${docentesConAvisos.length ? `<ul>${docentesConAvisos.map((d) => `<li><strong>${htmlSeguro(d.nombre)}</strong>: ${d.huecos} hueco/s, ${d.ultimas_horas} última/s hora/s${d.avisos.length ? ` · ${htmlSeguro(d.avisos.join(' · '))}` : ''}</li>`).join('')}</ul>` : '<p class="texto-suave">Sin alertas docentes básicas.</p>'}</div>
      <div><h3>Grupos a revisar</h3>${gruposConAvisos.length ? `<ul>${gruposConAvisos.map((g) => `<li><strong>${htmlSeguro(g.nombre)}</strong>: ${g.huecos} hueco/s, ${g.ultimas_horas} última/s hora/s${g.avisos.length ? ` · ${htmlSeguro(g.avisos.join(' · '))}` : ''}</li>`).join('')}</ul>` : '<p class="texto-suave">Sin alertas básicas de grupo.</p>'}</div>
    </div>
    <h3>Recomendaciones</h3>
    <ul>${calidad.recomendaciones.map((item) => `<li>${htmlSeguro(item)}</li>`).join('')}</ul>
  </section>`;
}

function renderResumenCargaDocente() {
  const resumen = resumenCargaDocente(proyecto);
  const registros = calcularCargaDocente(proyecto);
  return `<section class="panel">
    <h2>Carga docente y permanencia</h2>
    <p class="texto-suave">DC significa docencia complementaria: permanencia obligatoria sin impartir clase directa. Los servicios de entrada, salida, patio o recreo se muestran aparte como subconjunto cuando proceda.</p>
    <div class="resumen-carga">
      <article><strong>${resumen.lectiva}</strong><span>Lectivo (${resumen.lectiva_minutos || 0} min)</span></article>
      <article><strong>${resumen.dc}</strong><span>DC (${resumen.dc_minutos || 0} min)</span></article>
      <article><strong>${resumen.servicios}</strong><span>Servicios (${resumen.servicios_minutos || 0} min)</span></article>
      <article><strong>${resumen.no_lectiva}</strong><span>No lectivo adicional</span></article>
      <article><strong>${resumen.total_permanencia}</strong><span>Permanencia total (${resumen.total_permanencia_minutos || 0} min)</span></article>
    </div>
    <div class="tabla-scroll"><table><thead><tr><th>Docente</th><th>Lectivo</th><th>DC</th><th>Servicios</th><th>No lectivo</th><th>Permanencia</th><th>Minutos</th><th>Avisos</th></tr></thead><tbody>
      ${registros.map((r) => `<tr><td>${htmlSeguro(r.nombre)}</td><td>${r.lectiva}${r.objetivo_lectiva ? ` / ${r.objetivo_lectiva}` : ''}</td><td>${r.dc}${r.objetivo_dc ? ` / ${r.objetivo_dc}` : ''}</td><td>${r.servicios}</td><td>${r.no_lectiva}</td><td>${r.total_permanencia}${r.objetivo_permanencia ? ` / ${r.objetivo_permanencia}` : ''}</td><td>${r.total_permanencia_minutos || 0}</td><td>${r.incidencias.length ? htmlSeguro(r.incidencias.join(' · ')) : '—'}</td></tr>`).join('')}
    </tbody></table></div>
  </section>`;
}


function renderGestionDiaria() {
  const gestion = normalizarGestionDiaria(proyecto);
  proyecto.gestion_diaria = gestion;
  const resumen = resumenGestionDiaria(proyecto);
  const personaOpciones = opciones(proyecto.personas, '', 'Docente ausente');
  const diaOpciones = opciones(proyecto.dias, '', 'Día');
  const tramos = ordenarPorOrden(proyecto.tramos);
  const ausenciasHtml = gestion.ausencias.length ? gestion.ausencias.map((ausencia) => {
    const persona = obtenerNombrePorId(proyecto.personas, ausencia.persona_id, 'Sin docente');
    const dia = obtenerNombrePorId(proyecto.dias, ausencia.dia_id, 'Sin día');
    const tramosTexto = ausencia.tramo_ids?.length ? ausencia.tramo_ids.map((id) => obtenerNombrePorId(proyecto.tramos, id, id)).join(', ') : 'Jornada completa';
    const sesiones = sesionesAfectadasPorAusencia(proyecto, ausencia);
    const coberturas = gestion.coberturas.filter((c) => c.ausencia_id === ausencia.id);
    return `<article class="tarjeta">
      <h3>${htmlSeguro(persona)} · ${htmlSeguro(dia)}</h3>
      <p><strong>${htmlSeguro(ausencia.estado)}</strong> · ${htmlSeguro(tramosTexto)} · ${sesiones.length} sesión/es afectada/s · ${coberturas.length} cobertura/s</p>
      <p class="texto-suave">${htmlSeguro(ausencia.motivo || 'Sin motivo indicado')}</p>
      <div class="acciones">
        <button class="boton pequeno" data-gestion-accion="proponer-coberturas" data-id="${htmlSeguro(ausencia.id)}">Proponer coberturas</button>
        <button class="boton pequeno" data-gestion-accion="cerrar-ausencia" data-id="${htmlSeguro(ausencia.id)}">Cerrar ausencia</button>
        <button class="boton pequeno peligro" data-gestion-accion="eliminar-ausencia" data-id="${htmlSeguro(ausencia.id)}">Eliminar</button>
      </div>
    </article>`;
  }).join('') : '<div class="aviso correcto">No hay ausencias registradas.</div>';
  const coberturasHtml = gestion.coberturas.length ? `<div class="tabla-scroll"><table><thead><tr><th>Estado</th><th>Sesión</th><th>Docente de cobertura</th><th>Observaciones</th><th>Acciones</th></tr></thead><tbody>${gestion.coberturas.map((c) => {
    const sesion = proyecto.horario.find((s) => s.id === c.sesion_id);
    const actividad = proyecto.actividades.find((a) => a.id === sesion?.actividad_id);
    const docente = obtenerNombrePorId(proyecto.personas, c.docente_id, c.estado === 'Sin cubrir' ? 'Sin cubrir' : 'Sin docente asignado');
    return `<tr>
      <td>${htmlSeguro(c.estado)}</td>
      <td>${htmlSeguro(actividad?.nombre || 'Sesión no localizada')}</td>
      <td>${htmlSeguro(docente)}</td>
      <td>${htmlSeguro(c.observaciones || '')}</td>
      <td><button class="boton pequeno" data-gestion-accion="confirmar-cobertura" data-id="${htmlSeguro(c.id)}">Confirmar</button> <button class="boton pequeno" data-gestion-accion="sin-cubrir" data-id="${htmlSeguro(c.id)}">Sin cubrir</button></td>
    </tr>`;
  }).join('')}</tbody></table></div>` : '<div class="aviso advertencia">Todavía no hay coberturas propuestas o registradas.</div>';
  const incidenciasHtml = gestion.incidencias.length ? `<ul>${gestion.incidencias.map((i) => `<li><strong>${htmlSeguro(i.tipo)}</strong> · ${htmlSeguro(obtenerNombrePorId(proyecto.dias, i.dia_id, 'Sin día'))}: ${htmlSeguro(i.descripcion)} <span class="texto-suave">(${htmlSeguro(i.estado)})</span></li>`).join('')}</ul>` : '<p class="texto-suave">Sin incidencias registradas.</p>';
  return `<section class="panel">
    <h1>Gestión diaria</h1>
    ${mensaje}
    <p class="texto-suave">Registre ausencias, proponga coberturas y deje constancia de incidencias sin modificar el horario semanal base. Las coberturas son una capa diaria separada.</p>
    <div class="resumen-carga">
      <article><strong>${resumen.ausencias}</strong><span>Ausencias</span></article>
      <article><strong>${resumen.sesiones_afectadas}</strong><span>Sesiones afectadas</span></article>
      <article><strong>${resumen.coberturas}</strong><span>Coberturas</span></article>
      <article><strong>${resumen.sin_cubrir}</strong><span>Sin cubrir</span></article>
      <article><strong>${resumen.incidencias}</strong><span>Incidencias</span></article>
    </div>
  </section>
  <section class="panel">
    <h2>Registrar ausencia</h2>
    <div class="rejilla tres">
      <div class="campo"><label>Docente</label><select id="gd-ausencia-persona">${personaOpciones}</select></div>
      <div class="campo"><label>Día</label><select id="gd-ausencia-dia">${diaOpciones}</select></div>
      <div class="campo"><label>Motivo</label><input id="gd-ausencia-motivo" placeholder="Ej.: enfermedad, permiso, salida..."></div>
    </div>
    <p class="texto-suave">Si no marca tramos, la ausencia se considera de jornada completa para ese día.</p>
    <div class="chips">${tramos.map((tramo) => `<label class="chip"><input type="checkbox" data-gd-ausencia-tramo value="${htmlSeguro(tramo.id)}"> ${htmlSeguro(etiquetaTramo(tramo))}</label>`).join('')}</div>
    <div class="acciones"><button class="boton primario" data-gestion-accion="registrar-ausencia">Registrar ausencia</button></div>
  </section>
  <section class="panel"><h2>Ausencias</h2><div class="tarjetas compactas">${ausenciasHtml}</div></section>
  <section class="panel"><h2>Coberturas propuestas/registradas</h2>${coberturasHtml}</section>
  <section class="panel">
    <h2>Registrar incidencia</h2>
    <div class="rejilla tres">
      <div class="campo"><label>Día</label><select id="gd-incidencia-dia">${diaOpciones}</select></div>
      <div class="campo"><label>Tipo</label><select id="gd-incidencia-tipo">${opcionesTexto(TIPOS_INCIDENCIA_DIARIA, 'Observación')}</select></div>
      <div class="campo"><label>Descripción</label><input id="gd-incidencia-descripcion" placeholder="Descripción breve"></div>
    </div>
    <div class="acciones"><button class="boton" data-gestion-accion="registrar-incidencia">Registrar incidencia</button></div>
    ${incidenciasHtml}
  </section>`;
}

function renderDocumentos() {
  return `<section class="panel">
    <h1>Documentos y exportaciones</h1>
    ${mensaje}
    <p class="texto-suave">Exporte copias del proyecto, horarios imprimibles, carga lectiva/DC/servicios e informes de validación.</p>
    <div class="acciones">
      <button class="boton primario" data-accion="exportar-json">Exportar proyecto JSON</button>
      <button class="boton" data-accion="csv-grupos">CSV por grupos</button>
      <button class="boton" data-accion="csv-docentes">CSV por docentes</button>
      <button class="boton" data-accion="csv-espacios">CSV por espacios</button>
      <button class="boton" data-accion="csv-carga-docente">CSV carga docente</button>
      <button class="boton" data-accion="csv-calidad-horario">CSV calidad del horario</button>
      <button class="boton" data-accion="csv-gestion-diaria">CSV gestión diaria</button>
      <button class="boton" data-accion="html-grupos">HTML imprimible por grupos</button>
      <button class="boton" data-accion="html-docentes">HTML imprimible por docentes</button>
      <button class="boton" data-accion="informe-carga-docente">Informe de carga docente</button>
      <button class="boton" data-accion="informe-coherencia-carga">Informe de coherencia de carga</button>
      <button class="boton" data-accion="informe-calidad-horario">Informe de calidad</button>
      <button class="boton" data-accion="informe-gestion-diaria">Informe de gestión diaria</button>
      <button class="boton" data-accion="informe-bloqueos">Informe de bloqueos</button>
      <button class="boton" data-accion="informe-validacion">Informe de validación</button>
    </div>
  </section>
  ${renderResumenCargaDocente()}
  ${renderResumenCalidadHorario()}
  ${renderExplicacionesBloqueos(true)}`;
}

function renderMantenimiento() {
  const incidencias = validarHorario(proyecto);
  return `<section class="panel">
    <h1>Mantenimiento avanzado</h1>
    <p class="texto-suave">Sección para comprobaciones, versión y diagnóstico. No es necesaria para el uso ordinario.</p>
    ${mensaje}
    <div class="tabla-scroll"><table><tbody>
      <tr><th>Versión de la aplicación</th><td>${VERSION_APLICACION}</td></tr>
      <tr><th>Formato del proyecto</th><td>${htmlSeguro(proyecto.version_formato)}</td></tr>
      <tr><th>Última modificación</th><td>${htmlSeguro(proyecto.metadatos?.modificado || '')}</td></tr>
      <tr><th>Resumen</th><td>${JSON.stringify(resumenProyecto(proyecto))}</td></tr>
    </tbody></table></div>
  </section>
  <section class="panel"><h2>Comprobación completa</h2>${renderIncidencias(incidencias)}</section>`;
}

function renderizar() {
  try {
    renderizarNavegacion();
    renderizarEstado();
    const mapas = {
      inicio: renderInicio,
      asistente: renderAsistente,
      datos: renderDatos,
      profesorado: () => renderColeccion('profesorado'),
      grupos: () => renderColeccion('grupos'),
      espacios: () => renderColeccion('espacios'),
      actividades: renderActividades,
      disponibilidad: renderDisponibilidad,
      condiciones: renderCondiciones,
      calcular: renderCalcular,
      revisar: renderRevisar,
      'gestion-diaria': renderGestionDiaria,
      documentos: renderDocumentos,
      mantenimiento: renderMantenimiento
    };
    const renderizador = mapas[seccionActual] || renderInicio;
    app.innerHTML = renderizador();
    enlazarEventos();
  } catch (error) {
    guardarEmergencia('fallo_renderizado');
    app.innerHTML = `<section class="panel"><h1>Protección de edición</h1><div class="aviso grave">Se ha detenido la reconstrucción de pantalla para proteger los datos: ${htmlSeguro(error?.message || String(error))}</div><div class="acciones"><button class="boton primario" onclick="location.reload()">Recargar página</button></div><p class="texto-suave">Después de recargar, use “Recuperar copia de emergencia” si el proyecto no aparece como esperaba.</p></section>`;
  }
}

function obtenerLista(tipo) {
  if (tipo === 'profesorado') return proyecto.personas;
  if (tipo === 'grupos') return proyecto.grupos;
  if (tipo === 'espacios') return proyecto.espacios;
  if (tipo === 'actividades') return proyecto.actividades;
  return [];
}

function actualizarCampo(tipo, id, campo, valor, esCheckbox = false) {
  const item = obtenerLista(tipo).find((x) => x.id === id);
  if (!item) return;
  if (esCheckbox) item[campo] = Boolean(valor);
  else if (['sesiones_semanales', 'duracion_tramos', 'horas_maximas', 'docentes_necesarios'].includes(campo)) item[campo] = Math.max(0, Number(valor) || 0);
  else item[campo] = valor;
  if (tipo === 'actividades' && campo === 'persona_id') item.docentes_acompanantes_ids = (item.docentes_acompanantes_ids || []).filter((idDocente) => idDocente !== valor);
  if (tipo === 'actividades' && campo === 'clasificacion_horaria') {
    if (valor === 'Lectiva') { item.requiere_grupo = true; item.computa_lectivo = true; item.computa_no_lectivo = false; }
    if (valor === 'Docencia complementaria') { item.requiere_grupo = false; item.computa_lectivo = false; item.computa_no_lectivo = true; }
    if (valor === 'No lectiva') { item.requiere_grupo = false; item.computa_lectivo = false; item.computa_no_lectivo = true; }
    if (valor === 'Servicio de centro') { item.requiere_grupo = false; item.computa_lectivo = false; item.computa_no_lectivo = true; }
  }
  marcarModificado();
}

async function calcularHorario() {
  if (calculandoHorario) {
    avisar('Ya hay un cálculo en curso. Puede cancelarlo antes de iniciar otro.', 'advertencia');
    return;
  }
  const revision = revisarPreparacionProyecto(proyecto);
  if (revision.bloqueantes && !confirmarAccion(`${resumenRevisionPrevia(revision)}\n\n¿Quiere calcular igualmente?`)) {
    avisar('Cálculo cancelado. Revise el asistente antes de calcular.', 'advertencia');
    return;
  }
  if (!confirmarSustitucionHorario()) {
    avisar('Cálculo cancelado. El horario actual se conserva.', 'advertencia');
    return;
  }
  limpiarSeleccionTemporal();
  const copiaAntes = clonar(proyecto);
  numeroCalculo += 1;
  const idCalculo = numeroCalculo;
  calculandoHorario = true;
  progresoCalculo = { fase: 'inicio', colocadas: 0, previstas: resumenProyecto(proyecto).sesiones_previstas, mensaje: 'Preparando cálculo en segundo plano' };
  mensaje = '<div class="aviso advertencia">Calculando horario con motor web avanzado. Puede cancelar el cálculo sin modificar el horario actual.</div>';
  renderizar();
  const opciones = { limite_ms: 7000, intentos: 220 };
  try {
    const resultado = await calcularConTrabajador(proyecto, opciones, idCalculo);
    if (idCalculo !== numeroCalculo) return;
    registrarCambioEdicion();
    proyecto.horario = resultado.horario;
    marcarModificado();
    sesionSeleccionadaId = '';
    calculandoHorario = false;
    progresoCalculo = null;
    calculoActivo = null;
    avisar(resultado.mensaje, resultado.estado === 'COMPLETO' ? 'correcto' : 'advertencia');
  } catch (error) {
    calculandoHorario = false;
    progresoCalculo = null;
    calculoActivo = null;
    if (error?.message === 'CALCULO_CANCELADO') {
      proyecto = normalizarProyecto(copiaAntes);
      sesionSeleccionadaId = '';
      avisar('Cálculo cancelado. El horario anterior se conserva sin cambios.', 'advertencia');
      return;
    }
    try {
      const resultado = generarHorario(proyecto, { limite_ms: 1200, intentos: 35 });
      registrarCambioEdicion();
      proyecto.horario = resultado.horario;
      marcarModificado();
      sesionSeleccionadaId = '';
      avisar(`${resultado.mensaje} Aviso: se usó cálculo corto porque el cálculo en segundo plano no respondió.`, resultado.estado === 'COMPLETO' ? 'correcto' : 'advertencia');
    } catch (fallo) {
      proyecto = normalizarProyecto(copiaAntes);
      avisar(`No se pudo calcular el horario: ${fallo?.message || error?.message || 'error desconocido'}`, 'grave');
    }
  }
}

function cancelarCalculo() {
  if (!calculoActivo) {
    calculandoHorario = false;
    avisar('No hay ningún cálculo en curso.', 'advertencia');
    return;
  }
  calculoActivo.cancelado = true;
  try { calculoActivo.trabajador?.terminate(); } catch (_) { /* no bloqueante */ }
  const rechazar = calculoActivo.rechazar;
  calculoActivo = null;
  calculandoHorario = false;
  progresoCalculo = null;
  if (rechazar) rechazar(new Error('CALCULO_CANCELADO'));
}

function calcularConTrabajador(proyecto, opciones, idCalculo) {
  return new Promise((resolver, rechazar) => {
    let terminado = false;
    let trabajador;
    try {
      trabajador = new Worker(new URL('./motor/trabajador_generacion.js', import.meta.url), { type: 'module' });
    } catch (error) {
      rechazar(error);
      return;
    }
    calculoActivo = { id: idCalculo, trabajador, rechazar, cancelado: false };
    const temporizador = setTimeout(() => {
      if (!terminado && calculoActivo?.id === idCalculo) {
        terminado = true;
        try { trabajador.terminate(); } catch (_) { /* no bloqueante */ }
        calculoActivo = null;
        rechazar(new Error('No se pudo usar el cálculo en segundo plano.'));
      }
    }, 9000);
    trabajador.onmessage = (evento) => {
      if (calculoActivo?.id !== idCalculo) return;
      if (evento.data?.tipo === 'progreso') {
        progresoCalculo = evento.data.progreso || progresoCalculo;
        renderizar();
        return;
      }
      terminado = true;
      clearTimeout(temporizador);
      try { trabajador.terminate(); } catch (_) { /* no bloqueante */ }
      calculoActivo = null;
      if (evento.data?.correcto) resolver(evento.data.resultado);
      else rechazar(new Error(evento.data?.error || 'No se pudo calcular.'));
    };
    trabajador.onerror = (error) => {
      if (calculoActivo?.id !== idCalculo) return;
      terminado = true;
      clearTimeout(temporizador);
      try { trabajador.terminate(); } catch (_) { /* no bloqueante */ }
      calculoActivo = null;
      rechazar(error);
    };
    trabajador.postMessage({ proyecto, opciones });
  });
}

function cambiosDesdeVista(dia_id, tramo_id, espacio_id = undefined) {
  const sesion = proyecto.horario.find((s) => s.id === sesionSeleccionadaId);
  const actividad = proyecto.actividades.find((a) => a.id === sesion?.actividad_id);
  let espacio = espacio_id;
  if (espacio === undefined) {
    espacio = vistaRevision.modo === 'espacio' && vistaRevision.entidad_id ? vistaRevision.entidad_id : (sesion?.espacio_id || actividad?.espacio_id || '');
  }
  return { dia_id, tramo_id, espacio_id: espacio };
}

function aplicarMovimientoSeguro(cambios) {
  const sesion = proyecto.horario.find((s) => s.id === sesionSeleccionadaId);
  if (!sesion) return;
  const resultado = aplicarMovimientoSesion(proyecto, sesion.id, cambios);
  if (!resultado.correcto) {
    avisar(`No se ha movido la sesión: ${resultado.mensaje}`, 'grave');
    return;
  }
  registrarCambioEdicion();
  proyecto = normalizarProyecto(resultado.proyecto);
  marcarModificado();
  sesionSeleccionadaId = '';
  avisar(`${resultado.mensaje} Selección cancelada.`, 'correcto');
}

function moverSesionSeleccionada() {
  const sesion = proyecto.horario.find((s) => s.id === sesionSeleccionadaId);
  if (!sesion) return;
  aplicarMovimientoSeguro(cambiosDesdeVista(
    document.querySelector('#mov-dia').value,
    document.querySelector('#mov-tramo').value,
    document.querySelector('#mov-espacio').value
  ));
}

function moverSesionAHueco(dia_id, tramo_id) {
  if (!sesionSeleccionadaId) return;
  aplicarMovimientoSeguro(cambiosDesdeVista(dia_id, tramo_id));
}

function colocarSesionPendiente(actividadId) {
  registrarCambioEdicion();
  const resultado = crearSesionPendiente(proyecto, actividadId);
  if (!resultado.correcto) {
    pilaDeshacer.pop();
    avisar(resultado.mensaje, 'grave');
    return;
  }
  proyecto = normalizarProyecto(resultado.proyecto);
  marcarModificado();
  avisar(resultado.mensaje, 'correcto');
}

async function guardarProyectoEnNavegador() {
  const r = await guardarProyectoLocal(proyecto);
  if (r.correcto) marcarGuardado();
  avisar(r.mensaje, r.correcto ? 'correcto' : 'grave');
}

async function recuperarProyectoGuardado(anterior = false) {
  const texto = anterior
    ? 'Va a recuperar la copia anterior guardada y sustituir el proyecto actual. ¿Continuar?'
    : 'Va a recuperar el proyecto guardado en este navegador. ¿Continuar?';
  if (!confirmarRecuperacion(texto)) {
    avisar('Recuperación cancelada. El proyecto actual se conserva.', 'advertencia');
    return;
  }
  const r = anterior ? await recuperarCopiaAnteriorLocal() : await recuperarProyectoLocal();
  if (r.correcto) {
    registrarCambioEdicion();
    proyecto = normalizarProyecto(r.proyecto);
    sesionSeleccionadaId = '';
    cambiosPendientes = false;
  }
  avisar(r.mensaje, r.correcto ? 'correcto' : 'advertencia');
}

function recuperarProyectoEmergencia() {
  if (!confirmarRecuperacion('Va a recuperar la copia de emergencia y sustituir el proyecto actual. ¿Continuar?')) {
    avisar('Recuperación cancelada. El proyecto actual se conserva.', 'advertencia');
    return;
  }
  const r = recuperarCopiaEmergenciaLocal();
  if (r.correcto) {
    registrarCambioEdicion();
    proyecto = normalizarProyecto(r.proyecto);
    sesionSeleccionadaId = '';
    cambiosPendientes = true;
  }
  avisar(r.mensaje, r.correcto ? 'correcto' : 'advertencia');
}

function exportarJson() {
  const nombre = `${nombreSeguro(proyecto.centro.nombre)}_horario.json`;
  descargarTexto(nombre, exportarProyectoJSON(proyecto), 'application/json;charset=utf-8');
}

function abrirHtmlImprimible(modo) {
  const html = generarHtmlImprimible(proyecto, modo);
  const nombre = `${nombreSeguro(proyecto.centro.nombre)}_${modo}.html`;
  descargarTexto(nombre, html, 'text/html;charset=utf-8');
}

function aplicarCentroDesdeAsistente() {
  registrarCambioEdicion();
  proyecto.centro.nombre = document.querySelector('#as-centro-nombre')?.value.trim() || 'Centro sin nombre';
  proyecto.centro.tipo = document.querySelector('#as-centro-tipo')?.value || proyecto.centro.tipo;
  proyecto.centro.curso_academico = document.querySelector('#as-centro-curso')?.value.trim() || proyecto.centro.curso_academico;
  const totalTramos = Number(document.querySelector('#as-centro-tramos')?.value || proyecto.tramos.length || 6);
  if (totalTramos !== proyecto.tramos.length && confirmarAccion('Cambiar el número de tramos puede dejar sesiones existentes fuera de lugar. ¿Continuar?')) {
    proyecto.tramos = crearTramosBase(totalTramos);
    proyecto.horario = [];
  }
  proyecto = normalizarProyecto(proyecto);
  marcarModificado();
  pasoAsistente = 'profesorado';
  avisar('Datos básicos aplicados. Continúe con el profesorado.', 'correcto');
}

function anadirDocenteDesdeAsistente() {
  const nombre = document.querySelector('#as-docente-nombre')?.value.trim() || '';
  registrarCambioEdicion();
  const persona = asegurarDisponibilidad(nuevaPersona(nombre || 'Nueva persona'), proyecto);
  persona.departamento = document.querySelector('#as-docente-departamento')?.value.trim() || '';
  persona.horas_lectivas_objetivo = Number(document.querySelector('#as-docente-lectivo')?.value || 0);
  persona.horas_dc_objetivo = Number(document.querySelector('#as-docente-dc')?.value || 0);
  persona.horas_permanencia_objetivo = Number(document.querySelector('#as-docente-permanencia')?.value || 0);
  persona.horas_maximas = Number(document.querySelector('#as-docente-maximo')?.value || 25);
  proyecto.personas.push(persona);
  proyecto = normalizarProyecto(proyecto);
  marcarModificado();
  avisar(`Docente “${persona.nombre}” añadido.`, 'correcto');
}

function anadirGrupoDesdeAsistente() {
  const nombre = document.querySelector('#as-grupo-nombre')?.value.trim() || '';
  registrarCambioEdicion();
  const grupo = nuevoGrupo(nombre || 'Nuevo grupo');
  grupo.ensenanza = document.querySelector('#as-grupo-ensenanza')?.value.trim() || '';
  grupo.nivel = document.querySelector('#as-grupo-nivel')?.value.trim() || '';
  grupo.grupo_matriz_id = document.querySelector('#as-grupo-matriz')?.value || '';
  grupo.tipo_agrupamiento = grupo.grupo_matriz_id ? 'Subgrupo' : 'Grupo';
  grupo.permite_paralelo_con_matriz = Boolean(document.querySelector('#as-grupo-paralelo')?.checked);
  proyecto.grupos.push(grupo);
  proyecto = normalizarProyecto(proyecto);
  marcarModificado();
  avisar(`Grupo/unidad “${grupo.nombre}” añadido.`, 'correcto');
}

function anadirEspacioDesdeAsistente() {
  const nombre = document.querySelector('#as-espacio-nombre')?.value.trim() || '';
  registrarCambioEdicion();
  const espacio = asegurarDisponibilidad(nuevoEspacio(nombre || 'Nuevo espacio'), proyecto);
  espacio.tipo = document.querySelector('#as-espacio-tipo')?.value.trim() || 'Aula ordinaria';
  espacio.capacidad = document.querySelector('#as-espacio-capacidad')?.value.trim() || '';
  proyecto.espacios.push(espacio);
  proyecto = normalizarProyecto(proyecto);
  marcarModificado();
  avisar(`Espacio “${espacio.nombre}” añadido.`, 'correcto');
}

function anadirActividadDesdeAsistente() {
  const nombre = document.querySelector('#as-actividad-nombre')?.value.trim() || '';
  registrarCambioEdicion();
  const actividad = nuevaActividad(nombre || 'Nueva actividad');
  actividad.tipo = document.querySelector('#as-actividad-tipo')?.value || 'Materia';
  actividad.clasificacion_horaria = document.querySelector('#as-actividad-clasificacion')?.value || 'Lectiva';
  actividad.grupo_id = document.querySelector('#as-actividad-grupo')?.value || '';
  actividad.persona_id = document.querySelector('#as-actividad-persona')?.value || '';
  actividad.espacio_id = document.querySelector('#as-actividad-espacio')?.value || '';
  actividad.sesiones_semanales = Math.max(0, Number(document.querySelector('#as-actividad-sesiones')?.value || 1));
  actividad.duracion_tramos = Math.max(1, Number(document.querySelector('#as-actividad-duracion')?.value || 1));
  actividad.docentes_necesarios = Math.max(1, Number(document.querySelector('#as-actividad-docentes-necesarios')?.value || 1));
  actividad.requiere_grupo = Boolean(document.querySelector('#as-actividad-requiere-grupo')?.checked);
  actividad.requiere_espacio = Boolean(document.querySelector('#as-actividad-requiere-espacio')?.checked);
  if (actividad.clasificacion_horaria !== 'Lectiva') {
    actividad.computa_lectivo = false;
    actividad.computa_no_lectivo = true;
  }
  proyecto.actividades.push(actividad);
  proyecto = normalizarProyecto(proyecto);
  marcarModificado();
  avisar(`Actividad “${actividad.nombre}” añadida.`, 'correcto');
}

function ejecutarAccionAsistente(accion) {
  if (accion === 'aplicar-centro') aplicarCentroDesdeAsistente();
  if (accion === 'anadir-docente') anadirDocenteDesdeAsistente();
  if (accion === 'anadir-grupo') anadirGrupoDesdeAsistente();
  if (accion === 'anadir-espacio') anadirEspacioDesdeAsistente();
  if (accion === 'anadir-actividad') anadirActividadDesdeAsistente();
  if (accion === 'ir-calcular') {
    const revision = revisarPreparacionProyecto(proyecto);
    if (revision.bloqueantes) { avisar('Hay bloqueos que deben revisarse antes de calcular.', 'grave'); return; }
    cambiarSeccion('calcular');
  }
}


function registrarAusenciaDesdeGestionDiaria() {
  const persona_id = document.querySelector('#gd-ausencia-persona')?.value || '';
  const dia_id = document.querySelector('#gd-ausencia-dia')?.value || '';
  const motivo = document.querySelector('#gd-ausencia-motivo')?.value.trim() || '';
  const tramo_ids = [...document.querySelectorAll('[data-gd-ausencia-tramo]:checked')].map((item) => item.value).filter(Boolean);
  if (!persona_id || !dia_id) { avisar('Seleccione docente y día para registrar la ausencia.', 'grave'); return; }
  registrarCambioEdicion();
  proyecto.gestion_diaria = normalizarGestionDiaria(proyecto);
  proyecto.gestion_diaria.ausencias.push(nuevaAusenciaDiaria({ persona_id, dia_id, tramo_ids, motivo, estado: 'Confirmada' }));
  marcarModificado();
  avisar('Ausencia registrada. Revise y proponga coberturas si procede.', 'correcto');
}

function registrarIncidenciaDesdeGestionDiaria() {
  const dia_id = document.querySelector('#gd-incidencia-dia')?.value || '';
  const tipo = document.querySelector('#gd-incidencia-tipo')?.value || 'Observación';
  const descripcion = document.querySelector('#gd-incidencia-descripcion')?.value.trim() || '';
  if (!dia_id || !descripcion) { avisar('Seleccione día y escriba una descripción para registrar la incidencia.', 'grave'); return; }
  registrarCambioEdicion();
  proyecto.gestion_diaria = normalizarGestionDiaria(proyecto);
  proyecto.gestion_diaria.incidencias.push(nuevaIncidenciaDiaria({ dia_id, tipo, descripcion }));
  marcarModificado();
  avisar('Incidencia diaria registrada.', 'correcto');
}

function ejecutarAccionGestionDiaria(accion, id = '') {
  proyecto.gestion_diaria = normalizarGestionDiaria(proyecto);
  if (accion === 'registrar-ausencia') { registrarAusenciaDesdeGestionDiaria(); return; }
  if (accion === 'registrar-incidencia') { registrarIncidenciaDesdeGestionDiaria(); return; }
  if (accion === 'proponer-coberturas') {
    registrarCambioEdicion();
    const resultado = crearCoberturasPropuestas(proyecto, id);
    proyecto.gestion_diaria = resultado.gestion;
    marcarModificado();
    avisar(`Coberturas revisadas: ${resultado.creadas} propuesta/s nueva/s; ${resultado.sin_cobertura} sin cobertura automática.`, resultado.sin_cobertura ? 'advertencia' : 'correcto');
    return;
  }
  if (accion === 'cerrar-ausencia') {
    registrarCambioEdicion();
    const ausencia = proyecto.gestion_diaria.ausencias.find((a) => a.id === id);
    if (ausencia) ausencia.estado = 'Cerrada';
    marcarModificado();
    avisar('Ausencia cerrada.', 'correcto');
    return;
  }
  if (accion === 'eliminar-ausencia') {
    if (!confirmarAccion('Se eliminará la ausencia y sus coberturas vinculadas. ¿Continuar?')) { avisar('Eliminación cancelada.', 'advertencia'); return; }
    registrarCambioEdicion();
    proyecto.gestion_diaria.ausencias = proyecto.gestion_diaria.ausencias.filter((a) => a.id !== id);
    proyecto.gestion_diaria.coberturas = proyecto.gestion_diaria.coberturas.filter((c) => c.ausencia_id !== id);
    marcarModificado();
    avisar('Ausencia eliminada.', 'correcto');
    return;
  }
  if (accion === 'confirmar-cobertura' || accion === 'sin-cubrir') {
    registrarCambioEdicion();
    const cobertura = proyecto.gestion_diaria.coberturas.find((c) => c.id === id);
    if (cobertura) cobertura.estado = accion === 'confirmar-cobertura' ? 'Confirmada' : 'Sin cubrir';
    marcarModificado();
    avisar(accion === 'confirmar-cobertura' ? 'Cobertura confirmada.' : 'Cobertura marcada como sin cubrir.', accion === 'confirmar-cobertura' ? 'correcto' : 'advertencia');
  }
}

function enlazarEventos() {
  app.querySelectorAll('[data-asistente-paso]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('asistente_paso', () => { pasoAsistente = boton.dataset.asistentePaso; renderizar(); })));
  app.querySelectorAll('[data-ir-revision]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('revision_ir', () => cambiarSeccion(boton.dataset.irRevision))));
  app.querySelectorAll('[data-asistente-plantilla]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('asistente_plantilla', () => {
    if (!confirmarReemplazoProyecto()) { avisar('Operación cancelada. El proyecto actual se conserva.', 'advertencia'); return; }
    registrarCambioEdicion();
    proyecto = crearEjemplo(boton.dataset.asistentePlantilla);
    pasoAsistente = 'revision';
    sesionSeleccionadaId = '';
    marcarModificado();
    avisar(`Plantilla ${boton.dataset.asistentePlantilla} cargada. Revise antes de calcular.`, 'correcto');
  })));
  app.querySelectorAll('[data-asistente-accion]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('asistente_accion', () => ejecutarAccionAsistente(boton.dataset.asistenteAccion))));

  app.querySelectorAll('[data-gestion-accion]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('gestion_diaria', () => ejecutarAccionGestionDiaria(boton.dataset.gestionAccion, boton.dataset.id || ''))));

  app.querySelectorAll('[data-accion]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('accion', async () => {
    const accion = boton.dataset.accion;
    if (accion === 'abrir-asistente') { cambiarSeccion('asistente'); }
    if (accion === 'abrir-importacion') { cambiarSeccion('importacion'); }
    if (accion === 'nuevo-proyecto') { if (!confirmarReemplazoProyecto()) { avisar('Operación cancelada. El proyecto actual se conserva.', 'advertencia'); return; } registrarCambioEdicion(); proyecto = normalizarProyecto(crearProyectoVacio()); sesionSeleccionadaId = ''; cambiosPendientes = true; guardarEmergencia('nuevo_proyecto'); avisar('Proyecto nuevo creado.', 'correcto'); }
    if (accion === 'guardar-local') await guardarProyectoEnNavegador();
    if (accion === 'recuperar-local') await recuperarProyectoGuardado(false);
    if (accion === 'recuperar-anterior') await recuperarProyectoGuardado(true);
    if (accion === 'recuperar-emergencia') recuperarProyectoEmergencia();
    if (accion === 'exportar-json') exportarJson();
    if (accion === 'guardar-centro') {
      proyecto.centro.nombre = document.querySelector('#centro-nombre').value.trim() || 'Centro sin nombre';
      proyecto.centro.tipo = document.querySelector('#centro-tipo').value;
      proyecto.centro.curso_academico = document.querySelector('#centro-curso').value.trim();
      proyecto.centro.descripcion = document.querySelector('#centro-descripcion').value;
      marcarModificado(); avisar('Datos del centro guardados.', 'correcto');
    }
    if (accion === 'guardar-calendario') {
      proyecto.dias.forEach((dia) => { dia.nombre = document.querySelector(`[data-dia="${dia.id}"]`).value.trim() || dia.nombre; });
      proyecto.tramos.forEach((tramo) => {
        tramo.nombre = document.querySelector(`[data-tramo="${tramo.id}"]`).value.trim() || tramo.nombre;
        tramo.inicio = document.querySelector(`[data-tramo-inicio="${tramo.id}"]`)?.value.trim() || '';
        tramo.fin = document.querySelector(`[data-tramo-fin="${tramo.id}"]`)?.value.trim() || '';
        tramo.duracion_minutos = Math.max(0, Number(document.querySelector(`[data-tramo-duracion="${tramo.id}"]`)?.value || 0));
        tramo.tipo_tramo = document.querySelector(`[data-tramo-tipo="${tramo.id}"]`)?.value || 'Lectivo';
        tramo.admite_clase = Boolean(document.querySelector(`[data-tramo-admite-clase="${tramo.id}"]`)?.checked);
        tramo.admite_servicios = Boolean(document.querySelector(`[data-tramo-admite-servicios="${tramo.id}"]`)?.checked);
      });
      proyecto = normalizarProyecto(proyecto); marcarModificado(); avisar('Días y tramos guardados.', 'correcto');
    }
    if (accion === 'calcular') await calcularHorario();
    if (accion === 'cancelar-calculo') cancelarCalculo();
    if (accion === 'deshacer') { const correcto = deshacerCambio(); avisar(correcto ? 'Cambio deshecho.' : 'No hay cambios para deshacer.', correcto ? 'correcto' : 'advertencia'); }
    if (accion === 'rehacer') { const correcto = rehacerCambio(); avisar(correcto ? 'Cambio rehecho.' : 'No hay cambios para rehacer.', correcto ? 'correcto' : 'advertencia'); }
    if (accion === 'limpiar-no-fijas') { if (!confirmarAccion('Se borrarán las sesiones no fijadas. ¿Continuar?')) { avisar('Operación cancelada.', 'advertencia'); return; } registrarCambioEdicion(); proyecto.horario = proyecto.horario.filter((s) => s.fija); sesionSeleccionadaId = ''; marcarModificado(); avisar('Se han borrado las sesiones no fijadas.', 'correcto'); }
    if (accion === 'validar') avisar(resumenValidacion(validarHorario(proyecto)), tieneGraves(validarHorario(proyecto)) ? 'grave' : 'correcto');
    if (accion === 'cancelar-seleccion') { const cancelada = limpiarSeleccionTemporal('Selección cancelada.'); avisar(cancelada ? 'Selección cancelada.' : 'No hay ninguna sesión seleccionada.', cancelada ? 'advertencia' : 'correcto'); }
    if (accion === 'limpiar-condiciones-actividad') { const actividad = condicionesActividadActual(); if (actividad) { registrarCambioEdicion(); actividad.condiciones = nuevaActividad().condiciones; proyecto = normalizarProyecto(proyecto); marcarModificado(); avisar('Condiciones de la actividad limpiadas.', 'correcto'); } }
    if (accion === 'mover-sesion') moverSesionSeleccionada();
    if (accion === 'alternar-fija') { const s = proyecto.horario.find((x) => x.id === sesionSeleccionadaId); if (s) { registrarCambioEdicion(); s.fija = !s.fija; marcarModificado(); avisar(s.fija ? 'Sesión fijada.' : 'Sesión liberada.', 'correcto'); } }
    if (accion === 'eliminar-sesion') { if (!confirmarAccion('Se eliminará la sesión seleccionada. ¿Continuar?')) { avisar('Eliminación cancelada.', 'advertencia'); return; } registrarCambioEdicion(); proyecto.horario = proyecto.horario.filter((s) => s.id !== sesionSeleccionadaId); sesionSeleccionadaId = ''; marcarModificado(); avisar('Sesión eliminada.', 'correcto'); }
    if (accion === 'csv-grupos') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_grupos.csv`, generarCsvHorario(proyecto, 'grupo'), 'text/csv;charset=utf-8');
    if (accion === 'csv-docentes') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_docentes.csv`, generarCsvHorario(proyecto, 'persona'), 'text/csv;charset=utf-8');
    if (accion === 'csv-espacios') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_espacios.csv`, generarCsvHorario(proyecto, 'espacio'), 'text/csv;charset=utf-8');
    if (accion === 'csv-carga-docente') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_carga_docente.csv`, generarCsvCargaDocente(proyecto), 'text/csv;charset=utf-8');
    if (accion === 'csv-calidad-horario') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_calidad_horario.csv`, generarCsvCalidadHorario(proyecto), 'text/csv;charset=utf-8');
    if (accion === 'csv-gestion-diaria') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_gestion_diaria.csv`, generarCsvGestionDiaria(proyecto), 'text/csv;charset=utf-8');
    if (accion === 'html-grupos') abrirHtmlImprimible('grupo');
    if (accion === 'html-docentes') abrirHtmlImprimible('persona');
    if (accion === 'informe-validacion') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_validacion.txt`, generarInformeValidacion(proyecto), 'text/plain;charset=utf-8');
    if (accion === 'informe-carga-docente') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_carga_docente.txt`, generarInformeCargaDocente(proyecto), 'text/plain;charset=utf-8');
    if (accion === 'informe-coherencia-carga') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_coherencia_carga.txt`, generarInformeCoherenciaCarga(proyecto), 'text/plain;charset=utf-8');
    if (accion === 'informe-calidad-horario') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_calidad_horario.txt`, generarInformeCalidadHorario(proyecto), 'text/plain;charset=utf-8');
    if (accion === 'informe-gestion-diaria') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_gestion_diaria.txt`, generarInformeGestionDiaria(proyecto), 'text/plain;charset=utf-8');
    if (accion === 'informe-bloqueos') descargarTexto(`${nombreSeguro(proyecto.centro.nombre)}_bloqueos.txt`, generarInformeBloqueos(proyecto), 'text/plain;charset=utf-8');
  })));


  app.querySelectorAll('[data-plantilla-csv]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('plantilla_csv', () => {
    const plantilla = plantillaCsv(boton.dataset.plantillaCsv);
    descargarTexto(plantilla.nombre, plantilla.texto, 'text/csv;charset=utf-8');
  })));

  app.querySelectorAll('[data-importar-csv]').forEach((control) => control.addEventListener('change', ejecutarSeguro('importar_csv', async (evento) => {
    const archivo = evento.target.files?.[0];
    const tipo = evento.target.dataset.importarCsv;
    if (!archivo || !tipo) return;
    if (!confirmarAccion(`Se importará el CSV de ${tipo}. Conviene haber exportado antes el proyecto JSON. ¿Continuar?`)) {
      evento.target.value = '';
      avisar('Importación CSV cancelada.', 'advertencia');
      return;
    }
    const texto = await leerArchivoComoTexto(archivo);
    registrarCambioEdicion();
    const resultado = importarCsvEnProyecto(proyecto, tipo, texto);
    proyecto = resultado.proyecto;
    sesionSeleccionadaId = '';
    marcarModificado();
    const detalle = resultado.incidencias.map((i) => `<li class="${i.nivel === 'grave' ? 'grave' : 'advertencia'}">${htmlSeguro(i.mensaje)}</li>`).join('');
    mensaje = `<div class="aviso ${resultado.incidencias.some((i) => i.nivel === 'grave') ? 'advertencia' : 'correcto'}"><strong>${htmlSeguro(resumenImportacion(resultado))}</strong>${detalle ? `<ul>${detalle}</ul>` : ''}</div>`;
    evento.target.value = '';
    renderizar();
  })));

  app.querySelector('#importar-json')?.addEventListener('change', ejecutarSeguro('importar_json', async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (!confirmarReemplazoProyecto()) { evento.target.value = ''; avisar('Importación cancelada. El proyecto actual se conserva.', 'advertencia'); return; }
    const texto = await leerArchivoComoTexto(archivo);
    const resultado = importarProyectoJSON(texto);
    registrarCambioEdicion();
    proyecto = resultado.proyecto;
    sesionSeleccionadaId = '';
    cambiosPendientes = true;
    guardarEmergencia('importacion_json');
    avisar('Proyecto importado correctamente.', resultado.incidencias.some((i) => i.nivel === 'grave') ? 'advertencia' : 'correcto');
  }));

  app.querySelectorAll('[data-ejemplo]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('cargar_ejemplo', () => {
    if (!confirmarReemplazoProyecto()) { avisar('Operación cancelada. El proyecto actual se conserva.', 'advertencia'); return; }
    registrarCambioEdicion();
    proyecto = crearEjemplo(boton.dataset.ejemplo);
    sesionSeleccionadaId = '';
    marcarModificado();
    avisar(`Ejemplo ${boton.dataset.ejemplo} cargado.`, 'correcto');
  })));

  app.querySelectorAll('[data-tramos]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('cambiar_tramos', () => {
    const total = Number(boton.dataset.tramos);
    registrarCambioEdicion();
    proyecto.tramos = crearTramosBase(total);
    proyecto = normalizarProyecto(proyecto);
    marcarModificado();
    avisar(`Se han configurado ${total} tramos.`, 'correcto');
  })));

  app.querySelectorAll('[data-anadir]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('anadir_elemento', () => {
    const tipo = boton.dataset.anadir;
    registrarCambioEdicion();
    if (tipo === 'profesorado') proyecto.personas.push(asegurarDisponibilidad(nuevaPersona(), proyecto));
    if (tipo === 'grupos') proyecto.grupos.push(nuevoGrupo());
    if (tipo === 'espacios') proyecto.espacios.push(asegurarDisponibilidad(nuevoEspacio(), proyecto));
    if (tipo === 'actividades') proyecto.actividades.push(nuevaActividad());
    marcarModificado();
    renderizar();
  })));

  app.querySelectorAll('[data-eliminar]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('eliminar_elemento', () => {
    if (!confirmarAccion('Se eliminará el elemento y sus sesiones vinculadas. ¿Continuar?')) { avisar('Eliminación cancelada.', 'advertencia'); return; }
    registrarCambioEdicion();
    const tipo = boton.dataset.eliminar;
    const lista = obtenerLista(tipo);
    const indice = lista.findIndex((x) => x.id === boton.dataset.id);
    if (indice >= 0) lista.splice(indice, 1);
    proyecto.horario = proyecto.horario.filter((s) => s.actividad_id !== boton.dataset.id && s.persona_id !== boton.dataset.id && s.grupo_id !== boton.dataset.id && s.espacio_id !== boton.dataset.id);
    marcarModificado();
    renderizar();
  })));

  app.querySelectorAll('[data-campo]').forEach((entrada) => entrada.addEventListener('input', ejecutarSeguro('editar_campo', () => {
    actualizarCampo(entrada.dataset.tipo, entrada.dataset.id, entrada.dataset.campo, entrada.type === 'checkbox' ? entrada.checked : entrada.value, entrada.type === 'checkbox');
    renderizarEstado();
  })));

  app.querySelectorAll('[data-acompanante-actividad]').forEach((entrada) => entrada.addEventListener('change', ejecutarSeguro('docente_acompanante', () => {
    const actividad = proyecto.actividades.find((item) => item.id === entrada.dataset.acompananteActividad);
    if (!actividad) return;
    registrarCambioEdicion();
    const actual = new Set((actividad.docentes_acompanantes_ids || []).filter(Boolean));
    if (entrada.checked) actual.add(entrada.value);
    else actual.delete(entrada.value);
    actual.delete(actividad.persona_id);
    actividad.docentes_acompanantes_ids = [...actual];
    proyecto = normalizarProyecto(proyecto);
    marcarModificado();
    renderizar();
  })));

  app.querySelector('#disp-tipo')?.addEventListener('change', ejecutarSeguro('disponibilidad_tipo', (e) => { vistaDisponibilidad.tipo = e.target.value; vistaDisponibilidad.entidad_id = ''; renderizar(); }));
  app.querySelector('#disp-entidad')?.addEventListener('change', ejecutarSeguro('disponibilidad_entidad', (e) => { vistaDisponibilidad.entidad_id = e.target.value; renderizar(); }));
  app.querySelectorAll('[data-disponibilidad]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('disponibilidad_hueco', () => {
    const lista = vistaDisponibilidad.tipo === 'persona' ? proyecto.personas : proyecto.espacios;
    const entidad = lista.find((x) => x.id === vistaDisponibilidad.entidad_id);
    if (!entidad) return;
    registrarCambioEdicion();
    asegurarDisponibilidad(entidad, proyecto);
    const clave = boton.dataset.disponibilidad;
    entidad.disponibilidad[clave] = entidad.disponibilidad[clave] === false;
    marcarModificado();
    renderizar();
  })));

  app.querySelector('#cond-actividad')?.addEventListener('change', ejecutarSeguro('condicion_actividad', (e) => { actividadCondicionSeleccionadaId = e.target.value; renderizar(); }));
  app.querySelectorAll('[data-condicion-booleana]').forEach((entrada) => entrada.addEventListener('change', ejecutarSeguro('condicion_booleana', () => {
    const actividad = condicionesActividadActual();
    if (!actividad) return;
    registrarCambioEdicion();
    actividad.condiciones = { ...(actividad.condiciones || nuevaActividad().condiciones), [entrada.dataset.condicionBooleana]: entrada.checked };
    proyecto = normalizarProyecto(proyecto);
    marcarModificado();
    renderizar();
  })));
  app.querySelectorAll('[data-condicion-lista]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('condicion_lista', () => {
    const actividad = condicionesActividadActual();
    if (!actividad) return;
    const contenedor = boton.closest('[data-condicion-nombre]');
    const nombreLista = contenedor?.dataset.condicionNombre;
    if (!nombreLista) return;
    registrarCambioEdicion();
    const condiciones = { ...(actividad.condiciones || nuevaActividad().condiciones) };
    const actual = Array.isArray(condiciones[nombreLista]) ? condiciones[nombreLista] : [];
    const valor = boton.dataset.condicionLista;
    condiciones[nombreLista] = actual.includes(valor) ? actual.filter((item) => item !== valor) : [...actual, valor];
    actividad.condiciones = condiciones;
    proyecto = normalizarProyecto(proyecto);
    marcarModificado();
    renderizar();
  })));
  app.querySelectorAll('[data-condicion-hueco]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('condicion_hueco', () => {
    const actividad = condicionesActividadActual();
    if (!actividad) return;
    registrarCambioEdicion();
    const condiciones = { ...(actividad.condiciones || nuevaActividad().condiciones) };
    const actual = Array.isArray(condiciones.huecos_prohibidos) ? condiciones.huecos_prohibidos : [];
    const valor = boton.dataset.condicionHueco;
    condiciones.huecos_prohibidos = actual.includes(valor) ? actual.filter((item) => item !== valor) : [...actual, valor];
    actividad.condiciones = condiciones;
    proyecto = normalizarProyecto(proyecto);
    marcarModificado();
    renderizar();
  })));


  app.querySelector('#rev-modo')?.addEventListener('change', ejecutarSeguro('revision_modo', (e) => { limpiarSeleccionTemporal(); vistaRevision.modo = e.target.value; vistaRevision.entidad_id = ''; renderizar(); }));
  app.querySelector('#rev-entidad')?.addEventListener('change', ejecutarSeguro('revision_entidad', (e) => { limpiarSeleccionTemporal(); vistaRevision.entidad_id = e.target.value; renderizar(); }));
  app.querySelectorAll('[data-sesion]').forEach((boton) => {
    boton.addEventListener('contextmenu', cancelarEventoTactilLargo);
    boton.addEventListener('touchstart', toqueTactilNoBloqueante, { passive: true });
    boton.addEventListener('click', ejecutarSeguro('seleccionar_sesion', () => { sesionSeleccionadaId = boton.dataset.sesion; renderizar(); }));
    boton.addEventListener('dragstart', ejecutarSeguro('arrastrar_sesion', (evento) => {
      if (!arrastreVisualPermitido()) {
        cancelarEventoTactilLargo(evento);
        sesionSeleccionadaId = boton.dataset.sesion;
        return;
      }
      sesionSeleccionadaId = boton.dataset.sesion;
      if (evento.dataTransfer) {
        evento.dataTransfer.setData('text/plain', boton.dataset.sesion);
        evento.dataTransfer.effectAllowed = 'move';
      } else {
        evento.preventDefault();
      }
    }));
  });
  app.querySelectorAll('[data-destino-dia]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('mover_a_hueco', () => moverSesionAHueco(boton.dataset.destinoDia, boton.dataset.destinoTramo))));
  app.querySelectorAll('[data-celda-dia]').forEach((celda) => {
    celda.addEventListener('contextmenu', cancelarEventoTactilLargo);
    celda.addEventListener('touchstart', toqueTactilNoBloqueante, { passive: true });
    celda.addEventListener('dragover', ejecutarSeguro('preparar_suelta', (evento) => {
      if (!arrastreVisualPermitido()) return;
      evento.preventDefault();
    }));
    celda.addEventListener('drop', ejecutarSeguro('soltar_sesion', (evento) => {
      if (!arrastreVisualPermitido()) return;
      evento.preventDefault();
      const id = evento.dataTransfer?.getData('text/plain');
      if (id) sesionSeleccionadaId = id;
      if (!sesionSeleccionadaId) { avisar('Seleccione primero una sesión para moverla.', 'advertencia'); return; }
      moverSesionAHueco(celda.dataset.celdaDia, celda.dataset.celdaTramo);
    }));
  });
  app.querySelectorAll('[data-crear-pendiente]').forEach((boton) => boton.addEventListener('click', ejecutarSeguro('crear_pendiente', () => colocarSesionPendiente(boton.dataset.crearPendiente))));
}

renderizar();
actualizarBotonPantallaCompleta();
