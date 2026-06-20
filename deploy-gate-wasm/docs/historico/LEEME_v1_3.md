# Generador de Horarios Escolares · v1.3.0

## Fase
Gestión diaria.

## Alcance
Esta versión añade una capa diaria separada del horario semanal base:

- registro de ausencias por docente, día y tramo;
- detección de sesiones afectadas;
- propuesta automática de coberturas con docentes disponibles;
- estados de cobertura: propuesta, confirmada, sin cubrir o realizada;
- registro de incidencias diarias;
- CSV e informe TXT de gestión diaria.

## Decisión de diseño
La gestión diaria no modifica el horario oficial semanal. Las coberturas se guardan como capa diaria para evitar destruir el horario base.

## Límites
No es todavía un módulo completo de sustituciones institucionales. No integra mensajería, firmas, XADE ni aprobación administrativa.
