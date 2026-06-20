# Fase 3 · Motor CP-SAT aislado

Esta carpeta contiene una implementación experimental y separada del motor OR-Tools CP-SAT WebAssembly.

No sustituye al motor JavaScript actual. No está conectada al botón **Calcular horario**.

## Ejecutar en PowerShell

Desde la raíz del proyecto:

```powershell
node .\spikes\ortools_wasm\fase3_motor_aislado\tests\fase3_motor_aislado_node.mjs
node .\spikes\ortools_wasm\fase3_motor_aislado\tests\fase3_validacion_cruzada_ejemplos.mjs
python -m http.server 8008
```

Panel navegador:

```text
http://127.0.0.1:8008/spikes/ortools_wasm/fase3_motor_aislado/browser/panel_cp_sat_aislado.html?v=fase3
```

## Resultado esperado

- Prueba mínima: PASS.
- Validación cruzada: PASS técnico con bloqueos de sustitución.

El bloqueo no es por sesiones ni errores graves: es por calidad del horario en al menos un ejemplo.
