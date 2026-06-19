# Publicación P12-6 en GitHub Pages

## Dictamen de sustitución

La versión anterior del repositorio (`0.6.3`, `P6-0F.2`) tenía buenas prácticas de publicación —modo público sintético, privacidad, licencia, auditoría y CI—, pero queda funcionalmente superada por P12-6 para el objetivo actual: aplicación web estática con motor web y uso desde enlace sin Python ni OR-Tools.

## Qué se conserva de la versión anterior

- separación entre demo pública sintética y datos reales privados;
- licencia cerrada;
- política de privacidad;
- política de seguridad;
- `.gitignore` estricto;
- auditoría pública antes de publicar;
- GitHub Actions para QA.

## Qué no se arrastra

- arquitectura P6 con servidor Python local como eje;
- `browser-private.html` antiguo, porque no tenía motor, XLSX ni persistencia y puede confundir con la app P12;
- evidencias, QA y contratos antiguos no necesarios para la publicación estática;
- ZIP, logs, bases de datos o proyectos reales.

## Comprobación local

```bash
python scripts/verificar_manifest_publico.py .
python scripts/verificar_static_manifest.py .
python scripts/auditar_publicacion_web.py .
python scripts/verificar_sintaxis_js.py .
```

## Activar GitHub Pages

En el repositorio:

1. `Settings → Pages`.
2. `Build and deployment → Source → Deploy from a branch`.
3. Rama `main`.
4. Carpeta `/ (root)`.
5. Guardar.
6. Abrir la URL publicada y probar `Ejemplo web P12-5 → Generar horario`.

## Regla de privacidad

No subas datos reales de Frián ni de ningún centro al repositorio público. La publicación solo debe contener ejemplos sintéticos.
