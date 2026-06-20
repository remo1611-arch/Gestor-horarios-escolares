import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { validarHorario } from '../assets/js/motor/validador_horario.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(fs.readFileSync(path.join(raiz, 'ejemplos/ejemplo_centro_exigente_sintetico.json'), 'utf8'));

function clonarProfundo(valor) { return JSON.parse(JSON.stringify(valor)); }

function escalarProyecto(proyecto, copias = 4) {
  const salida = clonarProfundo(proyecto);
  salida.personas = [];
  salida.grupos = [];
  salida.espacios = [];
  salida.actividades = [];
  salida.horario = [];
  for (let c = 0; c < copias; c += 1) {
    const sufijo = `_esc${c}`;
    const mapPersonas = new Map();
    const mapGrupos = new Map();
    const mapEspacios = new Map();
    for (const persona of proyecto.personas || []) {
      mapPersonas.set(persona.id, persona.id + sufijo);
      salida.personas.push({ ...clonarProfundo(persona), id: persona.id + sufijo, nombre: `${persona.nombre} ${c + 1}` });
    }
    for (const grupo of proyecto.grupos || []) {
      mapGrupos.set(grupo.id, grupo.id + sufijo);
      salida.grupos.push({ ...clonarProfundo(grupo), id: grupo.id + sufijo, nombre: `${grupo.nombre} ${c + 1}`, grupo_matriz_id: grupo.grupo_matriz_id ? grupo.grupo_matriz_id + sufijo : '' });
    }
    for (const espacio of proyecto.espacios || []) {
      mapEspacios.set(espacio.id, espacio.id + sufijo);
      salida.espacios.push({ ...clonarProfundo(espacio), id: espacio.id + sufijo, nombre: `${espacio.nombre} ${c + 1}` });
    }
    for (const actividad of proyecto.actividades || []) {
      salida.actividades.push({
        ...clonarProfundo(actividad),
        id: actividad.id + sufijo,
        nombre: `${actividad.nombre} ${c + 1}`,
        grupo_id: actividad.grupo_id ? mapGrupos.get(actividad.grupo_id) : '',
        persona_id: actividad.persona_id ? mapPersonas.get(actividad.persona_id) : '',
        docentes_acompanantes_ids: (actividad.docentes_acompanantes_ids || []).map((id) => mapPersonas.get(id)).filter(Boolean),
        espacio_id: actividad.espacio_id ? mapEspacios.get(actividad.espacio_id) : ''
      });
    }
  }
  salida.centro.nombre = `Centro exigente escalado x${copias}`;
  return normalizarProyecto(salida);
}

const proyectoGrande = escalarProyecto(base, 4);
const inicio = Date.now();
const resultado = generarHorario(proyectoGrande, { intentos: 999, limite_ms: 120 });
const tiempoReal = Date.now() - inicio;

assert.equal(resultado.metricas.modo_motor, 'web_avanzado');
assert.ok(resultado.metricas.tiempo_ms < 1500, `El motor debe respetar el límite de forma razonable; tardó ${resultado.metricas.tiempo_ms} ms`);
assert.ok(tiempoReal < 1500, `La llamada completa no debe bloquear en exceso; tardó ${tiempoReal} ms`);
assert.ok(resultado.metricas.corte_por_tiempo || resultado.metricas.pendientes === 0, 'Debe cortar por tiempo o completar el caso escalado');
assert.ok(Number.isFinite(resultado.metricas.calidad.huecos_docentes), 'Debe informar huecos docentes como métrica de calidad básica');
assert.ok(Number.isFinite(resultado.metricas.calidad.ultimas_horas_docente), 'Debe informar últimas horas como métrica de calidad básica');

const graves = validarHorario({ ...proyectoGrande, horario: resultado.horario }).filter((i) => i.nivel === 'grave');
assert.equal(graves.length, 0, `El resultado parcial no debe tener errores graves: ${graves.map((i) => i.codigo).join(', ')}`);

console.log('motor_incremental.test.mjs PASS');
