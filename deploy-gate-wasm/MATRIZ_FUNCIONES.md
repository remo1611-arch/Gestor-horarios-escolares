# Matriz de funciones · v1.4.1

## Soportado

- Crear y editar proyectos horarios en navegador.
- Días y tramos con inicio, fin, duración y tipo.
- Tramos que admiten clase, servicios o ambos según configuración.
- Profesorado, grupos, subgrupos, espacios y actividades.
- Lectivo, libre disposición, docencia compartida, Religión/Atención educativa, DC y servicios.
- Guardias de entrada, salida, recreo/patio y otros servicios como actividades/servicios, no como tramos.
- Motor incremental con límite temporal y resultado parcial controlado.
- Validación independiente de datos y horario.
- Explicación de bloqueos.
- Carga docente en sesiones/tramos y minutos.
- Calidad básica del horario.
- Importación CSV mediante plantillas.
- Gestión diaria de ausencias, coberturas e incidencias como capa separada del horario base.
- Exportación JSON, CSV, HTML e informes TXT.
- Funcionamiento local y preparación para GitHub Pages.

## Parcialmente soportado

- Calidad del horario: calcula indicadores, pero no garantiza optimización global.
- Motor de generación: seguro y progresivo, pero no garantiza encontrar la solución óptima ni completar todos los centros complejos.
- Gestión diaria: cubre ausencias/coberturas básicas, no sustituye una gestión integral multiusuario.
- Importación CSV: válida para plantillas propias, no para formatos oficiales externos sin adaptación.

## No soportado en v1.4.1

- Solver matemático CP-SAT integrado.
- Importación directa desde XADE u otros sistemas externos.
- Multiusuario o sincronización en red.
- Firma, permisos, historial administrativo completo.
- Sustituciones complejas con bolsa externa.
- Optimización global equivalente a herramientas profesionales especializadas.

## Pendiente de verificación real

- Android físico.
- Tableta física.
- PC físico.
- GitHub Pages real.
- Impresión A4/PDF.
- Prueba privada con datos reales o anonimizados.


## Motor web avanzado v1.4

Soportado: cálculo en segundo plano, progreso, cancelación, dominios precalculados, reparación básica y alternativas internas.

No soportado: garantía de óptimo matemático o CP-SAT integrado.


## Soportado en v1.4.1

- Diagnóstico de coherencia de carga docente: objetivo / definido / colocado.
- Recuento corregido de DC y servicios de centro.
