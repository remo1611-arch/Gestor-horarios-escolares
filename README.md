# Gestor de Horarios Escolares

Aplicación para recopilar, validar, generar, reparar, documentar y exportar horarios escolares.

**Base funcional:** `0.6.3`

**Revisión de publicación:** `P6-0F.2`

**Estado:** candidata saneada para publicación en un repositorio público con datos exclusivamente sintéticos.

## Modos de trabajo

### `PUBLIC_DEMO`

- solo acepta datos declarados `SYNTHETIC`;
- está destinado a demostración y QA multidispositivo;
- no debe utilizarse con nombres, horarios, restricciones ni evidencias reales;
- la interfaz estática puede publicarse mediante GitHub Pages desde `index.html`;
- el servidor Python incluido no es un servidor de producción para Internet.

### `LOCAL_PRIVATE`

- se ejecuta en `127.0.0.1`;
- admite proyectos `REAL` almacenados localmente;
- es la modalidad prevista para los datos reales del centro;
- los trabajos se guardan fuera del repositorio o en `motor/jobs/`, ruta ignorada por Git.

## Arranque local privado

```bash
python servidor_ghf.py --mode local-private --host 127.0.0.1 --port 8993
```

Abra:

```text
http://127.0.0.1:8993/?v=0_6_3
```

## Demo pública de desarrollo

```bash
python servidor_ghf.py --mode public-demo --host 127.0.0.1 --port 8993
```

La interfaz estática puede servirse desde GitHub Pages, pero cualquier API pública requiere una implementación de producción separada. No despliegue directamente `http.server` en Internet.

## QA antes de publicar

```bash
python scripts/verificar_manifest.py .
python scripts/auditar_publicacion.py .
python scripts/verificar_sintaxis_python.py .
python scripts/verificar_sintaxis_javascript.py .
python qa/test_runtime_modes.py
python qa/test_release_public.py
```

Para comprobar nombres o referencias privadas sin incorporarlos al repositorio, cree fuera del proyecto un archivo con un término literal por línea y ejecute:

```bash
python scripts/auditar_publicacion.py . --denylist /ruta/privada/denylist.txt
```

La CI repite automáticamente el manifiesto, la auditoría semántica de publicación, la sintaxis, los modos, los dos fixtures `.ghfproject` y el caso sintético de 502 sesiones.

## Reglas de publicación

- no subir proyectos, plantillas, capturas, exportaciones, logs o evidencias reales;
- no incorporar `.env`, claves, tokens, bases de datos, ZIP ni archivos compilados;
- mantener `index.html` en la raíz;
- regenerar `MANIFEST_SHA256.txt` después de cualquier cambio público:

```bash
python scripts/generar_manifest.py .
python scripts/verificar_manifest.py .
```

Consulte `PUBLICACION_GITHUB.md`, `PRIVACY.md` y `SECURITY.md` antes del primer `push`.

## Dependencias

El flujo base utiliza la biblioteca estándar de Python. OR-Tools es opcional y no se instala ni se presupone automáticamente.

## Licencia

El código es públicamente visible, pero **no es software de código abierto**. La reutilización, redistribución o despliegue requiere autorización previa conforme a `LICENSE`.
