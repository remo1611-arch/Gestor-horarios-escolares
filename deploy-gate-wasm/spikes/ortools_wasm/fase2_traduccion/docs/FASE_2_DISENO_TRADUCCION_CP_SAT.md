# Fase 2 · Diseño de traducción del modelo escolar a CP-SAT

## Estado

`FASE_2_DISENO_TRADUCCION_NODE_PASS_BROWSER_QA_PENDIENTE`

Esta fase no sustituye el motor funcional de la aplicación. El usuario final sigue pulsando **Calcular horario** y la interfaz sigue usando el motor JavaScript actual de v1.4.1.

La Fase 2 añade un traductor experimental aislado bajo:

```text
spikes/ortools_wasm/fase2_traduccion/
```

## Principio de diseño

La traducción se basa en variables booleanas de candidato:

```text
x[actividad, numero_sesion, dia, tramo_inicio] ∈ {0,1}
```

Cada variable significa: “colocar esta sesión de esta actividad empezando en este día y tramo”.

No se cambia el esquema `proyecto_horario.schema.json`; el traductor consume el modelo actual `horario-escolar-json-1.7` y devuelve colocaciones compatibles con `validarHorario`.

## Traducción de reglas actuales

### Demanda de sesiones

Para cada actividad se crean tantas unidades de sesión como `sesiones_semanales` queden pendientes tras descontar sesiones fijas.

Restricción:

```text
sum(candidatos_de_esa_sesion) <= 1
```

No se usa todavía igualdad obligatoria. Esto conserva la semántica actual: si no cabe todo, puede haber horario parcial válido con aviso `SESIONES_PENDIENTES`.

### Grupo

Para cada grupo y hueco cubierto:

```text
sum(candidatos_que_ocupan_grupo_en_hueco) <= 1
```

En esta fase se reproduce la semántica directa actual del validador: conflicto por `grupo_id` directo. La semántica avanzada de matriz/subgrupos queda documentada como pendiente para fases posteriores.

### Docente responsable y acompañantes

Para cada docente y hueco cubierto:

```text
sum(candidatos_que_ocupan_docente_en_hueco) <= 1
```

Se incluyen docente responsable y `docentes_acompanantes_ids`.

### Espacios

Para cada espacio y hueco cubierto:

```text
sum(candidatos_que_ocupan_espacio_en_hueco) <= 1
```

Si una actividad declara `requiere_espacio`, un espacio inválido descarta todos sus candidatos.

### Duración multitramos

Un candidato cubre desde `tramo_inicio` hasta `duracion_tramos`. Si la duración no cabe completa en el día, el candidato no se crea.

### Disponibilidad

Si un docente o espacio tiene disponibilidad `false` en un hueco cubierto, el candidato se descarta.

### Condiciones de actividad

Se descartan candidatos que incumplen:

- `dias_prohibidos`;
- `tramos_prohibidos`;
- `huecos_prohibidos`;
- `prohibir_ultima_hora`.

Si `una_sesion_por_dia` está activo, se añade:

```text
sum(candidatos_de_la_actividad_en_el_dia) <= 1
```

### Tramos lectivos y servicios

- Actividad lectiva: solo candidatos en tramos con `admite_clase !== false`.
- Servicio de centro: solo candidatos en tramos con `admite_servicios !== false`.

### Sesiones fijas

Las sesiones con `fija: true` se preservan y ocupan recursos. El traductor descarta cualquier candidato que pise sus recursos y huecos.

## Objetivo experimental

La función objetivo actual del prototipo es deliberadamente simple:

1. maximizar sesiones colocadas;
2. aplicar pequeñas bonificaciones/penalizaciones por preferencias ya existentes.

No se modela todavía calidad multidimensional completa. Tampoco se modela carga objetivo como restricción dura.

## Decisión crítica: carga docente

La carga objetivo de docentes se conserva como diagnóstico porque en v1.4.1 no bloquea el cálculo. Convertir `horas_lectivas_objetivo`, `horas_dc_objetivo` o `horas_permanencia_objetivo` en restricciones duras cambiaría el comportamiento del producto y podría volver inviables proyectos que hoy son válidos con avisos.

## Validación realizada

Prueba separada:

```text
spikes/ortools_wasm/fase2_traduccion/tests/fase2_traduccion_node.mjs
```

Casos:

1. `completo_basico`: 3/3 sesiones, 0 graves.
2. `parcial_seguro`: 1/2 sesiones, 0 graves, aviso `SESIONES_PENDIENTES`.
3. `condiciones`: respeta día prohibido y última hora prohibida.
4. `sesiones_fijas`: conserva sesión fija y no la pisa.

Evidencia:

```text
spikes/ortools_wasm/fase2_traduccion/evidencias/evidencia_fase2_traduccion_node.json
```

## Lo que todavía no acredita esta fase

- No acredita navegador.
- No acredita Android/tableta/PC.
- No acredita GitHub Pages real.
- No acredita apertura directa desde `file://`.
- No acredita equivalencia con los siete ejemplos completos.
- No acredita calidad igual o superior al motor v1.4.1.
- No autoriza retirar el motor JavaScript actual.

## Gate para pasar a Fase 3

Antes de implementar motor completo debe cerrarse:

1. QA navegador del spike Fase 1B.
2. Validación cruzada de diseño con los siete ejemplos en modo experimental.
3. Decisión sobre grupos matriz/subgrupos.
4. Definición del objetivo de calidad CP-SAT.
5. Política de `UNKNOWN`, `FEASIBLE`, `OPTIMAL` e `INFEASIBLE`.

