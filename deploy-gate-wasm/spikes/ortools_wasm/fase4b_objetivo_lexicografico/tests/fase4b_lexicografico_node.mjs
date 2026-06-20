import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverHorarioCpSatFase4B } from '../src/motor_cp_sat_lexicografico.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '../../../..');
const evidenciaDir = path.resolve(__dirname, '../evidencias');
fs.mkdirSync(evidenciaDir, { recursive: true });

const casos = ['ejemplo_ies_sencillo.json', 'ejemplo_cifp_talleres.json'];
const resultados = [];
for (const archivo of casos) {
  const proyecto = JSON.parse(fs.readFileSync(path.join(raiz, 'ejemplos', archivo), 'utf8'));
  const resultado = await resolverHorarioCpSatFase4B(proyecto, { maxTimeEtapa1Seconds: 4, maxTimeEtapa2Seconds: 6 });
  const graves = resultado.incidencias.filter((i) => i.nivel === 'grave').length;
  assert.equal(resultado.autorizadoParaInterfaz, false, `${archivo}: Fase 4B no debe conectarse a interfaz`);
  assert.equal(graves, 0, `${archivo}: no debe generar errores graves`);
  assert.ok(resultado.metricas.colocadas > 0, `${archivo}: debe colocar sesiones`);
  assert.ok(['COMPLETO', 'PARCIAL', 'PARCIAL_POR_TIEMPO'].includes(resultado.estado), `${archivo}: estado aceptable`);
  resultados.push({
    ejemplo: archivo,
    estado: resultado.estado,
    colocadas: resultado.metricas.colocadas,
    previstas: resultado.metricas.previstas,
    pendientes: resultado.metricas.pendientes,
    etapaElegida: resultado.metricas.etapa_elegida,
    solver1: resultado.metricas.etapa1.solver,
    solver2: resultado.metricas.etapa2.solver,
    penalizacion: resultado.metricas.calidad.puntuacion_penalizacion,
  });
}

const evidencia = {
  fase: 'FASE_4B_OBJETIVO_LEXICOGRAFICO_NODE_BASICA',
  status: 'PASS',
  resultados,
  nota: 'Prueba aislada de seguridad: Fase 4B no conecta interfaz y no produce errores graves en casos básicos.',
};
fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase4b_lexicografico_node.json'), JSON.stringify(evidencia, null, 2));
console.log(JSON.stringify(evidencia, null, 2));
