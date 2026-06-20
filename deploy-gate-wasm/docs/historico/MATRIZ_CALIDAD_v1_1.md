# Matriz de calidad del horario · v1.1

| Dimensión | Estado v1.1 | Observación |
|---|---|---|
| Huecos por docente | Soportado | Cuenta huecos entre primera y última ocupación diaria. |
| Jornadas con huecos | Soportado | Se informa por docente y por grupo. |
| Primeras horas | Soportado | Indicador por docente y grupo. |
| Últimas horas | Soportado | Indicador por docente y grupo. |
| Reparto diario | Parcial | Calcula desequilibrio básico máximo-mínimo. |
| Reparto de DC | Parcial | Calcula mínimo, máximo y diferencia. |
| Reparto de servicios | Parcial | Calcula mínimo, máximo y diferencia. |
| Comparación de alternativas | Básico interno | `compararCalidadHorarios()` compara penalización. Sin interfaz específica aún. |
| Optimización automática profunda | No soportado | No garantiza óptimo. |
| Dominancia multicriterio | No soportado | Pendiente de futura versión. |
| Preferencias ponderadas configurables | No soportado | Pendiente. |

## Uso previsto

La calidad v1.1 sirve para revisar si el horario generado necesita ajustes antes de considerarlo apto para jefatura.
