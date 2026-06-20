import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crearProyectoVacio,
  normalizarProyecto,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  asegurarDisponibilidad
} from '../assets/js/dominio/modelo.js';
import { revisarPreparacionProyecto, resumenRevisionPrevia } from '../assets/js/dominio/revision_previa.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(raiz, 'assets/js/aplicacion.js'), 'utf8');
assert.match(app, /\['asistente', 'Asistente'\]/, 'La navegación debe incluir la sección Asistente');
assert.match(app, /renderAsistente\(/, 'Debe existir renderizado del asistente');
assert.match(app, /data-asistente-accion="anadir-actividad"/, 'El asistente debe permitir añadir actividades');

let proyecto = normalizarProyecto(crearProyectoVacio());
let revision = revisarPreparacionProyecto(proyecto);
assert.ok(revision.bloqueantes >= 3, 'Un proyecto vacío debe tener bloqueos de preparación');
assert.match(resumenRevisionPrevia(revision), /bloqueo/, 'El resumen debe informar de bloqueos');

proyecto.centro.nombre = 'Centro de prueba';
proyecto.personas.push(asegurarDisponibilidad({ ...nuevaPersona('Docente A'), horas_lectivas_objetivo: 2 }, proyecto));
proyecto.personas.push(asegurarDisponibilidad({ ...nuevaPersona('Docente B'), horas_dc_objetivo: 1 }, proyecto));
proyecto.grupos.push(nuevoGrupo('1.º ESO A'));
proyecto.espacios.push(asegurarDisponibilidad(nuevoEspacio('Aula 1'), proyecto));
const actividad = {
  ...nuevaActividad('Docencia compartida de prueba'),
  tipo: 'Docencia compartida',
  clasificacion_horaria: 'Lectiva',
  persona_id: proyecto.personas[0].id,
  grupo_id: proyecto.grupos[0].id,
  espacio_id: proyecto.espacios[0].id,
  requiere_espacio: true,
  sesiones_semanales: 2,
  docentes_necesarios: 2
};
proyecto.actividades.push(actividad);
proyecto = normalizarProyecto(proyecto);
revision = revisarPreparacionProyecto(proyecto);
assert.ok(revision.items.some((item) => item.codigo === 'COBERTURA_DOCENTE_INSUFICIENTE'), 'Debe detectar cobertura insuficiente');

proyecto.actividades[0].docentes_acompanantes_ids = [proyecto.personas[1].id];
proyecto = normalizarProyecto(proyecto);
revision = revisarPreparacionProyecto(proyecto);
assert.equal(revision.bloqueantes, 0, 'Con responsable y acompañante válidos no debe haber bloqueos');
assert.equal(revision.listo_para_calcular, true, 'El proyecto debe quedar listo para calcular');

const matriz = proyecto.grupos[0];
proyecto.grupos.push({ ...nuevoGrupo('1.º ESO A · Religión'), grupo_matriz_id: matriz.id, tipo_agrupamiento: 'Subgrupo', permite_paralelo_con_matriz: false });
revision = revisarPreparacionProyecto(normalizarProyecto(proyecto));
assert.ok(revision.items.some((item) => item.codigo === 'SUBGRUPO_SIN_PARALELO'), 'Debe avisar de subgrupo sin paralelo declarado');

console.log('asistente_creacion.test.mjs PASS');
