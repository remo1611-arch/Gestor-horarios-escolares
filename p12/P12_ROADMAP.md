# Hoja de ruta P12 · Motor web local

## P12-0 · Contrato y corpus mínimo

Estado: cerrado en esta entrega. No implementa solver.

## P12-1 · Solver web mínimo en Web Worker

Objetivo: generar en navegador casos simples/medios sin Python ni OR-Tools. Debe pasar P12-T00, P12-T01 y P12-T02. Puede bloquear P11-S1 con motivo explícito.

## P12-2 · Dominio organizativo 4.1 parcial

Objetivo: añadir subconjunto educativo real: presencia, servicios, anclajes, disponibilidad parcial, preferencias blandas y calidad multidimensional. Debe comparar A6 y P11-S1 contra CP-SAT.

## P12-3 · Paridad contra oráculo CP-SAT

Objetivo: comparar validez, completitud, calidad, tiempo, estabilidad y explicación de conflictos. CP-SAT sigue fuera del runtime objetivo, pero permanece como juez técnico.

## P12-5 · Publicación GitHub Pages

Objetivo: versión estática enlazable, datos locales, sin backend, sin Python ni OR-Tools para el usuario. Requiere QA físico y aviso de privacidad claro.

## Prohibiciones de alcance

No tocar XADE, documentos, interfaz ordinaria ni datos reales dentro de P12 hasta que el motor web esté acreditado.


## P12-1 cerrado técnicamente en esta entrega

Se implementa `WEB_SOLVER` en Web Worker para el alcance mínimo P12-1. CP-SAT se mantiene como oráculo, no como dependencia del usuario para casos compatibles. P12-2 queda reservado para dominio organizativo 4.1, servicios, segmentos anclados y reglas complejas.


## P12-2 · Dominio organizativo ligero

Estado: implementado como incremento acotado. Añade reglas organizativas simples, presencia mínima, preferencias y relaciones inmediatas. Mantiene bloqueados multitramos, multisedes, recursos, servicios, desdobles y Frián real completo hasta fases posteriores.


## P12-3 · Paridad CP-SAT como oráculo

Estado: implementado como arnés comparativo. No amplía el motor web; prepara la comparación con CP-SAT cuando OR-Tools esté disponible y bloquea explícitamente cualquier falsa declaración de paridad si CP-SAT no se ejecuta.


## P12-5 · Publicación web estática / GitHub Pages

Estado: implementado como preparación de distribución estática. Permite publicar la app como sitio estático y generar casos P12 compatibles con `WEB_SOLVER` sin Python ni OR-Tools. No acredita todavía Frián real ni centros complejos en navegador.


## P12-5 · Motor web centro medio

Estado: implementado. Añade cobertura de servicios organizativos simples y un caso medio sintético (`P12_WEB_MEDIUM`) que genera con `WEB_SOLVER` en navegador. CP-SAT sigue como oráculo externo; Frián real completo sigue pendiente.


## P12-6 · Publicación web y gate QA

Se añade `dist/github_pages/` como carpeta estática publicable en GitHub Pages. No amplía el motor; prepara QA real desde URL pública. Los ejemplos P12 compatibles siguen generando con WEB_SOLVER sin Python ni OR-Tools.
