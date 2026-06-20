# Generador de Horarios Escolares · v1.0-rc0

## Dictamen

`v1.0-rc0` es una candidata de producto para prueba física y publicación controlada en GitHub Pages. Parte de `v0.9.1` y no introduce nuevas funciones estructurales de horarios; consolida documentación, matriz funcional, QA físico y preparación de despliegue.

## Base funcional incluida

- Centro, días, tramos y duración real.
- Profesorado, grupos, subgrupos, espacios y zonas.
- Actividades lectivas, LD, DC, servicios y no lectivas.
- Guardias como servicios colocados en tramos de entrada, recreo, salida, transporte u otros.
- Cálculo automático con trabajador de navegador.
- Cancelación de cálculo.
- Editor manual con selección segura, botón `Mover aquí`, fijar/liberar, deshacer/rehacer y pantalla completa.
- Revisión previa al cálculo.
- Explicación de bloqueos.
- Carga docente en sesiones/tramos y minutos.
- Exportaciones: JSON, CSV, HTML imprimible e informes TXT.

## Decisiones cerradas

- DC significa **docencia complementaria**.
- Docencia compartida es un tipo lectivo diferente de DC.
- Las guardias no son tramos: son actividades/servicios de DC.
- Los tramos representan franjas temporales reales.
- Un tramo puede admitir clase, servicios, ambos o ninguno.
- La app pública no contiene datos reales de centros.

## Pendiente para v1.0 estable

- QA físico Android/tableta/PC.
- GitHub Pages real.
- Impresión A4 real.
- Prueba con datos reales o anonimizados fuera del árbol público.
- Decisión sobre si se requiere motor local avanzado posterior.
