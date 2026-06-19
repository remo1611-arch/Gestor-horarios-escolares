# Despliegue en GitHub Pages · Gestor de Horarios Escolares P12-5

## Uso previsto

Esta carpeta puede publicarse como sitio estático. La persona usuaria abre el enlace, carga o crea proyectos, genera ejemplos compatibles con el motor web y guarda/exporta sus archivos localmente.

## Pasos mínimos

1. Crear un repositorio en GitHub.
2. Subir el contenido de esta carpeta a la raíz del repositorio o a `/docs`.
3. Comprobar que existe `.nojekyll`.
4. Activar GitHub Pages en `Settings → Pages`.
5. Elegir `Deploy from a branch` y seleccionar la rama/carpeta usada.
6. Abrir la URL publicada.
7. Probar: `Biblioteca de ejemplos → Ejemplo web P12-5 → Generar horario`.

## Advertencias

- No subas datos reales de un centro a un repositorio público.
- GitHub Pages no ejecuta Python ni OR-Tools.
- P12-5 solo acredita generación web para casos compatibles P12.
- Frián real y casos complejos siguen pendientes de motor web medio/paridad.

## Comprobación local antes de subir

```bash
python tools/p12_4_static_preflight.py
python tools/serve.py 8765
```

Después abre:

```text
http://127.0.0.1:8765/?v=P12_4_WEB_LOCAL
```


## P12-5 · Motor web centro medio

Añade el ejemplo `P12_WEB_MEDIUM` y acredita generación web local sin Python ni OR-Tools para un caso medio sintético con servicios organizativos simples. No acredita Frián real completo ni paridad CP-SAT real.


## P12-6 · Publicación web y gate QA

Se añade `dist/github_pages/` como carpeta estática publicable en GitHub Pages. No amplía el motor; prepara QA real desde URL pública. Los ejemplos P12 compatibles siguen generando con WEB_SOLVER sin Python ni OR-Tools.
