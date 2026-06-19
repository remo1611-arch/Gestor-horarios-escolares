#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
LINE_RE = re.compile(r"^([0-9a-f]{64})\s+(.+)$")
EXCLUDE = {'MANIFEST_PUBLIC_SHA256.txt'}
EXCLUDE_DIRS = {'.git'}

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument('root', nargs='?', default='.')
    args=parser.parse_args()
    root=Path(args.root).resolve(); manifest=root/'MANIFEST_PUBLIC_SHA256.txt'
    issues=[]; entries={}
    if not manifest.is_file(): issues.append('MANIFEST_PUBLIC_SHA256.txt no existe')
    else:
        for number,line in enumerate(manifest.read_text(encoding='utf-8').splitlines(),1):
            if not line.strip(): continue
            m=LINE_RE.fullmatch(line.strip())
            if not m: issues.append(f'línea {number}: formato inválido'); continue
            exp,rel=m.groups(); rel=rel.strip(); p=Path(rel)
            if p.is_absolute() or '..' in p.parts or rel in EXCLUDE: issues.append(f'línea {number}: ruta no permitida {rel}'); continue
            if rel in entries: issues.append(f'línea {number}: ruta duplicada {rel}'); continue
            entries[rel]=exp
    actual={}
    for path in root.rglob('*'):
        if not path.is_file(): continue
        rel=path.relative_to(root).as_posix()
        if any(part in EXCLUDE_DIRS for part in Path(rel).parts): continue
        if rel in EXCLUDE: continue
        actual[rel]=path
    for rel,exp in sorted(entries.items()):
        if rel not in actual: issues.append(f'falta archivo inventariado: {rel}'); continue
        got=sha256(actual[rel])
        if got!=exp: issues.append(f'hash incorrecto: {rel}')
    for rel in sorted(set(actual)-set(entries)):
        issues.append(f'archivo no inventariado: {rel}')
    result={'ok': not issues, 'listed': len(entries), 'actual': len(actual), 'issues': issues}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1
if __name__=='__main__':
    raise SystemExit(main())
