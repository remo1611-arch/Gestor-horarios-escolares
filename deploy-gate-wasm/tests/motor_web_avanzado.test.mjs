import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { generarHorario, __motorIncrementalInterno } from '../assets/js/motor/generador_horario.js';
import { validarHorario } from '../assets/js/motor/validador_horario.js';

const base = normalizarProyecto(JSON.parse(readFileSync(new URL('../ejemplos/ejemplo_centro_exigente_sintetico.json', import.meta.url), 'utf8')));
const progresos = [];
const resultado = generarHorario(base, { limite_ms: 2200, intentos: 80, onProgress: (p) => progresos.push(p) });

assert.equal(resultado.metricas.modo_motor, 'web_avanzado');
assert.equal(resultado.metricas.motor_detalle, 'dominios_precalculados_reparacion_alternativas');
assert.ok(resultado.metricas.dominios_precalculados > 0, 'Debe precalcular dominios');
assert.ok(Array.isArray(resultado.metricas.alternativas), 'Debe exponer alternativas internas');
assert.ok(resultado.metricas.alternativas.length >= 1, 'Debe conservar al menos una alternativa');
assert.ok(Number.isFinite(resultado.metricas.mejor_puntuacion), 'Debe puntuar la mejor alternativa');
assert.ok(progresos.some((p) => p.fase === 'dominios'), 'Debe emitir progreso de dominios');
assert.ok(progresos.some((p) => p.fase === 'fin'), 'Debe emitir progreso final');

const graves = validarHorario({ ...base, horario: resultado.horario }).filter((i) => i.nivel === 'grave');
assert.equal(graves.length, 0, `El horario generado no debe tener graves: ${graves.map((g) => g.codigo).join(', ')}`);
assert.ok(__motorIncrementalInterno.dominioBaseActividad, 'Debe exponer dominioBaseActividad para auditoría de motor');
assert.ok(__motorIncrementalInterno.puntuarHorarioGlobal, 'Debe exponer puntuarHorarioGlobal para auditoría de motor');

console.log('motor_web_avanzado.test.mjs PASS');
