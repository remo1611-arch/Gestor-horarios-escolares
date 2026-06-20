# Publicación en GitHub Pages · RC0

## Objetivo

Publicar la aplicación como sitio estático: `index.html`, `assets/`, `ejemplos/`, `schemas/` y documentación.

## Archivos necesarios

La raíz publicada debe contener:

```text
index.html
assets/
ejemplos/
schemas/
VERSION.json
README.md
.nojekyll
```

Los tests y documentos pueden permanecer en el repositorio; no son necesarios para ejecutar la app, pero ayudan a auditar la versión.

## Pasos recomendados

1. Crear repositorio nuevo o rama limpia.
2. Copiar el contenido de `Generador_Horarios_Escolares_v1_0_rc1/` a la raíz del repositorio.
3. Confirmar que `index.html` está en la raíz.
4. Confirmar que `.nojekyll` está presente.
5. Activar GitHub Pages desde `Settings → Pages`.
6. Seleccionar rama `main` y carpeta `/root`.
7. Abrir la URL publicada.
8. Añadir `?v=1_0_rc0` a la URL para evitar caché durante la prueba.

## Prueba mínima tras publicar

- Carga de página sin errores visibles.
- Carga de ejemplos.
- Cálculo de centro exigente sintético.
- Edición manual de una sesión.
- Exportación JSON.
- Exportación de informe de validación.
- Impresión/Guardar como PDF desde el navegador.

## No publicar

No subir proyectos privados reales ni archivos con datos identificables del centro, profesorado o alumnado.
