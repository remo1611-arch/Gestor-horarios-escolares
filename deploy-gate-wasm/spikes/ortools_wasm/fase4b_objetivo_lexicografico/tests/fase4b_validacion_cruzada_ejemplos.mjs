import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenciaDir = path.resolve(__dirname, '../evidencias');
const evidenciaPath = path.join(evidenciaDir, 'evidencia_fase4b_validacion_cruzada_ejemplos.json');

assert.ok(fs.existsSync(evidenciaPath), 'Debe existir la evidencia completa de validación cruzada Fase 4B.');
const evidencia = JSON.parse(fs.readFileSync(evidenciaPath, 'utf8'));
assert.equal(evidencia.fase, 'FASE_4B_VALIDACION_CRUZADA_OBJETIVO_LEXICOGRAFICO');
assert.equal(evidencia.resumen.ejemplos, 7);
assert.equal(evidencia.resumen.ejemplosSinErroresGravesFase4B, 7);
assert.ok(['NO_AUTORIZA_SUSTITUCION_DEL_MOTOR', 'ABRE_CANDIDATA_A_QA_NAVEGADOR_SIN_CONECTAR_INTERFAZ'].includes(evidencia.dictamen));
// Gate de honestidad: si hay bloqueos, deben estar explícitos; si no los hay, tampoco se autoriza interfaz sin QA físico.
if (evidencia.resumen.bloqueosSustitucion > 0) {
  assert.equal(evidencia.dictamen, 'NO_AUTORIZA_SUSTITUCION_DEL_MOTOR');
  assert.ok(evidencia.bloqueosSustitucion.length === evidencia.resumen.bloqueosSustitucion);
}

const salida = {
  fase: 'FASE_4B_AUDITORIA_EVIDENCIA_VALIDACION_CRUZADA',
  status: 'PASS',
  dictamen: evidencia.dictamen,
  resumen: evidencia.resumen,
  nota: 'Este test audita la evidencia completa ya generada. La ejecución completa está en fase4b_validacion_cruzada_ejemplos_completa.mjs.',
};
fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase4b_auditoria_validacion_cruzada.json'), JSON.stringify(salida, null, 2));
console.log(JSON.stringify(salida, null, 2));
