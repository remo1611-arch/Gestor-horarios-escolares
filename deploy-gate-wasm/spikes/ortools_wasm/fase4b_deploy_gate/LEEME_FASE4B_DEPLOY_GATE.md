# LEEME · Fase 4B-DEPLOY-GATE WASM

Esta carpeta contiene un gate de despliegue para el runtime CP-SAT WebAssembly usado en los spikes OR-Tools.

## Qué prueba

- Capacidades del navegador: `WebAssembly`, `Worker`, `module worker`, `SharedArrayBuffer`, `crossOriginIsolated`, `isSecureContext`.
- Acceso a recursos estáticos críticos: `.wasm`, `.mjs`, worker y panel.
- Resolución CP-SAT mínima en hilo principal.
- Resolución CP-SAT mínima en `Web Worker`.
- Exportación de evidencia JSON para Android/tableta/PC/GitHub Pages.

## Qué no prueba

No prueba la calidad del horario. No usa el botón ordinario. No sustituye el motor JavaScript de producción.

## Cómo abrir el panel

Desde la raíz del proyecto:

```powershell
python -m http.server 8008
```

Abrir:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase4b_deploy_gate/browser/panel_deploy_gate_wasm.html?v=deploy-gate
```

Después pulsar **Ejecutar gate de despliegue WASM** y guardar/exportar la evidencia JSON.

