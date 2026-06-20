# Fase 4 · Objetivo de calidad CP-SAT

## Objetivo

Probar si el motor CP-SAT aislado puede mejorar su calidad añadiendo al objetivo penalizaciones inspiradas en `assets/js/dominio/calidad_horario.js`.

## Penalizaciones implementadas

- Huecos de profesorado.
- Huecos de grupo.
- Últimas horas de profesorado.
- Últimas horas de grupo.
- Desequilibrio diario docente aproximado.

## Decisiones conservadoras

- La carga objetivo sigue siendo diagnóstico, no restricción dura.
- Las sesiones pendientes siguen siendo aviso, no error grave.
- El motor no se conecta a la interfaz ordinaria.
- El motor actual sigue siendo el único motor funcional de la app.

## Resultado

La prueba Node pasa técnicamente, pero bloquea sustitución:

```text
PASS_CON_BLOQUEOS_DE_SUSTITUCION
NO_AUTORIZA_SUSTITUCION_DEL_MOTOR
```

El modelo Fase 4 no iguala todavía la calidad del motor JavaScript actual en todos los ejemplos y, con límite corto, coloca menos sesiones en el centro exigente.

## Dictamen

No procede Fase 5. La próxima fase debe reformular el objetivo como optimización lexicográfica o multi-etapa, no seguir aumentando penalizaciones lineales sin control.
