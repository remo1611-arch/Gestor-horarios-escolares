#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, sys, zipfile
from pathlib import Path
TEXT_SUFFIXES={'.html','.mjs','.js','.css','.json','.md','.csv','.txt','.yml','.yaml','.webmanifest'}
FORBIDDEN_SUFFIXES={'.sqlite','.db','.log','.pyc','.pyo','.pem','.key','.p12','.pfx','.zip','.7z','.rar'}
FORBIDDEN_DIRS={'private','data-private','real-data','exports-real','backups','logs','resultados','exports','__pycache__'}
ALLOWED_GHF_PREFIX='data/'
PATTERNS=[
 ('clave privada', re.compile(r'-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----', re.I)),
 ('token GitHub clásico', re.compile(r'\bgh[opsu]_[A-Za-z0-9]{30,}\b')),
 ('token GitHub granular', re.compile(r'\bgithub_pat_[A-Za-z0-9_]{40,}\b')),
 ('token OpenAI', re.compile(r'\bsk-[A-Za-z0-9_-]{24,}\b')),
 ('dataNature REAL', re.compile(r'"dataNature"\s*:\s*"REAL"', re.I)),
 ('containsPersonalData true', re.compile(r'"containsPersonalData"\s*:\s*true', re.I)),
 ('ruta local absoluta', re.compile(r'(?:[A-Za-z]:\\|/home/|/Users/|/storage/emulated/|/data/data/|/sdcard/)', re.I)),
]
EMAIL=re.compile(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', re.I)
ALLOW_EMAILS={'noreply.github.com'}
SYNTHETIC=re.compile(r'sintet|synthet|fixture|demo|prueba|fictici|p12_web|centro web', re.I)

def scan_text(label: str, text: str, issues: list[str]) -> None:
    for desc,pat in PATTERNS:
        if pat.search(text): issues.append(f'{label}: patrón prohibido ({desc})')
    for mail in EMAIL.findall(text):
        if not any(mail.lower().endswith('@'+d) for d in ALLOW_EMAILS):
            issues.append(f'{label}: correo publicado ({mail})')

def audit_json(label: str, data: bytes, issues: list[str]) -> None:
    try: obj=json.loads(data.decode('utf-8'))
    except Exception as exc: issues.append(f'{label}: JSON inválido ({exc})'); return
    def walk(v, path='$'):
        if isinstance(v, dict):
            for k,x in v.items():
                p=f'{path}.{k}'; yield p,k,x; yield from walk(x,p)
        elif isinstance(v, list):
            for i,x in enumerate(v): yield from walk(x, f'{path}[{i}]')
    for path,key,value in walk(obj):
        if key == 'dataNature' and str(value).upper() not in {'SYNTHETIC','', 'NONE'}:
            issues.append(f'{label}{path}: dataNature público no sintético ({value})')
        if key == 'sourceStatus' and str(value).upper() not in {'SYNTHETIC','DRAFT','DERIVED_SYNTHETIC','', 'NONE'}:
            issues.append(f'{label}{path}: sourceStatus público no permitido ({value})')
        if key=='containsPersonalData' and value is True:
            issues.append(f'{label}{path}: contiene datos personales')
        if key in {'centro','centerName','localidad','locality','comunidadAutonoma','autonomousCommunity'}:
            if value not in (None,'') and not SYNTHETIC.search(str(value)):
                # Advertencia estricta solo para ficheros de datos, no para documentación técnica.
                if label.startswith('data/') or label.startswith('p12/corpus/'):
                    issues.append(f'{label}{path}: marcador sintético insuficiente ({value})')

def scan_zip(path: Path, rel: str, issues: list[str]) -> None:
    try:
        with zipfile.ZipFile(path) as z:
            bad=z.testzip()
            if bad: issues.append(f'{rel}: ZIP dañado en {bad}')
            for name in z.namelist():
                suffix=Path(name).suffix.lower()
                data=z.read(name)
                if suffix in TEXT_SUFFIXES:
                    txt=data.decode('utf-8','ignore')
                    scan_text(f'{rel}!{name}', txt, issues)
                    if suffix=='.json': audit_json(f'{rel}!{name}', data, issues)
    except Exception as exc:
        issues.append(f'{rel}: ZIP inválido ({exc})')

def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('root', nargs='?', default='.')
    args=ap.parse_args(); root=Path(args.root).resolve(); issues=[]; scanned=0
    for path in root.rglob('*'):
        if not path.is_file() or '.git' in path.parts: continue
        rel=path.relative_to(root).as_posix(); scanned+=1; parts=set(Path(rel).parts[:-1]); suffix=path.suffix.lower()
        if parts & FORBIDDEN_DIRS: issues.append(f'{rel}: directorio no publicable')
        if suffix in FORBIDDEN_SUFFIXES: issues.append(f'{rel}: tipo no autorizado')
        if suffix=='.ghfproject' and not rel.startswith(ALLOWED_GHF_PREFIX): issues.append(f'{rel}: .ghfproject fuera de data/')
        if suffix in TEXT_SUFFIXES or path.name in {'.gitignore','.nojekyll','LICENSE'}:
            data=path.read_bytes(); text=data.decode('utf-8','ignore'); scan_text(rel,text,issues)
            if suffix=='.json' and (rel.startswith('data/') or rel.startswith('p12/corpus/')): audit_json(rel,data,issues)
        elif suffix=='.ghfproject':
            scan_zip(path,rel,issues)
    issues=list(dict.fromkeys(issues))
    print(json.dumps({'ok': not issues, 'scannedFiles': scanned, 'issues': issues}, ensure_ascii=False, indent=2))
    return 0 if not issues else 1
if __name__=='__main__':
    raise SystemExit(main())
