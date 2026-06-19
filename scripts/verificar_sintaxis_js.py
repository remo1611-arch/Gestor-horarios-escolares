#!/usr/bin/env python3
from __future__ import annotations
import json, shutil, subprocess, sys
from pathlib import Path

def main() -> int:
    node=shutil.which('node')
    issues=[]; checked=0
    if not node:
        issues.append('node no está disponible')
    else:
        for path in sorted(Path('.').rglob('*')):
            if not path.is_file() or '.git' in path.parts: continue
            if path.suffix.lower() not in {'.js','.mjs'}: continue
            checked+=1
            proc=subprocess.run([node,'--check',str(path)], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode!=0:
                issues.append(f'{path.as_posix()}: {proc.stderr.strip() or proc.stdout.strip()}')
    print(json.dumps({'ok': not issues, 'checked': checked, 'issues': issues}, ensure_ascii=False, indent=2))
    return 0 if not issues else 1
if __name__=='__main__':
    raise SystemExit(main())
