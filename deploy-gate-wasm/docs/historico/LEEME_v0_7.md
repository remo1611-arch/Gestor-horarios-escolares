# Generador de Horarios Escolares · v0.7.0

## Estado

Versión centrada en el **asistente de creación de centro** y la **revisión previa al cálculo**. Sustituye a v0.6.0 como base recomendada.

## Cambios principales

- Nueva sección ordinaria **Asistente**.
- Recorrido guiado por pasos: Centro, Plantillas, Profesorado, Grupos, Espacios, Actividades y Revisión.
- Alta rápida de docentes con objetivos de carga lectiva, DC y permanencia.
- Alta rápida de grupos, unidades y subgrupos.
- Alta rápida de espacios o zonas.
- Alta rápida de actividades lectivas, DC, servicios y no lectivas.
- Revisión previa pura y testeable antes de calcular.
- Avisos de proyecto incompleto: centro, tramos, docentes, grupos, espacios, actividades, subgrupos, cobertura mínima y objetivos de carga.
- El cálculo avisa si hay bloqueos previos y permite cancelar.
- Se conservan las mejoras de v0.6: carga docente, DC, servicios, exportaciones y validación.

## Qué no cambia

- No se modifica el formato canónico principal: `horario-escolar-json-1.3`.
- No se introducen datos reales.
- No se cambia el motor de cálculo.
- No se elimina ninguna exportación previa.

## Uso recomendado

1. Abrir **Asistente**.
2. Completar Centro.
3. Añadir profesorado.
4. Añadir grupos/unidades/subgrupos.
5. Añadir espacios o zonas.
6. Añadir actividades horarias.
7. Revisar bloqueos.
8. Calcular.
9. Revisar y ajustar.
10. Exportar JSON e informes.

## Limitaciones

- El asistente crea una base coherente, pero no sustituye la revisión profesional de jefatura.
- Los ejemplos siguen siendo sintéticos.
- Aún falta explicación avanzada de bloqueos del motor y caso complejo tipo Frián sintético calibrado.
