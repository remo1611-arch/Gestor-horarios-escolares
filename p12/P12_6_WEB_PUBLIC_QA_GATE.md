# P12-6 · Publicación web y gate de QA

## Objetivo

Preparar una distribución estática publicable en GitHub Pages para uso ordinario en navegador, sin Python ni OR-Tools como dependencia del usuario.

## Alcance

P12-6 no amplía el solver, no cambia XADE, no cambia documentos y no cambia exportaciones. El motor funcional acreditado sigue siendo el de P12-5 para casos compatibles.

El trabajo se limita a:

- crear `dist/github_pages/` como carpeta de publicación estática;
- excluir herramientas Python, servidor local y solver CP-SAT del paquete estático;
- mantener CP-SAT como oráculo externo de desarrollo;
- fijar un gate de QA para probar la app desde enlace real.

## Uso esperado

Subir el contenido de `dist/github_pages/` a GitHub Pages. El usuario abre el enlace, carga o crea un proyecto y genera solo ejemplos/proyectos compatibles con el motor web P12.

## Estado

Preparado para QA real de publicación. No acredita Frián completo ni paridad real contra CP-SAT.
