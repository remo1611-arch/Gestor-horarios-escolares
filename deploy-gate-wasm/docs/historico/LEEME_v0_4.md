# Generador de Horarios Escolares v0.4.0

## Estado

Versión de consolidación funcional centrada en condiciones docentes y ejemplos multicentro. Mantiene la estabilidad corregida de la v0.3.1.

## Novedades principales

- Nueva sección **Condiciones**.
- Condiciones obligatorias por actividad:
  - no más de una sesión de la misma actividad en el mismo día;
  - no colocar la actividad en la última hora;
  - días prohibidos;
  - tramos prohibidos;
  - huecos concretos prohibidos.
- Preferencias por actividad:
  - días preferidos;
  - tramos preferidos.
- El motor de cálculo respeta las condiciones obligatorias.
- El editor manual no permite mover una sesión a un hueco que incumpla condiciones obligatorias.
- El validador independiente detecta incumplimientos de condiciones.
- Nuevos ejemplos sintéticos: CPI, CEE y centro complejo sintético.

## Límites

- No contiene datos reales de ningún centro.
- No autoriza todavía uso con Frián real sin construir primero un proyecto privado local y probarlo.
- Las condiciones de esta versión cubren reglas horarias básicas y necesarias, no toda la casuística organizativa avanzada.

## Prueba recomendada

1. Cargar **Centro complejo sintético**.
2. Revisar la sección **Condiciones**.
3. Calcular horario.
4. Comprobar que no aparecen errores graves.
5. Ir a **Revisar y ajustar**.
6. Seleccionar una sesión y comprobar que los huecos prohibidos aparecen como no permitidos.
7. Exportar JSON e informe de validación.
