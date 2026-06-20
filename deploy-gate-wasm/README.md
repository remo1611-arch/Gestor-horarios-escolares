# Generador de Horarios Escolares · v1.4.1

Aplicación estática para crear, calcular, revisar, editar y exportar horarios escolares con modelo lectivo, docencia complementaria, servicios de centro, tramos reales, calidad del horario, importación CSV y gestión diaria.

## Estado

**Candidata funcional v1.4.1.** Incorpora motor web avanzado sin dependencia obligatoria de Python. Sigue pendiente de QA físico Android/tableta/PC, GitHub Pages real, impresión A4/PDF y prueba privada con datos reales o anonimizados.

## Novedad principal

Además del motor web avanzado, v1.4.1 añade coherencia de carga: diferencia horario completo, carga definida por actividades y objetivos docentes.

El cálculo usa motor web avanzado en segundo plano:

- Web Worker para evitar bloqueo de la interfaz.
- Progreso visible y cancelación.
- Dominios precalculados de huecos posibles por actividad.
- Ordenación por dificultad.
- Reparación básica de conflictos de una sesión.
- Multiintento con alternativas internas.
- Selección por sesiones colocadas y métricas de calidad.
- Validación completa final como red de seguridad.

No promete encontrar siempre el horario óptimo matemático ni sustituye a un solver CP-SAT en centros extremadamente complejos.

## Uso básico

1. Abra `index.html` mediante servidor local o GitHub Pages.
2. Cree un centro o cargue un ejemplo.
3. Revise datos, tramos, condiciones, actividades e importación CSV si procede.
4. Calcule horario.
5. Revise bloqueos, calidad, carga docente y gestión diaria.
6. Exporte JSON e informes.

## Documentación activa

- `GUIA_USO.md`
- `MATRIZ_FUNCIONES.md`
- `MATRIZ_MOTOR_v1_4.md`
- `MATRIZ_COHERENCIA_CARGA_v1_4_1.md`
- `QA_ACTUAL.md`
- `QA_FISICO.md`
- `GITHUB_PAGES.md`
- `AUDITORIA_v1_4_1.md`
- `LEEME_v1_4_1.md`

El histórico está en `docs/historico/`.


Nota de alcance: No promete motor óptimo matemático; genera, valida y mejora propuestas revisables.
