# Política de privacidad del proyecto

1. El repositorio público contiene exclusivamente código, contratos y fixtures inequívocamente sintéticos.
2. Los datos reales se procesan únicamente en `LOCAL_PRIVATE`.
3. `PUBLIC_DEMO` rechaza plantillas, proyectos, solicitudes y exportaciones que no declaren `SYNTHETIC`.
4. Ningún proyecto real, exportación, captura, log o evidencia del centro debe guardarse en el repositorio.
5. Los logs públicos no deben contener payloads de usuario.
6. El archivo `.ghfproject` real es privado y queda bajo custodia del centro.
7. La etiqueta `SYNTHETIC` no sustituye la auditoría: los fixtures deben ser inequívocamente ficticios.
8. Los términos privados utilizados para auditar nombres de origen se conservan en una denylist externa, nunca en el código público.
9. Antes de cada publicación deben ejecutarse la auditoría pública y, cuando proceda, la auditoría con denylist privada.
