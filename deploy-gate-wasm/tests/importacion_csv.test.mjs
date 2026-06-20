import assert from 'node:assert/strict';
import { crearProyectoVacio, normalizarProyecto } from '../assets/js/dominio/modelo.js';
import { importarCsvEnProyecto, parsearCsv, plantillaCsv } from '../assets/js/persistencia/importacion_csv.js';
import { validarHorario } from '../assets/js/motor/validador_horario.js';

const parsed = parsearCsv('nombre;departamento\n"Docente; Uno";Depto\n');
assert.equal(parsed.registros.length, 1);
assert.equal(parsed.registros[0].nombre, 'Docente; Uno');
assert.ok(plantillaCsv('personas').texto.includes('horas_lectivas_objetivo'));

let proyecto = normalizarProyecto(crearProyectoVacio());
let r = importarCsvEnProyecto(proyecto, 'personas', 'nombre;departamento;horas_lectivas_objetivo;horas_dc_objetivo;horas_permanencia_objetivo;horas_maximas\nDocente A;Lengua;18;5;23;25\nDocente B;Matemáticas;18;5;23;25\n');
assert.equal(r.creados, 2);
assert.equal(r.incidencias.filter((i) => i.nivel === 'grave').length, 0);
proyecto = r.proyecto;

r = importarCsvEnProyecto(proyecto, 'grupos', 'nombre;ensenanza;nivel;grupo_matriz;tipo_agrupamiento;permite_paralelo\n1.º ESO A;ESO;1.º;;Grupo;no\n1.º ESO A · Religión;ESO;1.º;1.º ESO A;Subgrupo;sí\n');
assert.equal(r.creados, 2);
proyecto = r.proyecto;
assert.ok(proyecto.grupos.find((g) => g.nombre.includes('Religión')).grupo_matriz_id);

r = importarCsvEnProyecto(proyecto, 'espacios', 'nombre;tipo;capacidad\nAula 1;Aula ordinaria;25\nPatio norte;Zona de vigilancia;\n');
assert.equal(r.creados, 2);
proyecto = r.proyecto;

r = importarCsvEnProyecto(proyecto, 'tramos', 'nombre;inicio;fin;duracion_minutos;tipo_tramo;admite_clase;admite_servicios;computa_permanencia\nEntrada;08:35;08:50;15;Entrada;no;sí;sí\n1.ª hora;08:50;09:40;50;Lectivo;sí;no;sí\n');
assert.equal(r.creados, 2);
assert.equal(r.proyecto.horario.length, 0);
proyecto = r.proyecto;
assert.equal(proyecto.tramos[0].tipo_tramo, 'Entrada');
assert.equal(proyecto.tramos[0].admite_servicios, true);

r = importarCsvEnProyecto(proyecto, 'actividades', 'nombre;tipo;clasificacion_horaria;grupo;docente;docentes_acompanantes;espacio;sesiones_semanales;duracion_tramos;requiere_grupo;requiere_espacio;docentes_necesarios\nLengua;Materia;Lectiva;1.º ESO A;Docente A;;Aula 1;4;1;sí;sí;1\nGuardia entrada;Guardia de entrada;Docencia complementaria;;Docente A;Docente B;Patio norte;1;1;no;sí;2\n');
assert.equal(r.creados, 2);
assert.equal(r.incidencias.filter((i) => i.nivel === 'grave').length, 0);
proyecto = r.proyecto;
assert.equal(proyecto.actividades.length, 2);
const guardia = proyecto.actividades.find((a) => a.nombre === 'Guardia entrada');
assert.equal(guardia.docentes_acompanantes_ids.length, 1);
assert.equal(guardia.docentes_necesarios, 2);

const validacion = validarHorario(proyecto);
assert.ok(Array.isArray(validacion));

const error = importarCsvEnProyecto(proyecto, 'actividades', 'nombre;tipo;clasificacion_horaria;grupo;docente;espacio\nActividad rota;Materia;Lectiva;Grupo inexistente;Docente A;Aula 1\n');
assert.ok(error.incidencias.some((i) => i.nivel === 'grave'));

console.log('importacion_csv.test.mjs PASS');
