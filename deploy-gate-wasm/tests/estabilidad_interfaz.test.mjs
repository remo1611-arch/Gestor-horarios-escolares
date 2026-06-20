import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fuente = readFileSync(new URL('../assets/js/aplicacion.js', import.meta.url), 'utf-8');

assert.match(fuente, /function ejecutarSeguro/, 'La interfaz debe envolver operaciones con protección de error');
assert.match(fuente, /guardarCopiaEmergenciaLocal/, 'Debe existir copia de emergencia ante fallos o cambios sin guardar');
assert.match(fuente, /recuperarCopiaEmergenciaLocal/, 'Debe poder recuperarse la copia de emergencia');
assert.match(fuente, /if \(evento\.dataTransfer\)/, 'El arrastre no debe asumir que dataTransfer existe en móvil');
assert.match(fuente, /if \(evento\.dataTransfer\) \{[\s\S]*effectAllowed = 'move';[\s\S]*\}/, 'El acceso a dataTransfer debe estar protegido por comprobación previa');
assert.match(fuente, /window\.addEventListener\('error'/, 'Debe haber captura global de errores');
assert.match(fuente, /unhandledrejection/, 'Debe haber captura de promesas no controladas');

console.log('estabilidad_interfaz.test.mjs PASS');
