import assert from 'node:assert/strict';
import { crearProyectoVacio, normalizarProyecto, nuevaPersona, nuevoEspacio, nuevaActividad, nuevaColocacion, asegurarDisponibilidad, minutosDeColocacion, etiquetaTramo } from '../assets/js/dominio/modelo.js';
import { calcularCargaDocente } from '../assets/js/dominio/carga_docente.js';
import { validarHorario } from '../assets/js/motor/validador_horario.js';

const proyecto = crearProyectoVacio();
proyecto.tramos = [
  { id: 'entrada', nombre: 'Entrada', orden: 1, inicio: '08:35', fin: '08:50', tipo_tramo: 'Entrada', admite_clase: false, admite_servicios: true },
  { id: 'clase_1', nombre: '1.ª hora', orden: 2, inicio: '08:50', fin: '09:40', tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
  { id: 'recreo', nombre: 'Recreo', orden: 3, inicio: '10:30', fin: '11:00', tipo_tramo: 'Recreo', admite_clase: false, admite_servicios: true }
];
proyecto.personas = [asegurarDisponibilidad(nuevaPersona('Docente A'), proyecto), asegurarDisponibilidad(nuevaPersona('Docente B'), proyecto)];
proyecto.espacios = [asegurarDisponibilidad(nuevoEspacio('Patio'), proyecto)];
const servicio = { ...nuevaActividad('Guardia de recreo'), tipo: 'Guardia de recreo', clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, persona_id: proyecto.personas[0].id, docentes_acompanantes_ids: [proyecto.personas[1].id], docentes_necesarios: 2, espacio_id: proyecto.espacios[0].id, requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1 };
const clase = { ...nuevaActividad('Clase ordinaria'), tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: '', requiere_grupo: false, persona_id: proyecto.personas[0].id, sesiones_semanales: 1, duracion_tramos: 1 };
const normalizado = normalizarProyecto({ ...proyecto, actividades: [servicio, clase] });
assert.equal(normalizado.tramos[0].duracion_minutos, 15);
assert.equal(normalizado.tramos[2].duracion_minutos, 30);
assert.match(etiquetaTramo(normalizado.tramos[2]), /10:30-11:00/);

normalizado.horario = [
  nuevaColocacion({ actividad_id: normalizado.actividades[0].id, dia_id: 'dia_1', tramo_id: 'recreo', persona_id: normalizado.personas[0].id, docentes_acompanantes_ids: [normalizado.personas[1].id], espacio_id: normalizado.espacios[0].id }),
  nuevaColocacion({ actividad_id: normalizado.actividades[1].id, dia_id: 'dia_1', tramo_id: 'entrada', persona_id: normalizado.personas[0].id })
];
assert.equal(minutosDeColocacion(normalizado, normalizado.horario[0]), 30);
const codigos = validarHorario(normalizado).map((i) => i.codigo);
assert.ok(codigos.includes('CLASE_EN_TRAMO_NO_LECTIVO'), 'una clase no puede colocarse en entrada si el tramo no admite clase');
assert.ok(!codigos.includes('SERVICIO_EN_TRAMO_NO_APTO'), 'el servicio de recreo sí puede colocarse en un tramo que admite servicios');
const carga = calcularCargaDocente(normalizado).find((r) => r.persona_id === normalizado.personas[1].id);
assert.equal(carga.dc_minutos, 30, 'la guardia computa minutos reales para el docente acompañante');
console.log('tramos_reales.test.mjs PASS');
