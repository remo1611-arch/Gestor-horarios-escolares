# Probar P6-0F.2 en Termux · modo local privado

```bash
cd "$HOME/storage/downloads"

ZIP="$(find . -maxdepth 1 -type f -iname 'Gestor_Horarios_Escolares_P6_0F_2_SANEAMIENTO_PUBLICO_v0_6_3*.zip' -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)"
test -n "$ZIP" -a -f "$ZIP" || { echo "ERROR: no se encontró P6-0F.2"; exit 1; }

sha256sum "$ZIP"
unzip -t "$ZIP"

DEST="$HOME/Gestor_Horarios_Escolares_P6_0F_2"
rm -rf "$DEST" && mkdir -p "$DEST"
unzip -q "$ZIP" -d "$DEST"

APPDIR="$(find "$DEST" -type f -name servidor_ghf.py -printf '%h\n' | head -n 1)"
test -n "$APPDIR" -a -d "$APPDIR" || { echo "ERROR: no se encontró la aplicación"; exit 1; }
cd "$APPDIR"

python scripts/verificar_manifest.py .
python scripts/auditar_publicacion.py .
python scripts/verificar_sintaxis_python.py .
python scripts/verificar_sintaxis_javascript.py .
python qa/test_runtime_modes.py
python qa/test_release_public.py

PORT=8993
pkill -f "servidor_ghf.py.*--port $PORT" 2>/dev/null || true
nohup python servidor_ghf.py --mode local-private --host 127.0.0.1 --port "$PORT" >"$DEST/servidor.log" 2>&1 &
echo $! >"$DEST/servidor.pid"
sleep 2

python - <<'PY2'
import json
import urllib.request
print(json.dumps(json.load(urllib.request.urlopen('http://127.0.0.1:8993/api/runtime-config', timeout=8)), indent=2))
PY2

termux-open-url "http://127.0.0.1:${PORT}/?v=p6_0f_2_$(date +%s)"
```

El bloque anterior ejecuta también el caso sintético completo de 502 sesiones.
