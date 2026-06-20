# Auditoría interna v1.4.1

## Dictamen

La corrección no consiste en reducir objetivos ni silenciar avisos. La app debe explicar si los avisos proceden de:

- imposibilidad o bloqueo del motor;
- horario incompleto;
- datos insuficientes en actividades;
- objetivos docentes no coherentes con lo definido;
- calidad mejorable del horario.

## Hallazgos corregidos

1. El resumen superior mostraba servicios de centro como 0 cuando las guardias estaban clasificadas como docencia complementaria. Se corrige contando servicios como subconjunto funcional aunque la clasificación principal sea DC.
2. Se añade auditoría de suficiencia de carga: compara objetivo docente, carga definida por actividades y carga colocada en horario.
3. Se mantiene la validación de carga: los avisos no desaparecen si son reales.

## Límite declarado

La app no decide automáticamente si los objetivos del centro son correctos. Informa de la incoherencia para que jefatura revise objetivos o actividades.
