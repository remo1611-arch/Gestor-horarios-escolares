#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, sys
from pathlib import Path
LINE_RE = re.compile(r"^([0-9a-f]{64})\s+(.+)$")

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('root', nargs='?', default='.')
    args = p.parse_args()
    root = Path(args.root).resolve()
    manifest = root/'STATIC_MANIFEST_SHA256.txt'
    issues=[]; listed=0
    if not manifest.is_file():
        issues.append('STATIC_MANIFEST_SHA256.txt no existe')
    else:
        seen=set()
        for n,line in enumerate(manifest.read_text(encoding='utf-8').splitlines(),1):
            if not line.strip(): continue
            m=LINE_RE.fullmatch(line.strip())
            if not m:
                issues.append(f'línea {n}: formato inválido')
                continue
            exp, rel=m.groups(); rel=rel.strip()
            if rel in seen: issues.append(f'línea {n}: ruta duplicada {rel}')
            seen.add(rel); listed+=1
            path=root/rel
            if not path.is_file(): issues.append(f'falta archivo estático: {rel}'); continue
            got=sha256(path)
            if got!=exp: issues.append(f'hash incorrecto: {rel}')
    result={'ok': not issues, 'listed': listed, 'issues': issues}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1
if __name__ == '__main__':
    raise SystemExit(main())
