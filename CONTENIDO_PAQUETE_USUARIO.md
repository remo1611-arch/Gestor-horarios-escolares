# Contenido del paquete usuario final

## Imprescindible

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `VERSION.json`
- `PRODUCT_VERSION.json`
- `assets/css/app.css`
- `assets/js/` con módulos runtime estrictamente necesarios.

## Generación avanzada local

- `solver/cp_sat_server.py`
- `solver/cp_sat_adapter.py`
- `solver/README.md`
- `tools/serve.py`
- `requirements-solver.txt`

## Ejemplos incluidos

- `data/demo.ghfproject`
- `data/fixture_centro_completo_a6.json`
- `data/fixture_centro_completo_a6.ghfproject`
- `data/P11-S1_SYNTHETIC_REALISTIC.json`
- `data/P11-S1_SYNTHETIC_REALISTIC.ghfproject`

## Plantillas

- `plantillas/01_materias.csv`
- `plantillas/02_docentes.csv`
- `plantillas/03_grupos.csv`
- `plantillas/04_espacios.csv`
- `plantillas/05_actividades.csv`
- `plantillas/06_disponibilidad.csv`
- `plantillas/LEEME_PLANTILLAS.md`

## Separado al dossier técnico

Pruebas, QA, esquemas, contratos, histórico de fases, evidencias, herramientas de construcción y calibración privada.

## P11-C5-3 · Saneamiento final técnico

Esta revisión corrige defectos confirmados sobre P11-C5-2 sin modificar el solver, los datos de ejemplo ni el dominio organizativo:

- limita el historial inmediato `editCommands` a 20 comandos;
- excluye `editCommands` de los snapshots restaurables para evitar crecimiento multiplicativo;
- invalida de forma segura ramas de redo en la API heredada de edición;
- limpia el historial inmediato al restaurar snapshot o aceptar propuesta;
- corrige las fechas locales restantes que usaban UTC para “hoy”;
- restringe el servidor local a `localhost`/`127.0.0.1`/loopback IPv6.

No migra todavía todos los diálogos nativos `prompt()`/`confirm()` a modales propios: queda como mejora UX posterior porque exige QA visual específico en Android/tableta/PC.



## P12-0 · Contrato de motor web local

Añadido en `1.0.0-web-rc.1`:

- `p12/P12_0_WEB_SOLVER_CONTRACT.json`
- `p12/P12_0_TEST_CORPUS.json`
- `p12/P12_0_CONTRATO_MOTOR_WEB.md`
- `p12/P12_ROADMAP.md`
- `p12/P12_0_GATE_MATRIX.csv`
- `p12/corpus/*.json`
- `tools/p12_0_preflight.py`

Esta fase no modifica la generación actual. Solo fija contrato, corpus y gates para P12-1/P12-2.


- `assets/js/p12_web_solver.mjs`: motor web P12-1 y analizador de soporte.
- `p12/P12_1_WEB_SOLVER_RUNTIME_CONTRACT.json`: contrato runtime del motor web.
- `tools/p12_1_preflight.py` y `.mjs`: validación ejecutable P12-1.


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
