# Auditoría del repositorio público anterior frente a P12-6

## Resultado

La versión anterior del repositorio era valiosa como base de publicación pública, pero no debe mantenerse como aplicación principal. Está basada en `0.6.3` / `P6-0F.2`, mientras que P12-6 es `0.6.0-product-alpha.32` y prepara una app web estática con `WEB_SOLVER` para GitHub Pages.

## Elementos mejores o aprovechables de la versión anterior

1. **Modo público sintético**: regla correcta. Se conserva como política de publicación.
2. **Modo privado local separado**: buena idea, pero en P12-6 la publicación pública no debe mezclarlo con la app de GitHub Pages.
3. **`PRIVACY.md` y `SECURITY.md`**: se conservan actualizados.
4. **Licencia cerrada**: se conserva.
5. **`.gitignore` estricto**: se conserva adaptado para permitir solo `.ghfproject` sintéticos en `data/`.
6. **CI pública**: se conserva adaptada a P12-6 estático.
7. **Auditoría de publicación**: se conserva como script simplificado y ajustado al árbol P12.

## Elementos que no conviene copiar

1. **Servidor Python como flujo principal**: GitHub Pages no ejecuta Python y P12 busca uso desde enlace.
2. **`browser-private.html` antiguo**: era experimental, sin motor, sin XLSX y sin persistencia. La idea es buena, pero debe reabrirse como fase futura si procede, no copiarse.
3. **Evidencias o datos privados**: no deben estar en el repositorio público.
4. **Contratos P6/P5 antiguos completos**: aumentan ruido y pueden confundir con el estado vigente P12.

## Dictamen

Sustituir la raíz del repositorio por este paquete P12-6 saneado es correcto. La versión anterior aporta buenas prácticas de publicación, pero la app actual es funcionalmente superior para el objetivo de GitHub Pages.
