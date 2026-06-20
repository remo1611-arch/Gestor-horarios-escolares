import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crearProyectoVacio,
  nuevaPersona,
  nuevoGrupo,
  nuevoEspacio,
  nuevaActividad,
  asegurarDisponibilidad,
  normalizarProyecto,
  claveHueco,
  nuevaColocacion
} from '../assets/js/dominio/modelo.js';
import { explicarBloqueosProyecto, resumenExplicaciones } from '../assets/js/dominio/explicador_bloqueos.js';
import { generarInformeBloqueos } from '../assets/js/documentos/exportar.js';

function proyectoImposiblePorDisponibilidad() {
  const p = crearProyectoVacio();
  p.centro.nombre = 'Centro de prueba';
  const docente = asegurarDisponibilidad(nuevaPersona('Docente sin huecos'), p);
  for (const clave of Object.keys(docente.disponibilidad)) docente.disponibilidad[clave] = false;
  p.personas = [docente];
  p.grupos = [nuevoGrupo('1.º ESO A')];
  p.espacios = [asegurarDisponibilidad(nuevoEspacio('Aula 1'), p)];
  p.actividades = [{
    ...nuevaActividad('Materia imposible'),
    persona_id: p.personas[0].id,
    grupo_id: p.grupos[0].id,
    espacio_id: p.espacios[0].id,
    requiere_espacio: true,
    sesiones_semanales: 1,
    duracion_tramos: 1
  }];
  return normalizarProyecto(p);
}

{
  const p = proyectoImposiblePorDisponibilidad();
  const explicacion = explicarBloqueosProyecto(p);
  assert.equal(explicacion.bloqueos, 1, 'Debe explicar una actividad pendiente sin huecos válidos');
  assert.match(resumenExplicaciones(explicacion), /bloqueo/i);
  const item = explicacion.items.find((x) => x.actividad_nombre === 'Materia imposible');
  assert.ok(item, 'Debe existir explicación para la actividad pendiente');
  assert.equal(item.candidatos_posibles, 0);
  assert.ok(item.causas.some((c) => c.codigo === 'PERSONA_NO_DISPONIBLE'), 'Debe detectar disponibilidad docente como causa');
}

{
  const p = proyectoImposiblePorDisponibilidad();
  p.personas[0].disponibilidad[claveHueco('dia_1', 'tramo_1')] = true;
  const explicacion = explicarBloqueosProyecto(normalizarProyecto(p));
  const item = explicacion.items.find((x) => x.actividad_nombre === 'Materia imposible');
  assert.ok(item.candidatos_posibles > 0, 'Debe detectar que existen huecos posibles');
  assert.equal(item.nivel, 'aviso');
}

{
  const p = crearProyectoVacio();
  p.centro.nombre = 'Centro de cobertura';
  p.personas = [asegurarDisponibilidad(nuevaPersona('Docente A'), p)];
  p.espacios = [asegurarDisponibilidad(nuevoEspacio('Patio'), p)];
  p.actividades = [{
    ...nuevaActividad('Guardia de patio'),
    tipo: 'Guardia de patio',
    clasificacion_horaria: 'Docencia complementaria',
    requiere_grupo: false,
    requiere_espacio: true,
    persona_id: p.personas[0].id,
    espacio_id: p.espacios[0].id,
    sesiones_semanales: 1,
    docentes_necesarios: 2
  }];
  const explicacion = explicarBloqueosProyecto(normalizarProyecto(p));
  assert.ok(explicacion.items.some((item) => item.causas.some((c) => c.codigo === 'SERVICIO_SIN_COBERTURA_MINIMA')), 'Debe explicar cobertura docente insuficiente');
}

{
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const app = fs.readFileSync(path.join(raiz, 'assets/js/aplicacion.js'), 'utf8');
  assert.match(app, /renderExplicacionesBloqueos/, 'La interfaz debe renderizar explicación de bloqueos');
  assert.match(app, /informe-bloqueos/, 'Debe existir exportación de informe de bloqueos');
  const informe = generarInformeBloqueos(proyectoImposiblePorDisponibilidad());
  assert.match(informe, /Informe de bloqueos/);
  assert.match(informe, /Materia imposible/);
}

console.log('explicacion_bloqueos.test.mjs PASS');
