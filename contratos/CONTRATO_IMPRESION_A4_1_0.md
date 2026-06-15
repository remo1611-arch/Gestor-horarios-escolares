# Contrato de impresión P5-4.1

## Objeto

Normalizar las salidas documentales de P5-4 mediante una vista aislada y perfiles A4 reproducibles.

## Invariantes

1. La interfaz de la aplicación no forma parte del documento impreso.
2. Todas las salidas utilizan tamaño canónico A4.
3. Horarios, cuadrantes, equipo directivo y dossier usan A4 horizontal.
4. Validación, calidad y trazabilidad usan A4 vertical cuando se exportan individualmente.
5. El horario general utiliza una página independiente por grupo.
6. Los horarios de grupo, docente y espacio utilizan una entidad por página.
7. El equipo directivo contiene una página de resumen y una página por integrante.
8. La portada del dossier es independiente.
9. La segunda página del dossier contiene el índice.
10. Las tablas repiten encabezados y evitan dividir filas cuando sea posible.
11. Chrome debe configurarse manualmente en tamaño A4; la aplicación muestra el perfil esperado antes de imprimir.
12. DocumentModel sigue siendo la única fuente de las salidas.
13. Motor, asignaciones, aceptación y `directWriteAllowed=false` no se modifican.

## Salida de impresión

El botón **Abrir vista A4** crea una pestaña documental autónoma. Esa pestaña contiene su propio botón **Imprimir / Guardar PDF** y no incluye cabecera, navegación, indicadores ni controles de la aplicación.
