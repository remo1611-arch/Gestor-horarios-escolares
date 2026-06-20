import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { validarDatosProyecto, validarHorario } from '../assets/js/motor/validador_horario.js';
import { generarHorario } from '../assets/js/motor/generador_horario.js';
import { calcularCargaDocente } from '../assets/js/dominio/carga_docente.js';
import { explicarBloqueosProyecto } from '../assets/js/dominio/explicador_bloqueos.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ejemplo = JSON.parse(fs.readFileSync(path.join(raiz, 'ejemplos/ejemplo_centro_exigente_sintetico.json'), 'utf8'));
const proyecto = normalizarProyecto(ejemplo);

assert.equal(proyecto.aplicacion.version, '1.4.1');
assert.equal(proyecto.version_formato, '1.7');
assert.equal(proyecto.centro.nombre, 'Centro exigente sintético');
assert.equal(proyecto.metadatos.datos_reales, false, 'El ejemplo debe declararse como sintético');
assert.ok(proyecto.actividades.some((a) => a.tipo === 'Libre disposición'), 'Debe incluir LD');
assert.ok(proyecto.actividades.some((a) => a.clasificacion_horaria === 'Docencia complementaria'), 'Debe incluir DC');
assert.ok(proyecto.actividades.some((a) => a.tipo === 'Guardia de entrada'), 'Debe incluir guardia de entrada');
assert.ok(proyecto.actividades.some((a) => a.tipo === 'Guardia de salida'), 'Debe incluir guardia de salida');
assert.ok(proyecto.actividades.some((a) => a.tipo === 'Guardia de patio'), 'Debe incluir guardia de patio/recreo');
assert.ok(proyecto.actividades.some((a) => a.tipo === 'Docencia compartida' && (a.docentes_acompanantes_ids || []).length), 'Debe incluir docencia compartida lectiva');
assert.ok(proyecto.grupos.some((g) => g.tipo_agrupamiento === 'Subgrupo' && g.permite_paralelo_con_matriz), 'Debe incluir subgrupos paralelos');
assert.equal(validarDatosProyecto(proyecto).filter((i) => i.nivel === 'grave').length, 0, 'El ejemplo no debe tener bloqueos de datos');

const resultado = generarHorario(proyecto, { intentos: 60, limite_ms: 4500 });
const proyectoCalculado = { ...proyecto, horario: resultado.horario };
const graves = validarHorario(proyectoCalculado).filter((i) => i.nivel === 'grave' && i.codigo !== 'SESIONES_PENDIENTES');
assert.equal(graves.length, 0, `El horario generado no debe contener errores graves distintos de sesiones pendientes: ${graves.map((i) => i.codigo).join(', ')}`);
assert.ok(resultado.metricas.colocadas > 0, 'El motor debe colocar alguna sesión en el caso exigente');

const cargas = calcularCargaDocente(proyectoCalculado);
assert.equal(cargas.length, proyecto.personas.length, 'Debe calcular carga para todo el profesorado');
assert.ok(cargas.some((c) => c.dc > 0), 'Debe computar DC en la carga docente');
assert.ok(cargas.some((c) => c.servicios > 0), 'Debe computar servicios de centro');

const explicacion = explicarBloqueosProyecto(proyectoCalculado);
assert.ok(Number.isFinite(explicacion.bloqueos), 'Debe poder explicar bloqueos del caso exigente');

const app = fs.readFileSync(path.join(raiz, 'assets/js/aplicacion.js'), 'utf8');
assert.match(app, /Centro exigente sintético/, 'La interfaz debe ofrecer el centro exigente sintético');
assert.match(app, /data-ejemplo="EXIGENTE"/, 'Inicio debe poder cargar el caso exigente');
assert.match(app, /data-asistente-plantilla="EXIGENTE"/, 'Asistente debe poder cargar el caso exigente');

console.log('centro_exigente.test.mjs PASS');
