# Fase 1B · Spike OR-Tools CP-SAT WebAssembly

## Estado

`SPIKE_NODE_PASS_BROWSER_QA_PENDIENTE`

Esta entrega no es una versión funcional nueva de la aplicación. Es una prueba técnica aislada para comprobar si existe una vía realista para cargar un solver CP-SAT WebAssembly dentro del producto estático.

## Base protegida

- Base: `Generador_Horarios_Escolares_v1_4_1.zip`.
- SHA-256 base: `fc75a32f1da6dc5c51dd31bdbc7045059a73feb5a5fa5df036c652cf53d8dd74`.
- Resultado base antes de añadir el spike: `npm test` PASS con 34/34 pruebas.
- La app funcional no se sustituye ni se modifica para usar OR-Tools.
- El botón ordinario `Calcular horario` sigue usando el motor JavaScript vigente.

## Qué se ha añadido

Se añade un directorio aislado:

```text
spikes/ortools_wasm/
```

Contenido principal:

- `vendor/cpsat-js/`: runtime CP-SAT WASM empaquetado localmente.
- `vendor/@bufbuild/protobuf/`: runtime ESM de Protocol Buffers usado por el wrapper del solver.
- `tests/spike_minimo_node.mjs`: prueba mínima en Node.
- `browser/spike_ortools_wasm.html`: panel manual para navegador.
- `browser/worker_ortools_spike.mjs`: prueba del solver dentro de Web Worker.
- `evidencias/evidencia_node_minima.json`: evidencia de ejecución Node.
- `evidencias/npm_test_base_34_34.log`: evidencia de no regresión de la batería actual.
- `evidencias/http_resource_probe.txt`: prueba de disponibilidad de recursos mediante servidor HTTP local.

## Resultado obtenido

### Acreditado

- El ZIP base es íntegro.
- La batería actual sigue pasando: 34/34 pruebas.
- El solver WASM se carga en Node mediante el wrapper vendorizado.
- CP-SAT resuelve un modelo entero mínimo:
  - variables: `x`, `y` en `[0,10]`;
  - restricción: `x + y <= 10`;
  - objetivo: maximizar `2x + y`;
  - resultado esperado: `x=10`, `y=0`, objetivo `20`;
  - estado CP-SAT: `OPTIMAL`.
- Los recursos estáticos principales se sirven correctamente con `python3 -m http.server`.

### No acreditado todavía

- Ejecución real en Chrome/Android.
- Ejecución real en tableta.
- Ejecución real en PC gráfico.
- Ejecución desde GitHub Pages real.
- Apertura directa mediante `file://`.
- Sustitución del motor actual.
- Traducción del modelo de horarios al solver.
- Rendimiento sobre ejemplos escolares.

## Dictamen

La Fase 1B mejora la viabilidad respecto al informe previo porque ya no se basa solo en documentación externa: hay una prueba local mínima con un CP-SAT WASM ejecutado desde el paquete.

Aun así, no autoriza pasar a sustitución del motor. Autoriza únicamente la siguiente decisión técnica:

1. ejecutar el panel `spikes/ortools_wasm/browser/spike_ortools_wasm.html` en navegador real;
2. probarlo en GitHub Pages;
3. probarlo en Android, tableta y PC;
4. si todo pasa, comenzar Fase 2: diseño de traducción del modelo de horarios;
5. si falla `file://` pero pasa servidor local y GitHub Pages, decidir explícitamente si se mantiene el requisito de abrir HTML directamente como bloqueante.

## Riesgo principal observado

El build usado aquí no es una distribución oficial de Google para JavaScript/browser. Es un wrapper/port comunitario sobre CP-SAT. Por tanto, antes de incorporarlo a producción se debe fijar:

- procedencia exacta;
- versión;
- licencia;
- hash del `.wasm`;
- política de actualización;
- prueba física en dispositivos reales.

## No hacer todavía

- No conectar este solver al botón `Calcular horario`.
- No retirar `generador_horario.js`.
- No añadir selectores visibles de motor.
- No cambiar el esquema del proyecto.
- No declarar `v2.0.0` ni RC.
