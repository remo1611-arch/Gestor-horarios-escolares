# LEEME · v1.4.1

Fase correctiva de auditoría real de carga docente y categorías sobre v1.4.0.

## Objetivo

No maquillar avisos. Separar con claridad:

- horario completo y válido;
- coherencia de carga docente;
- calidad del horario;
- suficiencia de las actividades definidas para alcanzar objetivos.

## Cambios

- El resumen superior ya cuenta DC y servicios aunque las guardias estén clasificadas como docencia complementaria.
- Añade diagnóstico de coherencia de carga en Calcular horario.
- Añade informe TXT de coherencia de carga.
- Mantiene los avisos reales de validación.
- No modifica objetivos docentes para ocultar incidencias.
- No añade datos reales.

## Lectura nueva

En el diagnóstico de carga se muestran tres valores:

```text
objetivo / definido en actividades / colocado en horario
```

Si el horario está completo pero el valor definido no alcanza el objetivo, el problema no es de colocación: el proyecto no contiene suficientes sesiones de esa categoría o los objetivos configurados no corresponden a ese ejemplo.

## Estado

Candidata técnica pendiente de QA físico Android/tableta/PC, GitHub Pages real, impresión A4/PDF y prueba privada con datos reales o anonimizados.
