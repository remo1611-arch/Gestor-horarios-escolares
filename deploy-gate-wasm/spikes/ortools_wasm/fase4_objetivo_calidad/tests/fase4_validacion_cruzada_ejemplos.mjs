import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenciaDir = path.resolve(__dirname, '../evidencias');
const evidenciaPath = path.join(evidenciaDir, 'evidencia_fase4_validacion_cruzada_ejemplos.json');

assert.ok(fs.existsSync(evidenciaPath), 'Debe existir la evidencia completa de validación cruzada Fase 4.');
const evidencia = JSON.parse(fs.readFileSync(evidenciaPath, 'utf8'));

assert.equal(evidencia.fase, 'FASE_4_VALIDACION_CRUZADA_OBJETIVO_CALIDAD');
assert.equal(evidencia.dictamen, 'NO_AUTORIZA_SUSTITUCION_DEL_MOTOR');
assert.equal(evidencia.resumen.ejemplos, 7);
assert.equal(evidencia.resumen.ejemplosSinErroresGravesFase4, 7);
assert.ok(evidencia.resumen.bloqueosSustitucion > 0, 'La Fase 4 debe conservar bloqueos de sustitución documentados.');
assert.ok(evidencia.bloqueosSustitucion.some((b) => b.tipo === 'CALIDAD_PEOR_QUE_MOTOR_ACTUAL'), 'Debe constar al menos un bloqueo por calidad.');
assert.ok(evidencia.bloqueosSustitucion.some((b) => b.tipo === 'MENOS_SESIONES_QUE_MOTOR_ACTUAL'), 'Debe constar el bloqueo por menos sesiones en el centro exigente.');

const salida = {
  fase: 'FASE_4_AUDITORIA_EVIDENCIA_VALIDACION_CRUZADA',
  status: 'PASS',
  dictamen: evidencia.dictamen,
  resumen: evidencia.resumen,
  nota: 'Este test audita la evidencia completa ya generada. La ejecución completa está disponible en fase4_validacion_cruzada_ejemplos_completa.mjs y puede tardar o colgar según el solver WASM.'
};
fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase4_auditoria_validacion_cruzada.json'), JSON.stringify(salida, null, 2));
console.log(JSON.stringify(salida, null, 2));
