# Fase 4 · Objetivo de calidad CP-SAT

## Dictamen

La Fase 4 queda **cerrada como prueba experimental negativa para sustitución**.

Se añadió un objetivo CP-SAT de calidad que penaliza, de forma lineal y auditable:

- huecos docentes;
- huecos de grupo;
- últimas horas docentes;
- últimas horas de grupo;
- desequilibrio diario docente básico.

El resultado técnico es útil porque confirma que el problema no es solo cargar OR-Tools ni traducir restricciones: la calidad del horario exige una formulación más precisa antes de sustituir el motor actual.

## Estado

```text
FASE_4_EXPERIMENTAL_NODE_PASS_SUSTITUCION_BLOQUEADA
```

## Qué no cambia

- No se cambia `generador_horario.js`.
- No se cambia `trabajador_generacion.js`.
- No se cambia `aplicacion.js`.
- No se conecta CP-SAT al botón ordinario **Calcular horario**.
- No se modifica `proyecto_horario.schema.json`.
- No se modifican ejemplos existentes.
- No se autoriza Fase 5.

## Qué se añade

```text
spikes/ortools_wasm/fase4_objetivo_calidad/
```

Con:

- motor CP-SAT experimental con objetivo de calidad;
- pruebas Node separadas;
- validación cruzada sobre los siete ejemplos;
- panel navegador experimental;
- worker experimental;
- evidencias JSON/log;
- documentación de QA.

## Resultado de validación cruzada Node

Resumen acreditado en `spikes/ortools_wasm/fase4_objetivo_calidad/evidencias/evidencia_fase4_validacion_cruzada_ejemplos.json`:

| Métrica | Resultado |
|---|---:|
| Ejemplos evaluados | 7 |
| Ejemplos sin errores graves Fase 4 | 7 |
| Ejemplos con no menos sesiones que el motor actual | 6 |
| Bloqueos de sustitución | 6 |

Bloqueos detectados:

- `ejemplo_ies_sencillo.json`: calidad peor que el motor actual.
- `ejemplo_ceip_sencillo.json`: calidad peor que el motor actual.
- `ejemplo_cpi_sencillo.json`: calidad peor que el motor actual.
- `ejemplo_centro_complejo_sintetico.json`: calidad peor que el motor actual.
- `ejemplo_centro_exigente_sintetico.json`: menos sesiones que el motor actual.
- `ejemplo_centro_exigente_sintetico.json`: calidad peor que el motor actual.

## Lectura técnica

La Fase 4 no es un fracaso del proyecto; es un gate útil. Demuestra que una penalización lineal simple de huecos y últimas horas no basta para desplazar al motor actual.

La siguiente fase no debe ser sustitución. Debe ser una reformulación del modelo CP-SAT, preferentemente en dos niveles:

1. máximo número de sesiones colocadas con garantía fuerte;
2. optimización secundaria lexicográfica de calidad, más próxima a `calidad_horario.js`.

## Pendiente

- QA navegador físico del panel Fase 4.
- Android real.
- Tableta real.
- PC real.
- GitHub Pages real.
- Reformulación del objetivo de calidad antes de una nueva comparación.
