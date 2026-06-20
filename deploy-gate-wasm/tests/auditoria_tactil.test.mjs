import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const codigo = readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf8');

assert.ok(codigo.includes('function toqueTactilNoBloqueante'), 'Debe existir una ruta táctil no bloqueante.');
assert.ok(codigo.includes("touchstart', toqueTactilNoBloqueante"), 'touchstart debe mantener el click normal.');
assert.ok(!codigo.includes("touchstart', cancelarEventoTactilLargo"), 'touchstart no debe llamar a una función que pueda usar preventDefault.');
assert.ok(codigo.includes("evento.type === 'contextmenu' || evento.type === 'dragstart'"), 'Solo contextmenu y dragstart deben bloquearse en táctil.');
assert.ok(codigo.includes('passive: true'), 'Los touchstart deben ser pasivos para no bloquear el click.');

console.log('auditoria_tactil.test.mjs PASS');
