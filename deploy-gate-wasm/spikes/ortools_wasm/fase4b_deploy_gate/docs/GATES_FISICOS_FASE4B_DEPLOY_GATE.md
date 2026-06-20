# Gates físicos · Fase 4B-DEPLOY-GATE WASM

Completar una evidencia JSON por perfil.

| Perfil | Requisito mínimo | Estado actual |
|---|---|---|
| HTTP local PC | Panel carga, WASM compila, main thread PASS, worker PASS | Pendiente |
| GitHub Pages real | Igual que HTTP local, servido desde Pages | Pendiente |
| Android Chrome | Igual que HTTP local, sin bloqueo de worker/WASM | Pendiente |
| Tableta | Igual que HTTP local, orientación vertical/horizontal | Pendiente |
| PC navegador ordinario | Igual que HTTP local | Pendiente |
| `file://` directo | Evaluar si carga módulos/WASM o falla por seguridad navegador | Pendiente / no bloqueante hasta decisión explícita |

## Datos que debe aportar cada evidencia

- dispositivo;
- navegador y versión;
- URL utilizada;
- `protocol`;
- `isSecureContext`;
- `crossOriginIsolated`;
- disponibilidad de `SharedArrayBuffer`;
- resultado de recursos;
- resultado de solve en hilo principal;
- resultado de solve en worker;
- JSON exportado del panel.
