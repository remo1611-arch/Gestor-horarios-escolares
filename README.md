# Gestor de Horarios Escolares · Web P12

Aplicación web estática para crear, revisar, generar, editar, documentar y exportar horarios escolares con datos locales del navegador.

**Versión publicada:** `0.6.0-product-alpha.32.1`  
**Fase:** `P12_6_1_SANEAMENTO_UX_PUBLICA`  
**Estado:** app web publicable en GitHub Pages para QA real con datos sintéticos y generación motor web en casos compatibles. No es beta, RC ni release final.

## Uso previsto

Esta publicación está pensada como **demo pública sintética y QA multidispositivo**:

- abre desde GitHub Pages;
- trabaja en el navegador del usuario;
- no requiere Python;
- no requiere OR-Tools;
- no usa backend remoto;
- los proyectos se guardan localmente mediante el navegador y archivos exportados por la persona usuaria;
- genera con motor web los ejemplos P12 compatibles.

GitHub Pages aloja archivos HTML, CSS y JavaScript de forma estática. Por eso esta rama pública no incluye servidor Python ni CP-SAT como runtime de usuario.

## Ejemplos acreditados para generar en navegador

- `P12_WEB_MINI` · ejemplo mínimo.
- `P12_ORG41_LIGHT` · organización ligera.
- `P12_WEB_MEDIUM` · centro medio sintético.

## Límites conocidos

No está acreditado todavía:

- Frián real completo en navegador;
- ciclos A/B complejos;
- multitramos;
- sedes y desplazamientos;
- desdobles y simultaneidades complejas;
- recursos complejos;
- recreos por zonas;
- paridad real ejecutada contra CP-SAT en Windows;
- beta, RC o release.

CP-SAT se conserva como **oráculo técnico externo de comparación**, no como dependencia de esta publicación web.

## Privacidad

No subas proyectos reales, horarios reales, capturas, exportaciones, logs ni evidencias de centro a este repositorio público. Los ejemplos incluidos deben permanecer inequívocamente sintéticos.

## Publicación en GitHub Pages

1. Sube el contenido de esta carpeta a la raíz del repositorio.
2. Comprueba que existen `index.html`, `.nojekyll`, `sw.js`, `manifest.webmanifest` y `STATIC_MANIFEST_SHA256.txt`.
3. En GitHub: `Settings → Pages → Deploy from a branch`.
4. Selecciona rama `main` y carpeta `/ (root)`.
5. Abre la URL de Pages y prueba: `Biblioteca de ejemplos → Ejemplo web P12-5 → Generar horario`.

## QA local antes de publicar

```bash
python scripts/verificar_manifest_publico.py .
python scripts/verificar_static_manifest.py .
python scripts/auditar_publicacion_web.py .
python scripts/verificar_sintaxis_js.py .
```

## Licencia

Código públicamente visible para evaluación, demostración y trazabilidad. No se concede permiso de reutilización, redistribución, despliegue ni creación de obras derivadas sin autorización previa del titular. Consulta `LICENSE`.
