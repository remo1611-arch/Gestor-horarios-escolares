# Generador de Horarios Escolares v0.9.0

## Objetivo de la fase

La v0.9.0 incorpora un **centro exigente sintético tipo Frián**, sin datos reales ni equivalencias identificables. El objetivo es tensionar el modelo ya existente con problemas organizativos más próximos a un centro real complejo, sin convertir la aplicación en una herramienta específica de un centro concreto.

## Qué añade

- Nueva plantilla: **Centro exigente sintético**.
- Nuevo archivo de ejemplo: `ejemplos/ejemplo_centro_exigente_sintetico.json`.
- 10 docentes sintéticos.
- 8 grupos/unidades, incluidos subgrupos paralelos.
- 13 espacios y zonas.
- 26 actividades.
- 78 sesiones previstas.
- Tramos específicos de entrada, recreo y salida.
- Actividades lectivas, LD, religión, atención educativa, docencia compartida, apoyos, DC y servicios de centro.
- Guardias de entrada, salida y recreo/patio con cobertura mínima.
- Objetivos de carga docente para lectivo, DC, permanencia y máximo total.
- Prueba automática específica: `centro_exigente.test.mjs`.

## Qué NO contiene

- No contiene datos reales.
- No contiene nombres reales de centro, docentes, grupos o espacios.
- No reproduce una estructura identificable de Frián.
- No autoriza todavía uso con datos reales sin QA físico y revisión privada.

## Prueba recomendada

1. Abrir la app.
2. Cargar **Centro exigente sintético** desde Inicio o desde Asistente.
3. Revisar tramos: Entrada, horas lectivas, Recreo y Salida.
4. Revisar actividades: LD, DC, Religión, Atención educativa, docencia compartida y guardias.
5. Calcular horario.
6. Revisar la explicación de bloqueos.
7. Revisar la carga docente.
8. Exportar JSON, informe de validación, informe de bloqueos e informe de carga.

## Estado

La v0.9.0 sustituye a la v0.8.0 como base recomendada para pruebas con centro complejo sintético.

Siguiente fase recomendada: `v1.0-rc0`, orientada a GitHub Pages, QA físico, documentación de uso y consolidación de release candidata.
