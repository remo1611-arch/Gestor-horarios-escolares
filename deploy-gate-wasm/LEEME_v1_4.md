# LEEME · v1.4.1

Fase: **Motor web avanzado sin Python obligatorio**.

## Cambios

- Motor en Web Worker con progreso y cancelación desde la interfaz.
- Dominios precalculados por actividad.
- Ordenación por dificultad real: duración, espacio, docentes, restricciones y tamaño de dominio.
- Puntuación avanzada de candidatos con penalización de huecos docentes y carga diaria.
- Reparación básica: intenta recolocar una sesión conflictiva no fija para hacer sitio a una actividad difícil.
- Alternativas internas y selección por puntuación global.
- Benchmark automático de motor.

## Conserva

- Formato `horario-escolar-json-1.7`.
- Importación CSV v1.2.
- Gestión diaria v1.3.
- Calidad del horario v1.1.
- Validación completa final.

## Pendiente

- QA físico Android/tableta/PC.
- GitHub Pages real.
- Impresión A4/PDF.
- Prueba privada con datos reales o anonimizados.
