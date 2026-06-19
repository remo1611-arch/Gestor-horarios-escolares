# Gestor de Horarios Escolares · P12-0

Versión de producto: `0.6.0-product-alpha.32.1`  
Núcleo técnico: `0.6.0-alpha.25`  
Fase: `P12_0_WEB_SOLVER_CONTRACT`

Este ZIP conserva la aplicación de uso ordinario de P11-C5-3 y añade la apertura contractual de P12 para un futuro motor web local. No implementa todavía el solver navegador ni elimina CP-SAT del paquete actual.

## Uso actual

1. Descomprime el ZIP.
2. Arranca el servidor local con `python tools/serve.py 8765`.
3. Abre `http://127.0.0.1:8765/?v=P12_0`.

## Qué cambia en P12-0

- Se define `p12/P12_0_WEB_SOLVER_CONTRACT.json`.
- Se define `p12/P12_0_TEST_CORPUS.json` con casos mínimos y referencias conocidas.
- Se define `p12/P12_0_GATE_MATRIX.csv`.
- Se documenta `p12/P12_ROADMAP.md`.
- CP-SAT queda declarado como oráculo técnico de comparación, no como dependencia objetivo del usuario final futuro.

## Qué no cambia

- No cambia el solver actual.
- No cambia la interfaz ordinaria.
- No cambia XADE, documentos, XLSX ni ZIP de salida.
- No incluye datos reales.
- No autoriza beta, RC ni release.

## Validación contractual

Puedes ejecutar:

```bash
python tools/p12_0_preflight.py
```

Resultado esperado:

```text
P12-0 PREFLIGHT: PASS
```


## P12-1 · Generación web mínima

Esta versión incorpora un motor web P12-1 para generar en navegador proyectos simples compatibles, sin instalar Python ni OR-Tools. Los proyectos complejos siguen usando CP-SAT como oráculo/vía avanzada y no deben considerarse cubiertos por P12-1.


## P12-2 · Dominio organizativo ligero

Se incorpora un ejemplo y un preflight del motor web para presencia mínima, reglas simples, preferencias e inmediato antes/después. No cubre todavía Frián completo ni proyectos multisedes/multitramos/desdobles.


## P12-3 · Paridad CP-SAT como oráculo

Se añade un arnés de comparación web vs CP-SAT. Si CP-SAT no está instalado, la comparación se marca como omitida y no se acredita paridad. No cambia XADE, documentos, XLSX ni el alcance funcional del motor web.


## P12-5 · Publicación web estática

Esta entrega prepara la app para GitHub Pages: abre desde enlace, trabaja localmente en el navegador y genera ejemplos P12 compatibles con motor web sin Python ni OR-Tools. CP-SAT queda como oráculo externo de desarrollo; Frián real y casos complejos siguen pendientes.


## P12-5 · Motor web centro medio

Añade el ejemplo `P12_WEB_MEDIUM` y acredita generación web local sin Python ni OR-Tools para un caso medio sintético con servicios organizativos simples. No acredita Frián real completo ni paridad CP-SAT real.


## P12-6 · Publicación web y gate QA

Se añade `dist/github_pages/` como carpeta estática publicable en GitHub Pages. No amplía el motor; prepara QA real desde URL pública. Los ejemplos P12 compatibles siguen generando con WEB_SOLVER sin Python ni OR-Tools.
