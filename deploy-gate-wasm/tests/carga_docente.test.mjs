import assert from 'node:assert/strict';
import {
  crearProyectoVacio,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  nuevaColocacion,
  asegurarDisponibilidad,
  normalizarProyecto
} from '../assets/js/dominio/modelo.js';
import { calcularCargaDocente, resumenCargaDocente } from '../assets/js/dominio/carga_docente.js';
import { validarHorario } from '../assets/js/motor/validador_horario.js';
import { generarCsvCargaDocente, generarInformeCargaDocente } from '../assets/js/documentos/exportar.js';

const proyecto = crearProyectoVacio();
proyecto.personas = [
  asegurarDisponibilidad({ ...nuevaPersona('Ana'), id: 'p1', horas_lectivas_objetivo: 2, horas_dc_objetivo: 2, horas_permanencia_objetivo: 4 }, proyecto),
  asegurarDisponibilidad({ ...nuevaPersona('Bea'), id: 'p2', horas_lectivas_objetivo: 1, horas_dc_objetivo: 1, horas_permanencia_objetivo: 2 }, proyecto)
];
proyecto.grupos = [{ ...nuevoGrupo('1.º ESO'), id: 'g1' }];
proyecto.espacios = [asegurarDisponibilidad({ ...nuevoEspacio('Aula'), id: 'e1' }, proyecto), asegurarDisponibilidad({ ...nuevoEspacio('Patio'), id: 'e2' }, proyecto)];
proyecto.actividades = [
  { ...nuevaActividad('Matemáticas'), id: 'a1', tipo: 'Materia', clasificacion_horaria: 'Lectiva', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 2 },
  { ...nuevaActividad('Guardia de patio'), id: 'a2', tipo: 'Guardia de patio', clasificacion_horaria: 'Docencia complementaria', requiere_grupo: false, persona_id: 'p1', docentes_acompanantes_ids: ['p2'], docentes_necesarios: 2, espacio_id: 'e2', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 2 }
];
const normalizado = normalizarProyecto(proyecto);
normalizado.horario = [
  nuevaColocacion({ actividad_id: 'a1', dia_id: 'dia_1', tramo_id: 'tramo_1', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1', duracion_tramos: 2 }),
  nuevaColocacion({ actividad_id: 'a2', dia_id: 'dia_2', tramo_id: 'tramo_3', persona_id: 'p1', docentes_acompanantes_ids: ['p2'], espacio_id: 'e2', duracion_tramos: 2 })
];

const cargas = calcularCargaDocente(normalizado);
const ana = cargas.find((c) => c.persona_id === 'p1');
const bea = cargas.find((c) => c.persona_id === 'p2');
assert.equal(ana.lectiva, 2, 'Ana debe computar dos tramos lectivos');
assert.equal(ana.dc, 2, 'Ana debe computar dos tramos DC');
assert.equal(ana.servicios, 2, 'La guardia de patio debe aparecer como servicio dentro de DC');
assert.equal(ana.total_permanencia, 4, 'Ana debe sumar cuatro tramos de permanencia');
assert.equal(bea.dc, 2, 'La docente acompañante también computa DC');
assert.equal(resumenCargaDocente(normalizado).servicios, 4, 'El servicio cuenta por docente asignado');
assert.ok(generarCsvCargaDocente(normalizado).includes('Lectivo colocado'), 'CSV de carga debe tener cabecera específica');
assert.ok(generarInformeCargaDocente(normalizado).includes('Informe de carga docente'), 'Informe de carga debe generarse');
assert.ok(validarHorario(normalizado).some((i) => i.codigo === 'CARGA_DC_EXCESO'), 'Debe avisar si un objetivo DC se supera');

console.log('carga_docente.test.mjs PASS');
