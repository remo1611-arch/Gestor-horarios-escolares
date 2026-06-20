import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { validarHorario } from '../assets/js/motor/validador_horario.js';

function clonar(valor) { return JSON.parse(JSON.stringify(valor)); }

function escalarProyecto(proyecto, copias = 3) {
  const salida = clonar(proyecto);
  salida.personas = [];
  salida.grupos = [];
  salida.espacios = [];
  salida.actividades = [];
  salida.horario = [];
  for (let c = 0; c < copias; c += 1) {
    const sufijo = `_b${c}`;
    const personas = new Map();
    const grupos = new Map();
    const espacios = new Map();
    for (const p of proyecto.personas || []) {
      personas.set(p.id, p.id + sufijo);
      salida.personas.push({ ...clonar(p), id: p.id + sufijo, nombre: `${p.nombre} ${c + 1}` });
    }
    for (const g of proyecto.grupos || []) {
      grupos.set(g.id, g.id + sufijo);
      salida.grupos.push({ ...clonar(g), id: g.id + sufijo, nombre: `${g.nombre} ${c + 1}`, grupo_matriz_id: g.grupo_matriz_id ? g.grupo_matriz_id + sufijo : '' });
    }
    for (const e of proyecto.espacios || []) {
      espacios.set(e.id, e.id + sufijo);
      salida.espacios.push({ ...clonar(e), id: e.id + sufijo, nombre: `${e.nombre} ${c + 1}` });
    }
    for (const a of proyecto.actividades || []) {
      salida.actividades.push({
        ...clonar(a),
        id: a.id + sufijo,
        nombre: `${a.nombre} ${c + 1}`,
        persona_id: a.persona_id ? personas.get(a.persona_id) : '',
        docentes_acompanantes_ids: (a.docentes_acompanantes_ids || []).map((id) => personas.get(id)).filter(Boolean),
        grupo_id: a.grupo_id ? grupos.get(a.grupo_id) : '',
        espacio_id: a.espacio_id ? espacios.get(a.espacio_id) : ''
      });
    }
  }
  return normalizarProyecto(salida);
}

const base = normalizarProyecto(JSON.parse(readFileSync(new URL('../ejemplos/ejemplo_centro_exigente_sintetico.json', import.meta.url), 'utf8')));
const proyecto = escalarProyecto(base, 3);
const inicio = Date.now();
const resultado = generarHorario(proyecto, { limite_ms: 1400, intentos: 999 });
const real = Date.now() - inicio;

assert.equal(resultado.metricas.modo_motor, 'web_avanzado');
assert.ok(real < 2600, `El benchmark no debe bloquear el proceso: ${real}ms`);
assert.ok(resultado.metricas.tiempo_ms < 2600, `El motor debe cortar con margen razonable: ${resultado.metricas.tiempo_ms}ms`);
assert.ok(resultado.metricas.corte_por_tiempo || resultado.metricas.pendientes === 0, 'Debe cortar por tiempo o completar');
assert.ok(resultado.metricas.colocadas > 0, 'Debe colocar sesiones incluso con límite corto');
const graves = validarHorario({ ...proyecto, horario: resultado.horario }).filter((i) => i.nivel === 'grave');
assert.equal(graves.length, 0, 'El resultado parcial de benchmark no debe tener graves');

console.log('benchmark_motor_v14.test.mjs PASS');
