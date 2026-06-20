import assert from 'node:assert/strict';
import { crearProyectoVacio, nuevaPersona, nuevoGrupo, nuevoEspacio, nuevaActividad, nuevaColocacion, normalizarProyecto, asegurarDisponibilidad } from '../assets/js/dominio/modelo.js';
import { nuevaAusenciaDiaria, sesionesAfectadasPorAusencia, proponerCoberturasParaAusencia, crearCoberturasPropuestas, resumenGestionDiaria } from '../assets/js/dominio/gestion_diaria.js';

const proyecto = normalizarProyecto(crearProyectoVacio());
proyecto.personas = [
  asegurarDisponibilidad(nuevaPersona('Docente ausente'), proyecto),
  asegurarDisponibilidad(nuevaPersona('Docente cobertura'), proyecto),
  asegurarDisponibilidad(nuevaPersona('Docente ocupado'), proyecto)
];
proyecto.grupos = [nuevoGrupo('1.º ESO A')];
proyecto.espacios = [asegurarDisponibilidad(nuevoEspacio('Aula 1'), proyecto), asegurarDisponibilidad(nuevoEspacio('Aula 2'), proyecto)];
const actividad = nuevaActividad('Matemáticas');
actividad.persona_id = proyecto.personas[0].id;
actividad.grupo_id = proyecto.grupos[0].id;
actividad.espacio_id = proyecto.espacios[0].id;
actividad.requiere_espacio = true;
actividad.sesiones_semanales = 1;
const ocupada = nuevaActividad('Lengua');
ocupada.persona_id = proyecto.personas[2].id;
ocupada.grupo_id = proyecto.grupos[0].id;
ocupada.espacio_id = proyecto.espacios[1].id;
proyecto.actividades = [actividad, ocupada];
proyecto.horario = [
  nuevaColocacion({ actividad_id: actividad.id, dia_id: 'dia_1', tramo_id: 'tramo_1', persona_id: proyecto.personas[0].id, grupo_id: proyecto.grupos[0].id, espacio_id: proyecto.espacios[0].id }),
  nuevaColocacion({ actividad_id: ocupada.id, dia_id: 'dia_1', tramo_id: 'tramo_2', persona_id: proyecto.personas[2].id, grupo_id: proyecto.grupos[0].id, espacio_id: proyecto.espacios[1].id })
];

const ausencia = nuevaAusenciaDiaria({ persona_id: proyecto.personas[0].id, dia_id: 'dia_1', tramo_ids: ['tramo_1'], motivo: 'Prueba' });
proyecto.gestion_diaria = { ausencias: [ausencia], coberturas: [], incidencias: [] };
assert.equal(sesionesAfectadasPorAusencia(proyecto, ausencia).length, 1);
const propuestas = proponerCoberturasParaAusencia(proyecto, ausencia);
assert.equal(propuestas.length, 1);
assert.ok(propuestas[0].candidatos.includes(proyecto.personas[1].id));
assert.ok(!propuestas[0].candidatos.includes(proyecto.personas[0].id));
const resultado = crearCoberturasPropuestas(proyecto, ausencia.id);
proyecto.gestion_diaria = resultado.gestion;
assert.equal(resultado.creadas, 1);
assert.equal(proyecto.gestion_diaria.coberturas.length, 1);
assert.equal(resumenGestionDiaria(proyecto).sesiones_afectadas, 1);
console.log('gestion_diaria.test.mjs PASS');
