import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { calcularCalidadHorario, compararCalidadHorarios } from '../assets/js/dominio/calidad_horario.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { generarCsvCalidadHorario, generarInformeCalidadHorario } from '../assets/js/documentos/exportar.js';

const ejemplo = JSON.parse(readFileSync(new URL('../ejemplos/ejemplo_centro_exigente_sintetico.json', import.meta.url), 'utf8'));
let proyecto = normalizarProyecto(ejemplo);
const resultado = generarHorario(proyecto, { limite_ms: 2500, intentos: 30 });
proyecto = normalizarProyecto({ ...proyecto, horario: resultado.horario });

const calidad = calcularCalidadHorario(proyecto);
assert.ok(['buena', 'mejorable', 'revisar'].includes(calidad.resumen.nivel), 'Debe emitir un nivel de calidad');
assert.ok(Number.isFinite(calidad.resumen.puntuacion_penalizacion), 'Debe calcular una penalización numérica');
assert.ok(Number.isFinite(calidad.resumen.huecos_docentes), 'Debe calcular huecos docentes');
assert.ok(Number.isFinite(calidad.resumen.ultimas_horas_docente), 'Debe calcular últimas horas docentes');
assert.ok(calidad.docentes.length === proyecto.personas.length, 'Debe incluir todos los docentes');
assert.ok(calidad.grupos.length === proyecto.grupos.length, 'Debe incluir todos los grupos');
assert.ok(calidad.recomendaciones.length >= 1, 'Debe emitir recomendaciones');

const csv = generarCsvCalidadHorario(proyecto);
assert.ok(csv.includes('Docente'), 'CSV de calidad debe incluir docentes');
assert.ok(csv.includes('Grupo'), 'CSV de calidad debe incluir grupos');
const informe = generarInformeCalidadHorario(proyecto);
assert.ok(informe.includes('Informe de calidad del horario'), 'Informe de calidad debe tener título');
assert.ok(informe.includes('Recomendaciones'), 'Informe de calidad debe incluir recomendaciones');

const comparacion = compararCalidadHorarios(proyecto, proyecto);
assert.equal(comparacion.dictamen, 'equivalentes', 'Dos horarios idénticos deben ser equivalentes');
console.log('calidad_horario.test.mjs PASS');
