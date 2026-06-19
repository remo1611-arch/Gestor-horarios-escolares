# P12-0 · Contrato del motor web local

Versión de producto: `0.6.0-product-alpha.26`  
Fase: `P12_0_WEB_SOLVER_CONTRACT`  
Fecha: 2026-06-19

## Dictamen

P12-0 abre la línea para que una versión futura pueda alojarse en GitHub Pages y generar horarios localmente en el navegador. Esta entrega **no implementa un solver nuevo** y **no cambia el comportamiento funcional de generación**. El objetivo es cerrar el contrato antes de escribir código.

## Decisiones cerradas

1. **CP-SAT queda como oráculo técnico**, no como dependencia objetivo del usuario final.
2. La arquitectura objetivo es estática/local: enlace web, datos en navegador o archivo local, sin backend para datos reales.
3. P12-0 no modifica interfaz, documentos, XADE, formatos de exportación ni esquema de proyecto.
4. La generación web futura debe ejecutarse en Web Worker o WASM acreditado, nunca bloqueando la interfaz.
5. Ninguna solución inválida puede aceptarse como horario oficial.
6. Una solución parcial debe declararse como parcial y no podrá cerrar horario oficial.
7. El validador independiente sigue siendo autoridad antes de aceptar/importar/cerrar.

## Alcance P12-1

P12-1 debe demostrar generación en navegador para casos simples/medios: una semana, docentes, grupos, espacios, actividades, disponibilidad, no solapes, compatibilidad de espacios y completitud o parcialidad explicada.

## Alcance P12-2

P12-2 podrá ampliar a subconjuntos del dominio organizativo 4.1: servicios, presencia, segmentos anclados, preferencias blandas, calidad multidimensional y relaciones educativas limitadas.

## Corpus mínimo

El corpus contractual queda en `p12/P12_0_TEST_CORPUS.json` e incluye cinco referencias: tres casos mínimos embebidos, el fixture A6 y el centro sintético realista P11-S1. P12-1 no debe avanzar sin pasar los tres casos mínimos; P12-2 no debe reclamar sustitución de CP-SAT sin comparar contra A6/P11-S1.

## Gates de bloqueo

- Se bloquea cualquier candidato con conflictos duros.
- Se bloquea cualquier degradación silenciosa de capacidades.
- Se bloquea el cierre oficial si el resultado es parcial.
- Se bloquea la sustitución de CP-SAT si no hay comparación contra el oráculo.
- Se bloquea publicación GitHub Pages si no hay QA físico en navegador real.

## Estado de esta entrega

`CONTRACTUAL_BASE_CLOSED_NO_FUNCTIONAL_SOLVER_IMPLEMENTED`

No autoriza beta, RC ni release.
