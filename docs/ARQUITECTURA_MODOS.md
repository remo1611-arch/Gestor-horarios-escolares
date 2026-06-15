# Arquitectura de ejecución

## PUBLIC_DEMO

La interfaz pública estática puede publicarse desde `index.html`. Solo admite datos sintéticos.

El código incluye un modo de desarrollo `public-demo`, pero `servidor_ghf.py` no constituye una API pública de producción. La conexión de GitHub Pages con un motor remoto queda condicionada a desplegar una capa de producción separada y segura.

## LOCAL_PRIVATE

La misma base funcional se ejecuta en localhost con `--mode local-private`. Los proyectos reales no se transmiten a la demo ni se incorporan al repositorio.

## Invariantes comunes

- `directWriteAllowed=false`;
- vista previa obligatoria;
- aceptación explícita;
- reparación en copia;
- archivos `.ghfproject` verificables;
- documentos y XLSX como salidas derivadas.
