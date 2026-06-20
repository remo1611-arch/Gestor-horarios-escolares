# Generador de Horarios Escolares · v1.0-rc1

## Estado

Candidata técnica RC1. Sustituye a RC0 como base recomendada para pruebas.

## Motivo de la fase

La auditoría de RC0 detectó un bloqueo real del motor: el límite temporal no se comprobaba dentro del bucle de colocación sesión a sesión y el motor revalidaba el horario completo por cada hueco candidato. RC1 corrige ese problema antes de avanzar hacia una versión estable.

## Cambios principales

- Motor incremental de generación.
- Corte temporal dentro de intentos, sesiones y candidatos.
- Índices de ocupación por docente, grupo/subgrupo y espacio.
- Validación estática de datos una sola vez al inicio.
- Validación completa final como red de seguridad.
- Estado `PARCIAL_POR_TIEMPO` cuando el cálculo se detiene por límite y conserva el mejor horario válido encontrado.
- Métricas básicas de calidad: huecos docentes, primeras horas y últimas horas.
- Eliminación de residuos `actividad.group_id` en motor y revisión previa.
- Benchmark automático con centro exigente escalado.

## Alcance

RC1 mejora rendimiento, control temporal y trazabilidad del cálculo. No garantiza todavía optimización equivalente a productos comerciales ni solución completa para cualquier centro grande.

## Pendiente antes de v1.0 estable

- QA físico Android, tableta y PC.
- GitHub Pages real.
- Impresión A4 real.
- Prueba privada con datos reales o anonimizados.
- Decisión sobre optimización profunda de calidad: huecos, reparto diario, equilibrio de guardias y jornadas docentes.
