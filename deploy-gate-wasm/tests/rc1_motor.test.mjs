import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');

const version = JSON.parse(leer('VERSION.json'));
assert.equal(version.version, '1.4.1');
assert.equal(version.formato_proyecto, 'horario-escolar-json-1.7');
assert.match(version.estado, /calidad|motor web avanzado|MOTOR_WEB_AVANZADO/i);

const paquete = JSON.parse(leer('package.json'));
assert.equal(paquete.version, '1.4.1');
assert.ok(paquete.scripts.test.includes('motor_incremental.test.mjs'));
assert.ok(paquete.scripts.test.includes('rc1_motor.test.mjs'));

const modelo = leer('assets/js/dominio/modelo.js');
assert.ok(modelo.includes("VERSION_APLICACION = '1.4.1'"));

const motor = leer('assets/js/motor/generador_horario.js');
assert.ok(motor.includes("modo_motor: 'web_avanzado'"), 'El motor debe declarar modo web avanzado');
assert.ok(motor.includes('evaluarHuecoIncremental'), 'Debe existir evaluación incremental de huecos');
assert.ok(motor.includes('corte_por_tiempo'), 'Debe informar corte temporal');
assert.ok(!motor.includes('actividad.group_id'), 'No debe quedar residuo inglés actividad.group_id en el motor');
assert.ok(!leer('assets/js/dominio/revision_previa.js').includes('actividad.group_id'), 'No debe quedar residuo inglés actividad.group_id en revisión previa');

for (const ruta of ['docs/historico/LEEME_v1_0_RC1.md', 'docs/historico/QA_v1_0_RC1.md', 'docs/historico/MATRIZ_MOTOR_RC1.md']) {
  assert.ok(existsSync(join(raiz, ruta)), `Falta ${ruta}`);
}

console.log('rc1_motor.test.mjs PASS');
