# Comandos de publicación P12-6

## Opción segura con copia de seguridad de la rama actual

PowerShell desde Windows:

```powershell
$repoUrl = "https://github.com/remo1611-arch/Gestor-horarios-escolares.git"
$work = "$env:USERPROFILE\Desktop\Gestor-horarios-escolares-p12-publicacion"
$src = "$env:USERPROFILE\Downloads\Gestor_Horarios_Escolares_PUBLICACION_GITHUB_P12_6_REPO_SANEADO"

Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
git clone $repoUrl $work
cd $work

# Copia de seguridad remota de lo que hay ahora
git checkout -b backup-p6-antes-p12-6
git push origin backup-p6-antes-p12-6

git checkout main

# Vaciar raíz conservando .git
Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

# Copiar nueva publicación
Copy-Item -Recurse -Force "$src\*" .
Copy-Item -Force "$src\.nojekyll" .
Copy-Item -Force "$src\.gitignore" .

python scriptserificar_manifest_publico.py .
python scriptserificar_static_manifest.py .
python scriptsuditar_publicacion_web.py .
python scriptserificar_sintaxis_js.py .

git add -A
git status --short
git commit -m "Publica Gestor de Horarios Escolares P12-6 web"
git push origin main
```

Después activa o revisa GitHub Pages: `Settings → Pages → Deploy from a branch → main / root`.
