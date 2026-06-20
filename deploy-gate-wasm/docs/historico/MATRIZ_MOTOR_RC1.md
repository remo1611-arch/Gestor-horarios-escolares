# Matriz del motor · RC1

| Función | Estado RC1 | Observación |
|---|---:|---|
| Validación estática inicial | Soportado | Se ejecuta antes de calcular. |
| Índices de ocupación docente | Soportado | Incluye docente responsable y acompañantes. |
| Índices de ocupación grupo/subgrupo | Soportado | Evita solapes directos del grupo o subgrupo usado. |
| Índices de ocupación espacio | Soportado | Evita doble uso del mismo espacio. |
| Corte temporal interno | Soportado | Se comprueba en intentos, sesiones y candidatos. |
| Resultado parcial válido | Soportado | Conserva el mejor horario sin errores graves. |
| Estado parcial por tiempo | Soportado | `PARCIAL_POR_TIEMPO`. |
| Validación completa final | Soportado | Se mantiene como red de seguridad. |
| Huecos docentes básicos | Métrica visible | Calculada, pero no optimización profunda. |
| Primeras/últimas horas | Métrica visible | Calculada, pero no optimización profunda. |
| Óptimo matemático | No soportado | Fuera de alcance de RC1. |
| Garantía de completar centro grande | No garantizado | Depende de datos, restricciones y límite temporal. |
