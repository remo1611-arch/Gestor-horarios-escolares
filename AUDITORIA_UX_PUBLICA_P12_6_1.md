# Auditoría y saneamiento UX pública · P12-6.1

## Motivo
La publicación P12-6 era funcional, pero no suficientemente limpia para usuario final: mostraba ejemplos complejos que en GitHub Pages no podían generarse, etiquetas internas de CP-SAT, restos de versión P12-0/P11 y la posibilidad de conservar un modo técnico antiguo mediante `modoTecnico=1`.

## Correcciones aplicadas
- Versión visible actualizada a `0.6.0-product-alpha.32.1`.
- Fase visible actualizada a `P12_6_1_SANEAMENTO_UX_PUBLICA`.
- La vista ordinaria de biblioteca muestra solo ejemplos generables en navegador: P12-5, P12-2 y P12-1.
- Los ejemplos avanzados quedan ocultos salvo mantenimiento explícito.
- Se elimina la reutilización del parámetro antiguo `modoTecnico=1`; el mantenimiento requiere `?mantenimiento=1`.
- Los mensajes ordinarios dejan de decir `CP-SAT no disponible` y explican que el proyecto supera el alcance de la versión web.
- La generación ordinaria ya no menciona Python, OR-Tools ni CP-SAT.
- La vista ordinaria no debe mostrar `Vista global técnica`, `Modo técnico` ni `Detalles técnicos de la orquestación`.
- Se conservan contratos y referencias técnicas solo como documentación o mantenimiento.

## Validación
- MANIFEST_PUBLIC_SHA256: PASS 99/99.
- STATIC_MANIFEST_SHA256: PASS 85/85.
- Auditoría pública: PASS 100 archivos sin incidencias.
- Sintaxis JavaScript: PASS 37/37.

## Pendiente
- QA físico desde URL pública real en Android/tableta/PC.
- Mejoras de interfaz móvil si durante el QA aparece exceso de densidad en la vista de horario.
