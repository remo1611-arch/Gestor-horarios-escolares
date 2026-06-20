import assert from 'node:assert/strict';
import {
  crearProyectoVacio,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  nuevaColocacion,
  asegurarDisponibilidad,
  normalizarProyecto,
  resumenProyecto
} from '../assets/js/dominio/modelo.js';
import { auditarCoherenciaCarga, resumenCoherenciaCarga, generarInformeCoherenciaCarga } from '../assets/js/dominio/coherencia_carga.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';

const proyecto = crearProyectoVacio();
proyecto.tramos = [
  { id: 'entrada', nombre: 'Entrada', orden: 1, inicio: '08:40', fin: '08:50', duracion_minutos: 10, tipo_tramo: 'Entrada', admite_clase: false, admite_servicios: true },
  { id: 't1', nombre: '1.ª hora', orden: 2, inicio: '08:50', fin: '09:40', duracion_minutos: 50, tipo_tramo: 'Lectivo', admite_clase: true, admite_servicios: false },
  { id: 'recreo', nombre: 'Recreo', orden: 3, inicio: '10:30', fin: '11:00', duracion_minutos: 30, tipo_tramo: 'Recreo', admite_clase: false, admite_servicios: true }
];
proyecto.personas = [asegurarDisponibilidad({ ...nuevaPersona('Docente prueba'), id: 'p1', horas_lectivas_objetivo: 3, horas_dc_objetivo: 1, horas_permanencia_objetivo: 5 }, proyecto)];
proyecto.grupos = [{ ...nuevoGrupo('Grupo'), id: 'g1' }];
proyecto.espacios = [asegurarDisponibilidad({ ...nuevoEspacio('Aula'), id: 'e1' }, proyecto), asegurarDisponibilidad({ ...nuevoEspacio('Patio'), id: 'e2' }, proyecto)];
proyecto.actividades = [
  { ...nuevaActividad('Materia corta'), id: 'a1', clasificacion_horaria: 'Lectiva', tipo: 'Materia', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1 },
  { ...nuevaActividad('Guardia de patio'), id: 'a2', clasificacion_horaria: 'Docencia complementaria', tipo: 'Guardia de patio', requiere_grupo: false, persona_id: 'p1', espacio_id: 'e2', requiere_espacio: true, sesiones_semanales: 1, duracion_tramos: 1 }
];
const normalizado = normalizarProyecto(proyecto);
const resumen = resumenProyecto(normalizado);
assert.equal(resumen.actividades_docencia_complementaria, 1, 'La guardia DC debe contar como DC');
assert.equal(resumen.servicios_centro, 1, 'La guardia de patio debe contar como servicio aunque su clasificación sea DC');
assert.equal(resumen.sesiones_servicios_previstas, 1, 'Debe contar las sesiones previstas de servicio');

const auditoria = auditarCoherenciaCarga(normalizado);
assert.equal(auditoria.avisos, 2, 'Debe detectar objetivo lectivo y permanencia no alcanzables por las actividades definidas');
assert.ok(resumenCoherenciaCarga(auditoria).includes('no cuadra'), 'El resumen debe explicar que el horario completo no basta si la carga no cuadra');
assert.ok(generarInformeCoherenciaCarga(normalizado).includes('objetivo/definido/colocado'));

const calculado = generarHorario(normalizado, { intentos: 10, limite_ms: 2000 });
const conHorario = { ...normalizado, horario: calculado.horario };
const auditadoCalculado = auditarCoherenciaCarga(conHorario);
assert.ok(auditadoCalculado.totales.colocado_permanencia > 0, 'Debe diferenciar definido y colocado');

// Caso coherente: los objetivos coinciden con lo definido.
const coherente = normalizarProyecto({
  ...proyecto,
  personas: [asegurarDisponibilidad({ ...nuevaPersona('Docente coherente'), id: 'p1', horas_lectivas_objetivo: 1, horas_dc_objetivo: 1, horas_permanencia_objetivo: 2 }, proyecto)],
  horario: [
    nuevaColocacion({ actividad_id: 'a1', dia_id: 'dia_1', tramo_id: 't1', grupo_id: 'g1', persona_id: 'p1', espacio_id: 'e1' }),
    nuevaColocacion({ actividad_id: 'a2', dia_id: 'dia_2', tramo_id: 'recreo', persona_id: 'p1', espacio_id: 'e2' })
  ]
});
assert.equal(auditarCoherenciaCarga(coherente).avisos, 0, 'Un proyecto coherente no debe generar avisos de suficiencia');

console.log('coherencia_carga.test.mjs PASS');
