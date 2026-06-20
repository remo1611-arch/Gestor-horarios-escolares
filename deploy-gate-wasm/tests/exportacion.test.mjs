import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { generarCsvHorario, generarHtmlImprimible, generarInformeValidacion } from '../assets/js/documentos/exportar.js';

const ejemplo = JSON.parse(fs.readFileSync(new URL('../ejemplos/ejemplo_ceip_sencillo.json', import.meta.url), 'utf8'));
const proyecto = normalizarProyecto(ejemplo);
const resultado = generarHorario(proyecto, { intentos: 60, limite_ms: 2000 });
proyecto.horario = resultado.horario;
const csv = generarCsvHorario(proyecto, 'grupo');
const html = generarHtmlImprimible(proyecto, 'grupo');
const informe = generarInformeValidacion(proyecto);
assert.ok(csv.includes('Vista;Día;Tramo;Contenido'), 'CSV debe incluir cabecera');
assert.ok(html.includes('<!doctype html>'), 'HTML debe ser documento completo');
assert.ok(informe.includes('Informe de validación'), 'Informe debe tener título');
console.log('exportacion.test.mjs PASS');
