import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/app.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf8');

assert.match(html, /id="boton-pantalla-completa"/, 'Debe existir un botón discreto de pantalla completa en la cabecera.');
assert.match(css, /\.boton-pantalla-completa/, 'El botón de pantalla completa debe tener estilo específico.');
assert.match(css, /\.boton-pantalla-completa\.no-soportado/, 'El botón debe ocultarse si el navegador no lo soporta.');
assert.match(app, /function alternarPantallaCompleta\(\)/, 'Debe existir función para alternar pantalla completa.');
assert.match(app, /requestFullscreen|webkitRequestFullscreen/, 'Debe solicitar pantalla completa con API estándar o prefijada.');
assert.match(app, /exitFullscreen|webkitExitFullscreen/, 'Debe poder salir de pantalla completa.');
assert.match(app, /fullscreenchange/, 'Debe escuchar cambios de estado de pantalla completa.');
assert.match(app, /aria-pressed/, 'Debe actualizar el estado accesible del botón.');
assert.doesNotMatch(app, /marcarModificado\(\)[\s\S]{0,120}pantalla/i, 'Cambiar pantalla completa no debe marcar cambios del proyecto.');

console.log('pantalla_completa.test.mjs PASS');
