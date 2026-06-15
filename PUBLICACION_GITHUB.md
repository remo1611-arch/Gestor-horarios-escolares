# Publicación inicial en GitHub

## 1. Preparación local

Trabaje dentro de la carpeta extraída, de modo que `README.md`, `.github/` e `index.html` queden en la raíz del futuro repositorio.

Antes del primer commit, configure en GitHub una dirección de correo `noreply` y úsela en Git:

```bash
git config --global user.name "Remo José Pereira González"
git config --global user.email "SU_DIRECCION_NOREPLY_DE_GITHUB"
```

## 2. Verificación previa

```bash
python scripts/verificar_manifest.py .
python scripts/auditar_publicacion.py .
python scripts/verificar_sintaxis_python.py .
python scripts/verificar_sintaxis_javascript.py .
python qa/test_runtime_modes.py
python qa/test_release_public.py
```

Cuando exista una denylist privada externa:

```bash
python scripts/auditar_publicacion.py . --denylist /ruta/privada/denylist.txt
```

## 3. Preparar el commit público

```bash
git pull --ff-only origin main
git add .
git status --short
git commit -m "Publica Gestor de Horarios Escolares P6-0F.2"
```

Compruebe que los siguientes archivos aparecen versionados:

```text
contratos_ghfproject/MAPEO_P5_4_2_A_GHFPROJECT_1_0.csv
contratos_ghfproject/RESOLUCION_43_PENDIENTES_P6_0B.csv
plantillas/MAPEO_PLANTILLA_A_GHFPROJECT_1_0.csv
plantillas/PLANTILLA_RECOGIDA_DATOS_GHFPROJECT_1_0.xlsx
plantillas/EJEMPLO_SINTETICO_PLANTILLA_GHFPROJECT_1_0.xlsx
```

Y que no aparece ningún `__pycache__`, `.pyc`, ZIP, base de datos, log, exportación o proyecto real.

## 4. Publicar en el repositorio remoto

```bash
git push origin main
```

## 5. Comprobaciones en GitHub

- verificar que **Actions → QA pública** termina correctamente;
- activar el reporte privado de vulnerabilidades;
- proteger `main` cuando el flujo se estabilice;
- activar GitHub Pages desde `main` y `/ (root)`;
- comprobar que la URL de Pages abre `index.html`;
- no activar una API pública usando directamente `servidor_ghf.py`.

## 6. Releases

El código debe estar desplegado como archivos del repositorio. El ZIP puede adjuntarse posteriormente como activo de una release, pero no debe añadirse como archivo versionado dentro del propio repositorio.
