# Generador de Horarios Escolares v0.5.0

## Estado

Versión de modelo organizativo docente inicial, construida sobre la base estable v0.4.4.

No es una versión final para uso real de jefatura. Es la primera versión que empieza a representar necesidades organizativas reales: lectivo/docencia complementaria, servicios de centro, guardias, agrupamientos, subgrupos y docencia compartida. DC significa docencia complementaria, no docencia compartida.

## Cambios principales

- Formato de proyecto actualizado a `horario-escolar-json-1.1`.
- Actividades clasificadas como:
  - Lectiva;
  - No lectiva;
  - Servicio de centro.
- Nuevos tipos de actividad:
  - Libre disposición;
  - Docencia compartida;
  - Religión;
  - Atención educativa;
  - Guardia de patio;
  - Guardia de entrada;
  - Guardia de salida;
  - Guardia de recreo;
  - Cargo;
  - Biblioteca;
  - Itinerancia.
- Grupos con posibilidad de grupo matriz y subgrupo.
- Actividades sin grupo para servicios de centro.
- Docente responsable y docentes acompañantes.
- Cobertura mínima de docentes por sesión.
- El validador comprueba que los docentes acompañantes también ocupan horario.
- Exportaciones actualizadas para mostrar varios docentes.
- Centro complejo sintético ampliado con Religión/Atención educativa, docencia compartida y guardias.

## Qué queda pendiente

- Orquestación avanzada para colocar servicios con rotación justa.
- Vistas específicas de servicios de centro.
- Cómputo separado lectivo/no lectivo en informes completos.
- Asistente específico para crear subgrupos Religión/Atención educativa.
- Caso privado real tipo Frián.
- QA físico en Windows, tablet, GitHub Pages e impresión A4.
