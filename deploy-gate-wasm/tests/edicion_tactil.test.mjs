import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/app.css', import.meta.url), 'utf8');

assert.match(app, /function esDispositivoTactil\(\)/, 'Debe detectar dispositivos táctiles');
assert.match(app, /function arrastreVisualPermitido\(\)/, 'Debe separar arrastre de edición táctil');
assert.match(app, /function cancelarEventoTactilLargo\(evento\)/, 'Debe proteger contextmenu y dragstart táctiles');
assert.match(app, /function toqueTactilNoBloqueante\(evento\)/, 'Debe tener ruta táctil no bloqueante');
assert.match(app, /touchstart[^\n]+toqueTactilNoBloqueante[^\n]+passive:\s*true/s, 'touchstart debe ser pasivo para conservar el click');
assert.doesNotMatch(app, /touchstart[^\n]+cancelarEventoTactilLargo/s, 'touchstart no debe cancelar la pulsación normal');
assert.match(app, /contextmenu[^\n]+cancelarEventoTactilLargo/, 'contextmenu debe cancelarse en móvil');
assert.match(app, /draggable="\$\{draggable\}"/, 'draggable debe calcularse por dispositivo');
assert.match(app, /!arrastreVisualPermitido\(\)[\s\S]{0,160}cancelarEventoTactilLargo\(evento\)/, 'dragstart debe bloquearse en táctil sin afectar touchstart');
assert.match(css, /-webkit-touch-callout:\s*none/, 'Debe impedir menú táctil prolongado');
assert.match(css, /touch-action:\s*manipulation/, 'Debe simplificar gestos táctiles');

console.log('edicion_tactil.test.mjs PASS');
