import { normalizarProyecto } from '../dominio/modelo.js';
import { validarDatosProyecto } from '../motor/validador_horario.js';

export function exportarProyectoJSON(proyecto) {
  return JSON.stringify({ ...proyecto, metadatos: { ...(proyecto.metadatos || {}), exportado: new Date().toISOString() } }, null, 2);
}

export function importarProyectoJSON(texto) {
  const datos = JSON.parse(texto);
  const proyecto = normalizarProyecto(datos);
  const incidencias = validarDatosProyecto(proyecto);
  return { proyecto, incidencias };
}

export function nombreSeguro(texto) {
  return String(texto || 'proyecto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'proyecto';
}
