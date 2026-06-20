# Spike OR-Tools WASM · Fase 1B

Este directorio es un laboratorio aislado. Sirve para comprobar si CP-SAT WebAssembly puede cargarse en una app estática y ejecutarse en un Web Worker.

## Prueba Node

Desde la raíz del proyecto:

```bash
node spikes/ortools_wasm/tests/spike_minimo_node.mjs
```

Resultado esperado:

```json
{
  "status": "PASS",
  "objectiveValue": 20,
  "values": { "x": 10, "y": 0 }
}
```

## Prueba navegador local con servidor

Desde la raíz del proyecto:

```bash
python3 -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/browser/spike_ortools_wasm.html?v=fase1b
```

Pulsar `Ejecutar prueba mínima`.

## Qué acredita

Acredita únicamente carga y resolución mínima del solver. No acredita todavía traducción del horario escolar ni calidad del resultado.

## Qué no se debe tocar

No se debe conectar este spike a `aplicacion.js`, `trabajador_generacion.js` ni `generador_horario.js` hasta completar Fase 2 y Fase 4.
