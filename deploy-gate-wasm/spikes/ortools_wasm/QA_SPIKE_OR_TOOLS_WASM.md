# QA · Spike OR-Tools WASM Fase 1B

## Gates automáticos ejecutados

| Gate | Resultado | Evidencia |
|---|---:|---|
| ZIP base íntegro | PASS | `unzip -t` ejecutado antes de preparar el paquete |
| SHA base | PASS | `fc75a32f1da6dc5c51dd31bdbc7045059a73feb5a5fa5df036c652cf53d8dd74` |
| `npm test` base | PASS | `evidencias/npm_test_base_34_34.log` |
| Spike Node CP-SAT WASM | PASS | `evidencias/evidencia_node_minima.json` |
| Recursos HTTP locales | PASS | `evidencias/http_resource_probe.txt` |

## Gates pendientes

| Gate | Estado | Motivo |
|---|---:|---|
| Chrome gráfico local | PENDIENTE | Chromium headless del contenedor no acreditó ejecución por restricciones del entorno |
| Android Chrome | PENDIENTE | Requiere dispositivo físico |
| Tableta | PENDIENTE | Requiere dispositivo físico |
| PC navegador real | PENDIENTE | Requiere ejecución fuera del contenedor |
| GitHub Pages real | PENDIENTE | Requiere despliegue real |
| Apertura `file://` | PENDIENTE | Riesgo alto por Web Worker/module/WASM |
| Traducción del modelo escolar | NO INICIADO | Corresponde a Fase 2 |
| Validación cruzada con ejemplos | NO INICIADO | Corresponde a Fase 4 |

## Criterio de avance a Fase 2

Se puede avanzar a Fase 2 si el panel de navegador devuelve `PASS` al menos en:

- PC con servidor local;
- Android Chrome con servidor local o GitHub Pages;
- GitHub Pages real.

Si falla la apertura directa `file://`, no se debe ocultar: hay que decidir si se admite servidor local/GitHub Pages como requisito real o si se descarta OR-Tools WASM para esta app.
