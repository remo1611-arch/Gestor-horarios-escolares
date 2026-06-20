# FASE 4B-DEPLOY-GATE · Viabilidad de despliegue WASM

## Dictamen de fase

Esta fase **no sustituye el motor actual**, no mejora el objetivo CP-SAT y no conecta OR-Tools al botón ordinario **Calcular horario**.

Su finalidad es cerrar el bloqueo metodológico detectado tras Fase 4B: antes de seguir invirtiendo en calidad del modelo CP-SAT hay que comprobar si el runtime WebAssembly puede funcionar dentro de las restricciones reales del producto:

- app 100 % estática;
- GitHub Pages;
- ejecución local;
- Android/tableta/PC;
- sin servidor propio;
- sin Python en producción;
- sin selector de motor visible.

## Resultado acreditado en esta entrega

Acreditado desde Node/local:

- inspección estática del paquete vendorizado;
- ausencia textual de patrones `SharedArrayBuffer`, `Atomics`, `pthread`, `USE_PTHREADS` y `PROXY_TO_PTHREAD` en los JS vendorizados;
- `cpsat-js` declara versión `1.0.0` y licencia `Apache-2.0`;
- `cpsat.wasm` existe y es compilable por `WebAssembly.compile` en Node;
- el solver resuelve un modelo mínimo con `numWorkers: 1`;
- los recursos críticos se sirven por HTTP local de prueba;
- la batería de producto `npm test` sigue pasando.

## No acreditado todavía

No queda acreditado en esta entrega:

- Android Chrome real;
- tableta real;
- PC/navegador real;
- GitHub Pages real;
- apertura directa por `file://`;
- estabilidad del worker en navegador;
- comportamiento con caché/service worker;
- rendimiento físico sostenido.

## Gate de salida

La línea OR-Tools solo puede continuar hacia Fase 4C si el panel de esta fase genera evidencias PASS en:

1. HTTP local.
2. GitHub Pages real.
3. Android Chrome.
4. Tableta.
5. PC.

La apertura directa por `file://` se evalúa como gate separado. Si falla por limitaciones del navegador al cargar módulos/WASM, debe decidirse explícitamente si la app mantiene como requisito la apertura directa o si se documenta el uso mediante servidor local estático.

## Decisión de seguridad

Aunque la inspección estática sugiere que el build incluido es monohilo, esta fase no declara la viabilidad completa. El dictamen correcto es:

`DEPLOY_GATE_PREPARADO_QA_NAVEGADOR_FISICO_PENDIENTE`

