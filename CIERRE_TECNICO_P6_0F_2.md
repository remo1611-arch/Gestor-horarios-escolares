# Cierre técnico P6-0F.2

## Estado

`P6-0F_2_CERRADA_CANDIDATA_GITHUB_NO_PUBLICADA`

## Alcance

Saneamiento de procedencia y control de reidentificación sobre la base funcional `0.6.3`. Se conserva la autoría pública deliberada y se excluyen identidades, ubicaciones y fuentes privadas.

## Correcciones aplicadas

- sustituido el fixture parcial heredado por `partialSyntheticFixture`;
- eliminadas ubicaciones concretas y nombres libres de tutoría del payload público;
- sustituidos nombres y hashes de fuentes por referencias inequívocamente sintéticas;
- normalizados los `sourceStatus` de fixtures públicos a `SYNTHETIC`;
- neutralizadas denominaciones curriculares regionales dentro de los casos públicos;
- actualizados metadatos, escenarios y hashes contractuales del caso sintético;
- mantenida la autoría de Remo José Pereira González;
- actualizado el contacto público a `@remo1611-arch`;
- reforzada la auditoría con análisis semántico de JSON, HTML, `.ghfproject` y XLSX;
- añadida allowlist explícita de autoría y denylist privada externa;
- ampliada la QA para verificar los dos payloads sintéticos incrustados;
- corregido el cierre literal de `script` dentro del documento HTML generado, sin alterar su salida funcional;
- añadida verificación reproducible de los tres bloques JavaScript ejecutables mediante `node --check`.

## Invariantes conservados

- base funcional `0.6.3`;
- motor y algoritmos de generación;
- contratos y esquemas funcionales;
- 502 actividades del caso sintético;
- `directWriteAllowed=false`;
- vista previa y aceptación explícita;
- separación `PUBLIC_DEMO` / `LOCAL_PRIVATE`.

## Límite

La fase autoriza el paquete como candidata técnica para publicación, pero no ejecuta el `push`, no activa GitHub Pages y no convierte el servidor local en API pública de producción.
## Evidencias automatizadas

- auditoría pública: correcta, sin incidencias y con 18 payloads semánticos inspeccionados;
- denylist privada externa: correcta, cero coincidencias;
- sintaxis Python: 23/23 archivos;
- sintaxis JavaScript: 3/3 bloques ejecutables;
- modos de ejecución: 6/6 controles;
- QA pública: 18/18 controles;
- fixtures `.ghfproject`: 15/15 cada uno;
- motor sintético: 502/502 asignaciones, estado `FEASIBLE` y vista previa `READY_FOR_PREVIEW`;
- árbol funcional protegido: `motor/`, `schemas/`, `contratos/`, `contratos_ghfproject/` y `plantillas/` permanecen byte a byte iguales a P6-0F.1.

## Comprobación pendiente

La ejecución visual en navegador real no pudo realizarse dentro del entorno de construcción porque la política del navegador bloquea el acceso a `127.0.0.1`. Debe abrirse la candidata en Termux/Chrome y comprobarse la carga, el escenario sintético parcial y la exportación documental antes del `push` o de activar GitHub Pages.

