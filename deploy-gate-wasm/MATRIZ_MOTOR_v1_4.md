# Matriz de motor · v1.4.1

| Capacidad | Estado | Observación |
|---|---|---|
| Motor web sin Python obligatorio | Soportado | JavaScript en navegador. |
| Cálculo en segundo plano | Soportado | Web Worker de módulo. |
| Cancelación | Soportado | Termina el worker y conserva horario previo. |
| Progreso visible | Soportado | Mensajes parciales desde worker. |
| Límite temporal interno | Soportado | Se comprueba en dominios, intentos, sesiones y candidatos. |
| Dominios precalculados | Soportado | Huecos base por actividad. |
| Ordenación por dificultad | Soportado | Duración, restricciones, docentes, espacio y dominio. |
| Reparación básica | Parcialmente soportado | Recoloca una sesión no fija en conflictos simples. |
| Alternativas internas | Soportado | Conserva top 5 por puntuación. |
| Optimización matemática global | No soportado | No es CP-SAT ni garantiza óptimo. |
| Python/OR-Tools | No incluido | Posible fase opcional posterior. |
