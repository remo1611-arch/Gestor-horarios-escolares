# Seguridad

## Versión cubierta

La versión funcional cubierta por esta revisión es `0.6.3`.

## Comunicación responsable

No abra incidencias públicas que contengan datos de centros, docentes, alumnado, horarios reales, rutas locales, logs o archivos `.ghfproject` reales.

Para comunicar una vulnerabilidad:

1. utilice **Security → Advisories → Report a vulnerability** cuando el repositorio tenga activado el reporte privado;
2. si esa opción todavía no está disponible, contacte primero con el mantenedor mediante la cuenta de GitHub `@remo1611-arch`, sin adjuntar datos reales ni publicar el detalle técnico explotable.

## Límites de despliegue

- `LOCAL_PRIVATE` debe permanecer enlazado a `127.0.0.1` para datos reales;
- `PUBLIC_DEMO` solo admite contenido `SYNTHETIC`;
- `servidor_ghf.py` usa componentes de desarrollo de la biblioteca estándar y no debe exponerse directamente como servicio de producción;
- CORS no sustituye autenticación, autorización, aislamiento, límites de concurrencia ni rate limiting.
